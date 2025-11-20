import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
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
export declare class AppRegistry {
    private apps;
    private loadedAppsWithConfig;
    private fastify;
    private basePath;
    /**
     * @param fastify - Fastify instance
     * @param basePath - Base path for resolving app directories (defaults to process.cwd())
     */
    constructor(fastify: FastifyInstance, basePath?: string);
    /**
     * Log app loading failure to both console and file
     */
    private logAppLoadFailure;
    /**
     * Register an app plugin to be loaded
     */
    register(registration: AppRegistration): Promise<void>;
    /**
     * Bulk register multiple apps
     */
    registerAll(registrations: AppRegistration[]): Promise<void>;
    /**
     * Load apps from raw config array (dynamically imports plugins and configs)
     * @param appConfigs - Array of app configurations from mta-prisma.config.json
     * @param databaseUrl - Default database URL (can be overridden per-app via env vars)
     * @returns Chainable object with loadAppStaticAssets() method
     */
    loadApps(appConfigs: Array<{
        name: string;
        enabled?: boolean;
        dependencies?: string[];
        [key: string]: unknown;
    }>, databaseUrl?: string): Promise<{
        loadAppStaticAssets: () => Promise<void>;
    }>;
    /**
     * Load an app plugin into Fastify
     */
    private loadApp;
    /**
     * Sort apps by dependencies (topological sort)
     */
    private sortByDependencies;
    /**
     * Get app by name
     */
    get(name: string): RegisteredApp | undefined;
    /**
     * List all registered apps
     */
    list(): RegisteredApp[];
    /**
     * Check if app is loaded
     */
    isLoaded(name: string): boolean;
    /**
     * Get loaded apps count
     */
    getLoadedCount(): number;
    /**
     * Get failed apps count
     */
    getFailedCount(): number;
}
//# sourceMappingURL=app-registry.d.ts.map