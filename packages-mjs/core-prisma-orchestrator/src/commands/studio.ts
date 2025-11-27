import { getApp } from '../lib/config.js';
import { executePrisma } from '../lib/executor.js';
import { logger } from '../lib/logger.js';
import type { MtaPrismaConfig } from '../types/config.js';

/**
 * Open Prisma Studio for an app
 */
export async function studioCommand(
  config: MtaPrismaConfig,
  appName: string,
  options: { port?: number } = {},
): Promise<void> {
  const app = getApp(config, appName);

  if (!app) {
    logger.error(`App not found: ${appName}`);
    process.exit(1);
  }

  logger.info(`Opening Prisma Studio for: ${app.name}`);

  const args = [];
  if (options.port) {
    args.push('--port', options.port.toString());
  }

  await executePrisma(app, 'studio', args, { silent: false });
}
