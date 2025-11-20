import { z } from 'zod';
/**
 * Zod schema for validating StaticAppOptions
 */
export const StaticAppOptionsSchema = z.object({
    root: z.string().min(1, 'Root directory is required'),
    prefix: z.string().optional().default('/'),
    maxAge: z.number().int().nonnegative().optional().default(86400),
    dotfiles: z.boolean().optional().default(false),
    index: z.array(z.string()).optional().default(['index.html']),
    etag: z.boolean().optional().default(true),
    preCompressed: z.boolean().optional().default(false),
});
//# sourceMappingURL=types.js.map