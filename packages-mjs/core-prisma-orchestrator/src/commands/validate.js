import { getAppsInOrder } from '../lib/config.js';
import { executePrismaParallel } from '../lib/executor.js';
import { logger } from '../lib/logger.js';
/**
 * Validate all Prisma schemas
 */
export async function validateCommand(config) {
    logger.header('Validating Prisma Schemas');
    const apps = getAppsInOrder(config);
    logger.info(`Validating ${apps.length} schemas`);
    const results = await executePrismaParallel(apps, 'validate', [], { silent: true });
    let successCount = 0;
    for (const [appName, result] of results.entries()) {
        if (result.success) {
            logger.success(appName);
            successCount++;
        }
        else {
            logger.error(`${appName}: ${result.error?.message}`);
        }
    }
    console.log();
    if (successCount === apps.length) {
        logger.success('All schemas are valid');
    }
    else {
        logger.error(`Validation failed: ${successCount}/${apps.length} valid`);
        process.exit(1);
    }
}
//# sourceMappingURL=validate.js.map