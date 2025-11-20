/**
 * @module @thinkeloquent/core-no-cache
 * Type definitions for no-cache plugin
 */
import { z } from 'zod';
/**
 * Zod schema for validating no-cache options
 */
export const NoCacheOptionsSchema = z.object({
    enabled: z.boolean().optional().default(true),
});
//# sourceMappingURL=types.js.map