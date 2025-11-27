import { getApp, getAppsInOrder } from '../lib/config.js';
import { executePrisma } from '../lib/executor.js';
import { logger } from '../lib/logger.js';
import type { AppConfig, MtaPrismaConfig } from '../types/config.js';

/**
 * Show diff between schema and database
 */
export async function migrateDiffCommand(
  config: MtaPrismaConfig,
  options: { app?: string; fromEmpty?: boolean } = {},
): Promise<void> {
  logger.header('Migration Diff');

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

    const args = [
      '--from-schema-datamodel',
      app.schemaPath,
      '--to-schema-datasource',
      app.schemaPath,
    ];
    if (options.fromEmpty) {
      args.push('--from-empty');
    }

    const result = await executePrisma(app, 'migrate diff', args, { silent: false });

    if (!result.success) {
      logger.error(`Failed to get diff for ${app.name}`);
    }

    console.log();
  }
}

/**
 * Resolve migration issues (mark as applied or rolled back)
 */
export async function migrateResolveCommand(
  config: MtaPrismaConfig,
  migration: string,
  options: { app?: string; applied?: boolean; rolledBack?: boolean } = {},
): Promise<void> {
  logger.header('Resolve Migration');

  if (!migration) {
    logger.error('Migration name is required');
    process.exit(1);
  }

  if (!options.applied && !options.rolledBack) {
    logger.error('Must specify either --applied or --rolled-back');
    process.exit(1);
  }

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
    logger.warn('Resolving migration for ALL apps. Use --app to target specific app.');
  }

  const action = options.applied ? 'applied' : 'rolled-back';
  const args = ['resolve', `--${action}`, migration];

  for (const app of apps) {
    logger.section(app.name);

    const result = await executePrisma(app, 'migrate', args, { silent: false });

    if (result.success) {
      logger.success(`Marked migration as ${action}: ${migration}`);
    } else {
      logger.error(`Failed to resolve migration for ${app.name}`);
    }

    console.log();
  }
}

/**
 * Create a baseline migration (for existing databases)
 */
export async function migrateBaselineCommand(
  config: MtaPrismaConfig,
  migration: string,
  options: { app?: string } = {},
): Promise<void> {
  logger.header('Create Baseline Migration');

  if (!migration) {
    logger.error('Migration name is required');
    process.exit(1);
  }

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

  logger.info('Creating baseline migration for existing database schema');
  logger.warn('This will mark the migration as applied without running it');

  for (const app of apps) {
    logger.section(app.name);

    // Create migration
    const createResult = await executePrisma(
      app,
      'migrate dev',
      ['--name', migration, '--create-only'],
      { silent: false },
    );

    if (!createResult.success) {
      logger.error(`Failed to create baseline migration for ${app.name}`);
      continue;
    }

    // Mark as applied
    const resolveResult = await executePrisma(app, 'migrate', ['resolve', '--applied', migration], {
      silent: false,
    });

    if (resolveResult.success) {
      logger.success(`Baseline created and marked as applied: ${migration}`);
    } else {
      logger.error(`Created migration but failed to mark as applied`);
    }

    console.log();
  }
}
