import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fastifyPlugin from 'fastify-plugin';

/**
 * App registration definition
 */
export interface AppRegistration {
  /**
   * Unique app name
   */
  name: string;

  /**
   * Fastify plugin for the app
   */
  plugin: FastifyPluginAsync<Record<string, unknown>>;

  /**
   * Plugin options
   */
  options?: {
    /**
     * Route prefix for app routes
     */
    prefix?: string;

    /**
     * Database URL for app-specific Prisma client
     */
    databaseUrl?: string;

    /**
     * Whether to wrap the plugin with fastify-plugin (default: true)
     * Set to false if you want to maintain encapsulation
     */
    useFastifyPlugin?: boolean;

    /**
     * Any additional options passed to the plugin
     */
    [key: string]: unknown;
  };

  /**
   * App metadata
   */
  metadata?: {
    /**
     * App version
     */
    version?: string;

    /**
     * App description
     */
    description?: string;

    /**
     * Apps this depends on (load order)
     */
    dependencies?: string[];

    /**
     * Tags for categorization
     */
    tags?: string[];
  };
}

/**
 * Registered app with status tracking
 */
export interface RegisteredApp extends AppRegistration {
  /**
   * Current status of the app
   */
  status: 'pending' | 'loading' | 'loaded' | 'failed';

  /**
   * Error if app failed to load
   */
  error?: Error;

  /**
   * Timestamp when app was loaded
   */
  loadedAt?: Date;
}

/**
 * App Registry - Manages app lifecycle and registration
 */
export class AppRegistry {
  private apps: Map<string, RegisteredApp> = new Map();
  private loadedAppsWithConfig: Array<{ name: string; options: Record<string, unknown> }> = [];
  private fastify: FastifyInstance;
  private basePath: string;

  /**
   * @param fastify - Fastify instance
   * @param basePath - Base path for resolving app directories (defaults to process.cwd())
   */
  constructor(fastify: FastifyInstance, basePath?: string) {
    this.fastify = fastify;
    this.basePath = basePath || process.cwd();

    this.fastify.log.info(
      { basePath: this.basePath },
      `App Registry initialized with base path: ${this.basePath}`,
    );
  }

