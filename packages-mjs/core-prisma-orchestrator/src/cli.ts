#!/usr/bin/env node

import { Command } from 'commander';
import { formatCommand } from './commands/format.js';
import { generateCommand } from './commands/generate.js';
import {
  migrateDeployCommand,
  migrateDevCommand,
  migrateResetCommand,
  migrateStatusCommand,
} from './commands/migrate.js';
import {
  migrateBaselineCommand,
  migrateDiffCommand,
  migrateResolveCommand,
} from './commands/migrate-advanced.js';
import { studioCommand } from './commands/studio.js';
import { validateCommand } from './commands/validate.js';
import { watchCommand } from './commands/watch.js';
import { loadConfig, validateConfig } from './lib/config.js';
import { logger } from './lib/logger.js';

const program = new Command();

program
  .name('mta-prisma')
  .description('CLI orchestrator for managing multiple Prisma schemas in a monorepo')
  .version('1.0.0');

// Global options
program
  .option('-c, --config <path>', 'Path to configuration file', 'mta-prisma.config.json')
  .option('--verbose', 'Enable verbose logging')
  .option('--dry-run', 'Show what would be done without executing');

// Generate command
program
  .command('generate')
  .description('Generate Prisma clients for all or specific app')
  .option('-a, --app <name>', 'Generate for specific app only')
  .option('-w, --watch', 'Watch for changes and regenerate')
  .option('-c, --concurrency <number>', 'Number of concurrent operations', '3')
  .action(async (options) => {
    try {
      const config = await loadConfig(program.opts().config);
      const validation = validateConfig(config);

      if (!validation.valid) {
        logger.error('Configuration validation failed:');
        validation.errors.forEach((err) => {
          logger.error(`  - ${err}`);
        });
        process.exit(1);
      }

      await generateCommand(config, {
        app: options.app,
        watch: options.watch,
        concurrency: parseInt(options.concurrency, 10),
      });
    } catch (error) {
      logger.error((error as Error).message);
      process.exit(1);
    }
  });

// Migrate dev command
program
  .command('migrate:dev')
  .description('Create and apply development migrations')
  .option('-a, --app <name>', 'Migrate specific app only')
  .option('-n, --name <name>', 'Migration name')
  .option('--create-only', 'Create migration without applying')
  .option('--skip-generate', 'Skip generating Prisma Client')
  .action(async (options) => {
    try {
      const config = await loadConfig(program.opts().config);
      const validation = validateConfig(config);

      if (!validation.valid) {
        logger.error('Configuration validation failed:');
        validation.errors.forEach((err) => {
          logger.error(`  - ${err}`);
        });
        process.exit(1);
      }

      await migrateDevCommand(config, options);
    } catch (error) {
      logger.error((error as Error).message);
      process.exit(1);
    }
  });

// Migrate deploy command
program
  .command('migrate:deploy')
  .description('Deploy migrations to production')
  .option('-a, --app <name>', 'Deploy specific app only')
  .action(async (options) => {
    try {
      const config = await loadConfig(program.opts().config);
      await migrateDeployCommand(config, options);
    } catch (error) {
      logger.error((error as Error).message);
      process.exit(1);
    }
  });

// Migrate status command
program
  .command('migrate:status')
  .description('Show migration status')
  .option('-a, --app <name>', 'Show status for specific app')
  .action(async (options) => {
    try {
      const config = await loadConfig(program.opts().config);
      await migrateStatusCommand(config, options);
    } catch (error) {
      logger.error((error as Error).message);
      process.exit(1);
    }
  });

// Migrate reset command
program
  .command('migrate:reset')
  .description('Reset database and migrations (DESTRUCTIVE)')
  .option('-a, --app <name>', 'Reset specific app only')
  .option('-f, --force', 'Force reset without confirmation')
  .action(async (options) => {
    try {
      const config = await loadConfig(program.opts().config);
      await migrateResetCommand(config, options);
    } catch (error) {
      logger.error((error as Error).message);
      process.exit(1);
    }
  });

