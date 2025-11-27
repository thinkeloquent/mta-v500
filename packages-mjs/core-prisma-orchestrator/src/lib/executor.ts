import { resolve } from 'node:path';
import { execa } from 'execa';
import type { AppConfig } from '../types/config.js';
import { logger } from './logger.js';

export interface ExecuteOptions {
  /**
   * Working directory
   */
  cwd?: string;

  /**
   * Environment variables
   */
  env?: Record<string, string>;

  /**
   * Whether to show output
   */
  silent?: boolean;

  /**
   * Dry run mode (don't execute)
   */
  dryRun?: boolean;
}

/**
 * Execute Prisma command for an app
 */
export async function executePrisma(
  app: AppConfig,
  command: string,
  args: string[] = [],
  options: ExecuteOptions = {},
): Promise<{ success: boolean; output?: string; error?: Error; duration: number }> {
  const startTime = Date.now();

  const schemaPath = resolve(options.cwd || process.cwd(), app.schemaPath);
  const prismaArgs = [command, `--schema=${schemaPath}`, ...args];

  const fullCommand = `npx prisma ${prismaArgs.join(' ')}`;

  if (options.dryRun) {
    logger.dim(`[DRY RUN] ${fullCommand}`);
    return { success: true, duration: 0 };
  }

  if (!options.silent) {
    logger.dim(`$ ${fullCommand}`);
  }

  try {
    const result = await execa('npx', ['prisma', ...prismaArgs], {
      cwd: options.cwd || process.cwd(),
      env: {
        ...process.env,
        ...options.env,
      },
      stdio: options.silent ? 'pipe' : 'inherit',
    });

    return {
      success: true,
      output: result.stdout,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error as Error,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Execute Prisma command for multiple apps in parallel
 */
export async function executePrismaParallel(
  apps: AppConfig[],
  command: string,
  args: string[] = [],
  options: ExecuteOptions = {},
  concurrency: number = 3,
): Promise<Map<string, { success: boolean; error?: Error; duration: number }>> {
  const pLimit = (await import('p-limit')).default;
  const limit = pLimit(concurrency);

  const results = new Map<string, { success: boolean; error?: Error; duration: number }>();

  const promises = apps.map((app) =>
    limit(async () => {
      const result = await executePrisma(app, command, args, options);
      results.set(app.name, {
        success: result.success,
        error: result.error,
        duration: result.duration,
      });
    }),
  );

  await Promise.all(promises);
  return results;
}

/**
 * Execute Prisma command for apps in sequence (dependency order)
 */
export async function executePrismaSequential(
  apps: AppConfig[],
  command: string,
  args: string[] = [],
  options: ExecuteOptions = {},
): Promise<Map<string, { success: boolean; error?: Error; duration: number }>> {
  const results = new Map<string, { success: boolean; error?: Error; duration: number }>();

  for (const app of apps) {
    logger.section(`Processing: ${app.name}`);
    const result = await executePrisma(app, command, args, options);
    results.set(app.name, {
      success: result.success,
      error: result.error,
      duration: result.duration,
    });

    if (!result.success && !options.silent) {
      logger.error(`Failed to execute command for ${app.name}`);
      if (result.error) {
        logger.error(result.error.message);
      }
      // Stop on first failure for sequential operations
      break;
    }
  }

  return results;
}
