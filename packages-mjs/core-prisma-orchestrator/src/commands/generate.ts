import ora from 'ora';
import { getApp, getAppsInOrder } from '../lib/config.js';
import { executePrismaParallel } from '../lib/executor.js';
import { logger } from '../lib/logger.js';
import type { AppConfig, MtaPrismaConfig } from '../types/config.js';
import { watchCommand } from './watch.js';

export interface GenerateOptions {
  app?: string;
  watch?: boolean;
  parallel?: boolean;
  concurrency?: number;
}

/**
 * Generate Prisma clients for apps
 */
export async function generateCommand(
  config: MtaPrismaConfig,
  options: GenerateOptions = {},
): Promise<void> {
  // If watch mode, delegate to watch command
  if (options.watch) {
    await watchCommand(config, { app: options.app });
    return;
  }

  logger.header('Generating Prisma Clients');

  // Get apps to generate
  let apps: AppConfig[];

  if (options.app) {
    const app = getApp(config, options.app);
    if (!app) {
      logger.error(`App not found: ${options.app}`);
      process.exit(1);
    }
    apps = [app];
    logger.info(`Generating client for app: ${app.name}`);
  } else {
    apps = getAppsInOrder(config);
    logger.info(`Generating clients for ${apps.length} apps`);
  }

  if (apps.length === 0) {
    logger.warn('No apps to generate');
    return;
  }

  // Generate clients
  const spinner = ora('Generating Prisma clients...').start();

  try {
    const results = await executePrismaParallel(
      apps,
      'generate',
      [],
      { silent: true },
      options.concurrency || 3,
    );

    spinner.stop();

    // Show results
    let successCount = 0;
    let failCount = 0;

    for (const [appName, result] of results.entries()) {
      if (result.success) {
        logger.success(`${appName} (${result.duration}ms)`);
        successCount++;
      } else {
        logger.error(`${appName}: ${result.error?.message || 'Unknown error'}`);
        failCount++;
      }
    }

    console.log();
    logger.info(`Generated: ${successCount} success, ${failCount} failed`);

    if (failCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    spinner.stop();
    logger.error(`Generation failed: ${(error as Error).message}`);
    process.exit(1);
  }
}
