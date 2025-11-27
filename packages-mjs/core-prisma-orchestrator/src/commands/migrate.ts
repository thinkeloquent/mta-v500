import { getApp, getAppsInOrder } from '../lib/config.js';
import { executePrisma, executePrismaSequential } from '../lib/executor.js';
import { logger } from '../lib/logger.js';
import type { AppConfig, MtaPrismaConfig } from '../types/config.js';

export interface MigrateOptions {
  app?: string;
  name?: string;
  createOnly?: boolean;
  skipGenerate?: boolean;
}

/**
 * Create and apply development migrations
 */
export async function migrateDevCommand(
  config: MtaPrismaConfig,
  options: MigrateOptions = {},
): Promise<void> {
  logger.header('Running Development Migrations');

  // Get apps to migrate
  let apps: AppConfig[];

  if (options.app) {
    const app = getApp(config, options.app);
    if (!app) {
      logger.error(`App not found: ${options.app}`);
      process.exit(1);
    }
    apps = [app];
  } else {
    apps = getAppsInOrder(config);
    logger.info(`Migrating ${apps.length} apps in dependency order`);
  }

  const args = [];
  if (options.name) args.push('--name', options.name);
  if (options.createOnly) args.push('--create-only');
  if (options.skipGenerate) args.push('--skip-generate');

  // Run migrations sequentially to respect dependencies
  const results = await executePrismaSequential(apps, 'migrate dev', args);

  // Show results
  let successCount = 0;
  for (const [, result] of results.entries()) {
    if (result.success) {
      successCount++;
    }
  }

  console.log();
  if (successCount === apps.length) {
    logger.success(`All ${successCount} apps migrated successfully`);
  } else {
    logger.error(`Migration failed. ${successCount}/${apps.length} apps successful`);
    process.exit(1);
  }
}

/**
 * Deploy migrations to production
 */
export async function migrateDeployCommand(
  config: MtaPrismaConfig,
  options: { app?: string } = {},
): Promise<void> {
  logger.header('Deploying Migrations (Production)');

  // Get apps to migrate
  let apps: AppConfig[];

  if (options.app) {
    const app = getApp(config, options.app);
    if (!app) {
      logger.error(`App not found: ${options.app}`);
      process.exit(1);
    }
    apps = [app];
  } else {
    apps = getAppsInOrder(config);
    logger.info(`Deploying migrations for ${apps.length} apps`);
  }

  // Deploy migrations sequentially
  const results = await executePrismaSequential(apps, 'migrate deploy');

  // Show results
  let successCount = 0;
  for (const [, result] of results.entries()) {
    if (result.success) {
      successCount++;
    }
  }

  console.log();
  if (successCount === apps.length) {
    logger.success(`All ${successCount} apps deployed successfully`);
  } else {
    logger.error(`Deployment failed. ${successCount}/${apps.length} apps successful`);
    process.exit(1);
  }
}

/**
 * Show migration status
 */
export async function migrateStatusCommand(
  config: MtaPrismaConfig,
  options: { app?: string } = {},
): Promise<void> {
  logger.header('Migration Status');

  // Get apps
  let apps: AppConfig[];

  if (options.app) {
    const app = getApp(config, options.app);
    if (!app) {
      logger.error(`App not found: ${options.app}`);
      process.exit(1);
    }
    apps = [app];
  } else {
    apps = getAppsInOrder(config);
  }

  for (const app of apps) {
    logger.section(app.name);
    await executePrisma(app, 'migrate status', [], { silent: false });
  }
}

/**
 * Reset database and migrations
 */
export async function migrateResetCommand(
  config: MtaPrismaConfig,
  options: { app?: string; force?: boolean } = {},
): Promise<void> {
  logger.header('Reset Migrations');

  if (!options.force) {
    logger.warn('This will delete all data and reset migrations');
    logger.warn('Use --force to confirm');
    process.exit(1);
  }

  // Get apps
  let apps: AppConfig[];

  if (options.app) {
    const app = getApp(config, options.app);
    if (!app) {
      logger.error(`App not found: ${options.app}`);
      process.exit(1);
    }
    apps = [app];
  } else {
    apps = getAppsInOrder(config);
  }

  await executePrismaSequential(apps, 'migrate reset', ['--force']);

  console.log();
  logger.success('Reset complete');
}
