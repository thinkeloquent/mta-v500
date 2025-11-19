import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { glob } from 'glob';
import type { AppConfig, ConfigValidationResult, MtaPrismaConfig } from '../types/config.js';

const DEFAULT_CONFIG_NAME = 'mta-prisma.config.json';

/**
 * Load configuration from file or auto-discover apps
 */
export async function loadConfig(configPath?: string): Promise<MtaPrismaConfig> {
  const resolvedPath = configPath || DEFAULT_CONFIG_NAME;

  try {
    // Try to load from file
    await access(resolvedPath);
    const content = await readFile(resolvedPath, 'utf-8');
    const config = JSON.parse(content) as MtaPrismaConfig;
    return config;
  } catch {
    // If config doesn't exist, try auto-discovery
    console.log('No config file found, attempting auto-discovery...');
    return await autoDiscoverApps();
  }
}

/**
 * Auto-discover apps from workspace by finding schema.prisma files
 */
async function autoDiscoverApps(): Promise<MtaPrismaConfig> {
  const schemaFiles = await glob('apps/*/prisma/schema.prisma');

  if (schemaFiles.length === 0) {
    throw new Error('No Prisma schemas found in apps/*/ directories');
  }

  const apps: AppConfig[] = schemaFiles.map((schemaPath) => {
    const appName = schemaPath.split('/')[1]; // Extract app name from path
    return {
      name: appName,
      schemaPath,
      outputName: `client-${appName}`,
      enabled: true,
    };
  });

  return {
    apps,
    strategy: 'orchestrated',
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: MtaPrismaConfig): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate apps array
  if (!config.apps || config.apps.length === 0) {
    errors.push('Configuration must include at least one app');
  }

  // Validate each app
  const appNames = new Set<string>();
  const outputNames = new Set<string>();

  for (const app of config.apps || []) {
    // Check required fields
    if (!app.name) {
      errors.push('App configuration missing "name" field');
    }
    if (!app.schemaPath) {
      errors.push(`App "${app.name}" missing "schemaPath" field`);
    }
    if (!app.outputName) {
      errors.push(`App "${app.name}" missing "outputName" field`);
    }

    // Check for duplicates
    if (appNames.has(app.name)) {
      errors.push(`Duplicate app name: ${app.name}`);
    }
    appNames.add(app.name);

    if (outputNames.has(app.outputName)) {
      errors.push(`Duplicate output name: ${app.outputName} (apps: ${app.name})`);
    }
    outputNames.add(app.outputName);

    // Validate dependencies
    if (app.dependencies) {
      for (const dep of app.dependencies) {
        if (!config.apps.find((a) => a.name === dep)) {
          errors.push(`App "${app.name}" depends on unknown app: ${dep}`);
        }
      }
    }
  }

  // Validate strategy
  if (!['orchestrated', 'merged'].includes(config.strategy)) {
    errors.push(`Invalid strategy: ${config.strategy}. Must be "orchestrated" or "merged"`);
  }

  // Check for merged schema path if using merged strategy
  if (config.strategy === 'merged' && !config.mergedSchemaPath) {
    warnings.push(
      'Using "merged" strategy but no "mergedSchemaPath" specified. Using default: prisma/merged.schema.prisma',
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get apps in dependency order (topological sort)
 */
export function getAppsInOrder(config: MtaPrismaConfig): AppConfig[] {
  const apps = config.apps.filter((app) => app.enabled !== false);
  const sorted: AppConfig[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(app: AppConfig): void {
    if (visited.has(app.name)) return;

    if (visiting.has(app.name)) {
      throw new Error(`Circular dependency detected involving app: ${app.name}`);
    }

    visiting.add(app.name);

    // Visit dependencies first
    if (app.dependencies) {
      for (const depName of app.dependencies) {
        const dep = apps.find((a) => a.name === depName);
        if (dep) {
          visit(dep);
        }
      }
    }

    visiting.delete(app.name);
    visited.add(app.name);
    sorted.push(app);
  }

  for (const app of apps) {
    visit(app);
  }

  return sorted;
}

/**
 * Get app by name
 */
export function getApp(config: MtaPrismaConfig, name: string): AppConfig | undefined {
  return config.apps.find((app) => app.name === name);
}

/**
 * Resolve paths relative to project root
 */
export function resolvePath(path: string, root: string = process.cwd()): string {
  return resolve(root, path);
}
