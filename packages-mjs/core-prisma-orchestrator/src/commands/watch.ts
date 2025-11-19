import chokidar from 'chokidar';
import { getAppsInOrder, resolvePath } from '../lib/config.js';
import { executePrisma } from '../lib/executor.js';
import { logger } from '../lib/logger.js';
import { debounce } from '../lib/utils.js';
import type { MtaPrismaConfig } from '../types/config.js';

export interface WatchOptions {
  app?: string;
  debounceMs?: number;
}

/**
 * Watch schema files and regenerate on changes
 */
export async function watchCommand(
  config: MtaPrismaConfig,
  options: WatchOptions = {},
): Promise<void> {
  logger.header('Watch Mode - Prisma Client Generation');

  const apps = options.app
    ? config.apps.filter((a) => a.name === options.app)
    : getAppsInOrder(config);

  if (apps.length === 0) {
    logger.error('No apps to watch');
    process.exit(1);
  }

  // Collect all schema paths to watch
  const schemaPaths = apps.map((app) => resolvePath(app.schemaPath));

  logger.info(`Watching ${apps.length} schema(s)...`);
  apps.forEach((app) => {
    logger.dim(`  • ${app.name}: ${app.schemaPath}`);
  });

  console.log();
  logger.info('Press Ctrl+C to stop');
  console.log();

  // Create debounced regenerate function
  const regenerateApp = debounce(async (_appName: string, schemaPath: string) => {
    const app = apps.find((a) => a.schemaPath === schemaPath);
    if (!app) return;

    logger.section(`Change detected: ${app.name}`);
    const startTime = Date.now();

    const result = await executePrisma(app, 'generate', [], { silent: true });

    if (result.success) {
      logger.success(`Regenerated ${app.name} (${Date.now() - startTime}ms)`);
    } else {
      logger.error(`Failed to regenerate ${app.name}`);
      if (result.error) {
        logger.error(result.error.message);
      }
    }
  }, options.debounceMs || 300);

  // Watch for changes
  const watcher = chokidar.watch(schemaPaths, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 100,
    },
  });

  watcher.on('change', (path) => {
    const app = apps.find((a) => resolvePath(a.schemaPath) === path);
    if (app) {
      regenerateApp(app.name, app.schemaPath);
    }
  });

  watcher.on('error', (error) => {
    logger.error(`Watcher error: ${(error as Error).message}`);
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log();
    logger.info('Stopping watcher...');
    await watcher.close();
    process.exit(0);
  });

  // Keep the process alive
  await new Promise(() => {});
}
