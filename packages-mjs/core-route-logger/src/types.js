/**
 * @module @thinkeloquent/core-route-logger
 * Type definitions for route logging plugin
 */
import { z } from 'zod';
/**
 * Zod schema for validating route logger options
 */
export const RouteLoggerOptionsSchema = z.object({
    enabled: z.boolean().optional().default(true),
    outputPath: z.string().optional().default('./routes.log'),
    consoleOutput: z.boolean().optional().default(true),
    fileOutput: z.boolean().optional().default(true),
    includeTimestamp: z.boolean().optional().default(true),
    prettyPrint: z.boolean().optional().default(true),
    outputMode: z.enum(['pretty', 'json', 'both']).optional().default('pretty'),
    loggerOutput: z.boolean().optional().default(false),
    flattenRoutes: z.boolean().optional().default(false),
});
//# sourceMappingURL=types.js.map