  /**
   * Log app loading failure to both console and file
   */
  private logAppLoadFailure(context: {
    appName: string;
    error: Error;
    phase: 'plugin-load' | 'config-load' | 'validation' | 'registration';
    attemptedPath?: string;
    suggestions?: string[];
  }): void {
    const timestamp = new Date().toISOString();
    const errorDetails = {
      timestamp,
      appName: context.appName,
      phase: context.phase,
      error: {
        message: context.error.message,
        type: context.error.name,
        stack: context.error.stack,
        code: (context.error as { code?: string }).code,
      },
      paths: {
        basePath: this.basePath,
        attemptedPath: context.attemptedPath,
        cwd: process.cwd(),
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        env: process.env.NODE_ENV || 'development',
      },
      suggestions: context.suggestions || [],
    };

    // Log to Fastify logger (console)
    this.fastify.log.error(errorDetails, `Failed to load app: ${context.appName}`);

    // Write to dedicated log file
    try {
      const logDir = resolve(this.basePath, 'logs');
      const logFile = resolve(logDir, 'apps-load-failure.log');

      // Ensure logs directory exists
      if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true });
      }

      // Append to log file (JSON Lines format)
      const logEntry = `${JSON.stringify(errorDetails)}\n`;
      writeFileSync(logFile, logEntry, { flag: 'a' });

      this.fastify.log.debug({ logFile }, `App load failure logged to: ${logFile}`);
    } catch (logError) {
      this.fastify.log.warn(
        { error: (logError as Error).message },
        'Failed to write to apps-load-failure.log',
      );
    }
  }

  /**
   * Register an app plugin to be loaded
   */
  async register(registration: AppRegistration): Promise<void> {
    // Validate registration input
    if (!registration) {
      throw new Error('Registration cannot be null or undefined');
    }

    if (!registration.name || typeof registration.name !== 'string') {
      throw new Error('App registration must have a valid name (non-empty string)');
    }

    if (!registration.plugin || typeof registration.plugin !== 'function') {
      throw new Error(
        `App registration for "${registration.name}" must have a valid plugin function`,
      );
    }

    // Check for duplicate before any mutation
    if (this.apps.has(registration.name)) {
      this.fastify.log.warn(
        { appName: registration.name },
        `Attempted to register duplicate app: ${registration.name}`,
      );
      throw new Error(`App already registered: ${registration.name}`);
    }

    const registered: RegisteredApp = {
      ...registration,
      status: 'pending',
    };

    this.apps.set(registration.name, registered);

    // Immediately load the app
    try {
      await this.loadApp(registered);
    } catch (error) {
      // Remove from registry if load fails
      this.apps.delete(registration.name);
      throw error;
    }
  }

  /**
   * Bulk register multiple apps
   */
  async registerAll(registrations: AppRegistration[]): Promise<void> {
    // Validate input
    if (!Array.isArray(registrations)) {
      throw new Error('registerAll requires an array of registrations');
    }

    if (registrations.length === 0) {
      this.fastify.log.info('No apps to register');
      return;
    }

    this.fastify.log.info(
      { count: registrations.length },
      `Registering ${registrations.length} apps`,
    );

    // Sort by dependencies if provided
    const sorted = this.sortByDependencies(registrations);

    let successCount = 0;
    let failureCount = 0;

    for (const reg of sorted) {
      try {
        await this.register(reg);
        successCount++;
      } catch (error) {
        failureCount++;
        this.fastify.log.error(
          {
            appName: reg?.name || 'unknown',
            error: (error as Error).message,
            stack: (error as Error).stack,
          },
          `Failed to register app: ${reg?.name || 'unknown'}`,
        );
        // Continue with other apps if one fails
      }
    }

    this.fastify.log.info(
      {
        total: registrations.length,
        success: successCount,
        failed: failureCount,
      },
      `Completed app registration: ${successCount} succeeded, ${failureCount} failed`,
    );
  }

  /**
   * Load apps from raw config array (dynamically imports plugins and configs)
   * @param appConfigs - Array of app configurations from mta-prisma.config.json
   * @param databaseUrl - Default database URL (can be overridden per-app via env vars)
   * @returns Chainable object with loadAppStaticAssets() method
   */
  async loadApps(
    appConfigs: Array<{
      name: string;
      enabled?: boolean;
      dependencies?: string[];
      [key: string]: unknown;
    }>,
    databaseUrl?: string,
  ): Promise<{ loadAppStaticAssets: () => Promise<void> }> {
    const apps: string[] = [];

    for (const appConfig of appConfigs) {
      // Validate app config structure
      if (!appConfig.name || typeof appConfig.name !== 'string') {
        this.fastify.log.error({ appConfig }, 'Invalid app configuration: missing or invalid name');
        continue;
      }

      if (appConfig.enabled === false) {
        this.fastify.log.info(`Skipping disabled app: ${appConfig.name}`);
        continue;
      }

      const startTime = Date.now();

      try {
        this.fastify.log.info({ appName: appConfig.name }, `Loading app: ${appConfig.name}`);

        // Try to load backend and frontend plugins (at least one must exist)
        const backendPluginPath = resolve(
          this.basePath,
          `apps/${appConfig.name}/backend/dist/backend.plugin.js`,
        );
        const frontendPluginPath = resolve(
          this.basePath,
          `apps/${appConfig.name}/backend/dist/frontend.plugin.js`,
        );

        const backendExists = existsSync(backendPluginPath);
        const frontendExists = existsSync(frontendPluginPath);

        // Validate that at least one plugin exists
        if (!backendExists && !frontendExists) {
          const error = new Error(
            `No plugins found for app '${appConfig.name}'\n\n` +
              `At least one plugin (backend.plugin.js or frontend.plugin.js) must exist.\n\n` +
              `Possible fixes:\n` +
              `1. Build the app: cd apps/${appConfig.name}/backend && npm run build\n` +
              `2. Build all apps: npm run build (from root)\n` +
              `3. Verify app name '${appConfig.name}' in mta-prisma.config.json\n\n` +
              `Base path: ${this.basePath}\n` +
              `Checked paths:\n` +
              `  - ${backendPluginPath}\n` +
              `  - ${frontendPluginPath}`,
          );

          this.logAppLoadFailure({
            appName: appConfig.name,
            error,
            phase: 'plugin-load',
            attemptedPath: backendPluginPath,
            suggestions: [
              `cd apps/${appConfig.name}/backend && npm run build`,
              `npm run build`,
              `Check app name in mta-prisma.config.json`,
            ],
          });

          throw error;
        }

        // Load backend plugin if it exists
        let backendPlugin = null;
        if (backendExists) {
          const backendModule = await import(backendPluginPath);
          backendPlugin = backendModule.default;

          if (typeof backendPlugin !== 'function') {
            const error = new Error(
              `Invalid backend plugin export for app '${
                appConfig.name
              }': expected a function, got ${typeof backendPlugin}\n\n` +
                `The plugin file must export a default Fastify plugin function.\n` +
                `Expected: export default async (fastify: FastifyInstance) => { ... }`,
            );

            this.logAppLoadFailure({
              appName: appConfig.name,
              error,
              phase: 'validation',
              attemptedPath: backendPluginPath,
              suggestions: [
                'Ensure backend.plugin.ts exports a default async function',
                'Check backend.plugin.ts structure matches Fastify plugin format',
              ],
            });

            throw error;
          }
          this.fastify.log.info(
            { appName: appConfig.name },
            `✓ Loaded backend plugin for: ${appConfig.name}`,
          );
        }

        // Load frontend plugin if it exists
        let frontendPlugin = null;
        if (frontendExists) {
          const frontendModule = await import(frontendPluginPath);
          frontendPlugin = frontendModule.default;

          if (typeof frontendPlugin !== 'function') {
            const error = new Error(
              `Invalid frontend plugin export for app '${
                appConfig.name
              }': expected a function, got ${typeof frontendPlugin}\n\n` +
                `The plugin file must export a default Fastify plugin function.\n` +
                `Expected: export default async (fastify: FastifyInstance) => { ... }`,
            );

            this.logAppLoadFailure({
              appName: appConfig.name,
              error,
              phase: 'validation',
              attemptedPath: frontendPluginPath,
              suggestions: [
                'Ensure frontend.plugin.ts exports a default async function',
                'Check frontend.plugin.ts structure matches Fastify plugin format',
              ],
            });

            throw error;
          }
          this.fastify.log.info(
            { appName: appConfig.name },
            `✓ Loaded frontend plugin for: ${appConfig.name}`,
          );
        }

        // Create a combined plugin if both backend and frontend exist
        // Pass appropriate prefix to each plugin type
        const plugin =
          backendPlugin && frontendPlugin
            ? async (fastify: FastifyInstance, opts: Record<string, unknown>) => {
                // Register backend plugin with backendPrefix
                await backendPlugin(fastify, opts);
                // Register frontend plugin with frontendPrefix
                await frontendPlugin(fastify, opts);
              }
            : backendPlugin || frontendPlugin;

        // Dynamic import of app config from src/config
        const configPath = resolve(this.basePath, `apps/${appConfig.name}/backend/dist/config.js`);
        let appSpecificConfig: Record<string, unknown> = {};
        try {
          const configModule = await import(configPath);
          // Get the first exported config (e.g., authConfig, billingConfig)
          const configKey = Object.keys(configModule).find((key) => key.endsWith('Config'));
          if (configKey) {
            appSpecificConfig = configModule[configKey];
            this.fastify.log.info(
              {
                appName: appConfig.name,
                backendPrefix: appSpecificConfig.backendPrefix,
                frontendPrefix: appSpecificConfig.frontendPrefix,
                useFastifyPlugin: appSpecificConfig.useFastifyPlugin,
              },
              `✓ Loaded config for app: ${appConfig.name}`,
            );
          }
        } catch (configError) {
          this.fastify.log.warn(
            {
              appName: appConfig.name,
              error: (configError as Error).message,
            },
            `No config found for app: ${appConfig.name}, using defaults`,
          );
        }

        // Determine database URL for this app (priority: app-specific > default)
        const appDatabaseUrl =
          process.env[`${appConfig.name.toUpperCase()}_DATABASE_URL`] || databaseUrl;

        // Merge app-specific config with database URL
        const options: Record<string, unknown> & { databaseUrl: string | undefined } = {
          ...appSpecificConfig,
          databaseUrl: appDatabaseUrl,
        };

        // Register app with app registry
        await this.register({
          name: appConfig.name,
          plugin,
          options,
          metadata: appSpecificConfig.metadata || {
            version: '1.0.0',
            dependencies: appConfig.dependencies || [],
          },
        });

        const loadTime = Date.now() - startTime;
        this.fastify.log.info(
          {
            appName: appConfig.name,
            loadTimeMs: loadTime,
            backendPrefix: options.backendPrefix,
            frontendPrefix: options.frontendPrefix,
            databaseConfigured: !!appDatabaseUrl,
          },
          `✓ Registered app: ${appConfig.name} (${loadTime}ms)`,
        );
        apps.push(appConfig.name);

        // Store loaded app with its config for later static asset registration
        this.loadedAppsWithConfig.push({
          name: appConfig.name,
          options: options,
        });
      } catch (error) {
        const loadTime = Date.now() - startTime;

        // Log error if it hasn't been logged already
        // (some errors are logged in specific catch blocks above)
        const err = error as Error;
        const alreadyLogged =
          err.message.includes('Plugin file not found') ||
          err.message.includes('Invalid plugin export');

        if (!alreadyLogged) {
          this.logAppLoadFailure({
            appName: appConfig.name,
            error: err,
            phase: 'registration',
            suggestions: [
              'Check error stack trace above for details',
              'Verify all dependencies are installed',
              'Ensure database is accessible (if using Prisma)',
            ],
          });
        }

        this.fastify.log.error(
          {
            appName: appConfig.name,
            error: err.message,
            loadTimeMs: loadTime,
          },
          `Failed to load app: ${appConfig.name} (${loadTime}ms)`,
        );

        // Continue loading other apps
      }
    }

    // Register explicit routes for each loaded app
    // Status routes are at /sys/status/apps/* to avoid conflict with frontend routes
    for (const appName of apps) {
      const app = this.apps.get(appName);
      if (app && app.status === 'loaded') {
        this.fastify.get(`/sys/status/apps/${appName}`, async () => {
          return {
            name: app.name,
            status: app.status,
            backendPrefix: app.options?.backendPrefix,
            frontendPrefix: app.options?.frontendPrefix,
            version: app.metadata?.version,
            description: app.metadata?.description,
            loadedAt: app.loadedAt,
          };
        });
        this.fastify.log.info(
          { appName },
          `✓ Registered explicit route: GET /sys/status/apps/${appName}`,
        );
      }
    }

    // Return object with loadAppStaticAssets() method
    //const self = this;
    const result = {
      loadAppStaticAssets: async () => {
        // await self.loadAppStaticAssets();
      },
    };
    return result;
  }

  /**
   * Load an app plugin into Fastify
   */
  private async loadApp(app: RegisteredApp): Promise<void> {
    const startTime = Date.now();
    app.status = 'loading';

    try {
      this.fastify.log.info(
        {
          appName: app.name,
          prefix: app.options?.prefix,
          useFastifyPlugin: app.options?.useFastifyPlugin !== false,
        },
        `Loading app: ${app.name}`,
      );

      // Determine if we should use fastify-plugin (default: true)
      const useFastifyPlugin = app.options?.useFastifyPlugin !== false;

      // Extract options to pass to the plugin (excluding useFastifyPlugin)
      const { useFastifyPlugin: _, ...pluginOptions } = app.options || {};

      // Add app name for logging/debugging
      const finalOptions = {
        ...pluginOptions,
        appName: app.name,
      };

      // Conditionally wrap plugin with fastify-plugin
      const pluginToRegister = useFastifyPlugin
        ? fastifyPlugin(app.plugin as FastifyPluginAsync, {
            name: `${app.name}-plugin`,
            fastify: '5.x',
          })
        : app.plugin;

      // Register plugin with Fastify
      await this.fastify.register(pluginToRegister as FastifyPluginAsync, finalOptions);

      app.status = 'loaded';
      app.loadedAt = new Date();

      const loadTime = Date.now() - startTime;

      this.fastify.log.info(
        {
          appName: app.name,
          loadTimeMs: loadTime,
          prefix: app.options?.prefix,
          version: app.metadata?.version,
        },
        `✓ Loaded app: ${app.name} (${loadTime}ms)`,
      );
    } catch (error) {
      const loadTime = Date.now() - startTime;
      app.status = 'failed';
      app.error = error as Error;

      this.fastify.log.error(
        {
          appName: app.name,
          error: (error as Error).message,
          stack: (error as Error).stack,
          loadTimeMs: loadTime,
          prefix: app.options?.prefix,
        },
        `✗ Failed to load app: ${app.name}`,
      );

      throw error;
    }
  }

  /**
   * Sort apps by dependencies (topological sort)
   */
  private sortByDependencies(registrations: AppRegistration[]): AppRegistration[] {
    // Validate input
    if (!registrations || registrations.length === 0) {
      return [];
    }

    const sorted: AppRegistration[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const dependencyPath: string[] = [];

    const visit = (reg: AppRegistration) => {
      // Validate registration has a name
      if (!reg?.name) {
        this.fastify.log.warn(
          { registration: reg },
          'Skipping app with missing name during dependency sort',
        );
        return;
      }

      if (visited.has(reg.name)) return;

      if (visiting.has(reg.name)) {
        const cyclePath = [...dependencyPath, reg.name].join(' -> ');
        this.fastify.log.error({ cyclePath }, `Circular dependency detected: ${cyclePath}`);
        throw new Error(`Circular dependency detected: ${cyclePath}`);
      }

      visiting.add(reg.name);
      dependencyPath.push(reg.name);

      // Visit dependencies first
      if (reg.metadata?.dependencies) {
        // Validate dependencies is an array
        if (!Array.isArray(reg.metadata.dependencies)) {
          this.fastify.log.warn(
            {
              appName: reg.name,
              dependencies: reg.metadata.dependencies,
            },
            `App "${reg.name}" has invalid dependencies (expected array)`,
          );
        } else {
          for (const depName of reg.metadata.dependencies) {
            // Validate dependency name
            if (typeof depName !== 'string' || !depName) {
              this.fastify.log.warn(
                {
                  appName: reg.name,
                  invalidDependency: depName,
                },
                `App "${reg.name}" has invalid dependency name`,
              );
              continue;
            }

            const dep = registrations.find((r) => r.name === depName);
            if (dep) {
              visit(dep);
            } else {
              this.fastify.log.warn(
                {
                  appName: reg.name,
                  missingDependency: depName,
                },
                `App "${reg.name}" depends on unknown app: ${depName}`,
              );
            }
          }
        }
      }

      dependencyPath.pop();
      visiting.delete(reg.name);
      visited.add(reg.name);
      sorted.push(reg);
    };

    for (const reg of registrations) {
      try {
        visit(reg);
      } catch (error) {
        // Log but continue with other apps
        this.fastify.log.error(
          {
            appName: reg?.name || 'unknown',
            error: (error as Error).message,
          },
          `Failed to process dependencies for app: ${reg?.name || 'unknown'}`,
        );
      }
    }

    return sorted;
  }

  /**
   * Get app by name
   */
  get(name: string): RegisteredApp | undefined {
    return this.apps.get(name);
  }

  /**
   * List all registered apps
   */
  list(): RegisteredApp[] {
    return Array.from(this.apps.values());
  }

  /**
   * Check if app is loaded
   */
  isLoaded(name: string): boolean {
    return this.apps.get(name)?.status === 'loaded';
  }

  /**
   * Get loaded apps count
   */
  getLoadedCount(): number {
    return this.list().filter((app) => app.status === 'loaded').length;
  }

  /**
   * Get failed apps count
   */
  getFailedCount(): number {
    return this.list().filter((app) => app.status === 'failed').length;
  }
}
