import { z } from 'zod';
/**
 * Zod schema for validating SpaAppOptions
 */
export const SpaAppOptionsSchema = z.object({
    root: z.string().min(1, 'Root directory is required'),
    prefix: z.string().optional().default('/'),
    indexFile: z.string().optional().default('index.html'),
    noCache: z.boolean().optional().default(true),
    wildcard: z.boolean().optional().default(true),
});
//# sourceMappingURL=types.js.map