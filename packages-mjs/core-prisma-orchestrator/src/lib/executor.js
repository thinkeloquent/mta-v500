import { resolve } from 'node:path';
import { execa } from 'execa';
import { logger } from './logger.js';
/**
 * Execute Prisma command for an app
 */
export async function executePrisma(app, command, args = [], options = {}) {
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
    }
    catch (error) {
        return {
            success: false,
            error: error,
            duration: Date.now() - startTime,
        };
    }
}
/**
 * Execute Prisma command for multiple apps in parallel
 */
export async function executePrismaParallel(apps, command, args = [], options = {}, concurrency = 3) {
    const pLimit = (await import('p-limit')).default;
    const limit = pLimit(concurrency);
    const results = new Map();
    const promises = apps.map((app) => limit(async () => {
        const result = await executePrisma(app, command, args, options);
        results.set(app.name, {
            success: result.success,
            error: result.error,
            duration: result.duration,
        });
    }));
    await Promise.all(promises);
    return results;
}
/**
 * Execute Prisma command for apps in sequence (dependency order)
 */
export async function executePrismaSequential(apps, command, args = [], options = {}) {
    const results = new Map();
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
//# sourceMappingURL=executor.js.map