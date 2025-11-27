import { getAppsInOrder } from '../lib/config.js';
import { executePrismaParallel } from '../lib/executor.js';
import { logger } from '../lib/logger.js';
import type { MtaPrismaConfig } from '../types/config.js';

/**
 * Format all Prisma schemas
 */
export async function formatCommand(config: MtaPrismaConfig): Promise<void> {
  logger.header('Formatting Prisma Schemas');

  const apps = getAppsInOrder(config);
  logger.info(`Formatting ${apps.length} schemas`);

  const results = await executePrismaParallel(apps, 'format', [], { silent: true });

  let successCount = 0;
  for (const [appName, result] of results.entries()) {
    if (result.success) {
      logger.success(appName);
      successCount++;
    } else {
      logger.error(`${appName}: ${result.error?.message}`);
    }
  }

  console.log();
  logger.info(`Formatted: ${successCount}/${apps.length}`);

  if (successCount < apps.length) {
    process.exit(1);
  }
}