// Format command
program
  .command('format')
  .description('Format all Prisma schemas')
  .action(async () => {
    try {
      const config = await loadConfig(program.opts().config);
      await formatCommand(config);
    } catch (error) {
      logger.error((error as Error).message);
      process.exit(1);
    }
  });

// Validate command
program
  .command('validate')
  .description('Validate all Prisma schemas')
  .action(async () => {
    try {
      const config = await loadConfig(program.opts().config);
      await validateCommand(config);
    } catch (error) {
      logger.error((error as Error).message);
      process.exit(1);
    }
  });

// Studio command
program
  .command('studio <app>')
  .description('Open Prisma Studio for specific app')
  .option('-p, --port <number>', 'Port number for Studio')
  .action(async (app, options) => {
    try {
      const config = await loadConfig(program.opts().config);
      await studioCommand(config, app, {
        port: options.port ? parseInt(options.port, 10) : undefined,
      });
    } catch (error) {
      logger.error((error as Error).message);
      process.exit(1);
    }
  });

// Watch command
program
  .command('watch')
  .description('Watch schemas and regenerate clients on changes')
  .option('-a, --app <name>', 'Watch specific app only')
  .option('-d, --debounce <ms>', 'Debounce delay in milliseconds', '300')
  .action(async (options) => {
    try {
      const config = await loadConfig(program.opts().config);
      await watchCommand(config, {
        app: options.app,
        debounceMs: parseInt(options.debounce, 10),
      });
    } catch (error) {
      logger.error((error as Error).message);
      process.exit(1);
    }
  });

// Migrate diff command
program
  .command('migrate:diff')
  .description('Show diff between schema and database')
  .option('-a, --app <name>', 'Show diff for specific app')
  .option('--from-empty', 'Show diff from empty database')
  .action(async (options) => {
    try {
      const config = await loadConfig(program.opts().config);
      await migrateDiffCommand(config, options);
    } catch (error) {
      logger.error((error as Error).message);
      process.exit(1);
    }
  });

// Migrate resolve command
program
  .command('migrate:resolve <migration>')
  .description('Resolve migration state (mark as applied or rolled back)')
  .option('-a, --app <name>', 'Resolve for specific app')
  .option('--applied', 'Mark migration as applied')
  .option('--rolled-back', 'Mark migration as rolled back')
  .action(async (migration, options) => {
    try {
      const config = await loadConfig(program.opts().config);
      await migrateResolveCommand(config, migration, options);
    } catch (error) {
      logger.error((error as Error).message);
      process.exit(1);
    }
  });

// Migrate baseline command
program
  .command('migrate:baseline <migration>')
  .description('Create baseline migration for existing database')
  .option('-a, --app <name>', 'Create baseline for specific app')
  .action(async (migration, options) => {
    try {
      const config = await loadConfig(program.opts().config);
      await migrateBaselineCommand(config, migration, options);
    } catch (error) {
      logger.error((error as Error).message);
      process.exit(1);
    }
  });

// Info command
program
  .command('info')
  .description('Show configuration and app information')
  .action(async () => {
    try {
      const config = await loadConfig(program.opts().config);
      const validation = validateConfig(config);

      logger.header('Configuration Info');

      console.log();
      logger.info(`Strategy: ${config.strategy}`);
      logger.info(`Apps: ${config.apps.length}`);

      console.log();
      logger.section('Apps:');
      for (const app of config.apps) {
        console.log(`  • ${app.name}`);
        console.log(`    Schema: ${app.schemaPath}`);
        console.log(`    Output: ${app.outputName}`);
        if (app.dependencies?.length) {
          console.log(`    Depends on: ${app.dependencies.join(', ')}`);
        }
      }

      if (validation.warnings.length > 0) {
        console.log();
        logger.section('Warnings:');
        validation.warnings.forEach((warn) => {
          logger.warn(warn);
        });
      }

      if (!validation.valid) {
        console.log();
        logger.section('Errors:');
        validation.errors.forEach((err) => {
          logger.error(err);
        });
        process.exit(1);
      }
    } catch (error) {
      logger.error((error as Error).message);
      process.exit(1);
    }
  });

// Parse arguments
program.parse();
