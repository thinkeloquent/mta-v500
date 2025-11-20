/**
 * @module @thinkeloquent/core-plugin-logger
 * Type definitions for plugin logging plugin
 */
import { z } from 'zod';
/**
 * Zod schema for validating plugin logger options
 */
export const PluginLoggerOptionsSchema = z.object({
    enabled: z.boolean().optional().default(true),
    outputPath: z.string().optional().default('./plugins.log'),
    consoleOutput: z.boolean().optional().default(true),
    fileOutput: z.boolean().optional().default(true),
    includeTimestamp: z.boolean().optional().default(true),
    prettyPrint: z.boolean().optional().default(true),
    outputMode: z.enum(['pretty', 'json', 'both']).optional().default('pretty'),
    loggerOutput: z.boolean().optional().default(false),
});
//# sourceMappingURL=types.js.map