/**
 * @module @thinkeloquent/core-no-cache
 * Type definitions for no-cache plugin
 */
import { z } from 'zod';
/**
 * Options for configuring the no-cache plugin
 */
export interface NoCacheOptions {
    /**
     * Enable or disable no-cache headers
     * @default true
     */
    enabled?: boolean;
}
/**
 * Zod schema for validating no-cache options
 */
export declare const NoCacheOptionsSchema: z.ZodObject<{
    enabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
}, {
    enabled?: boolean | undefined;
}>;
/**
 * Result of the no-cache plugin operation
 */
export interface NoCacheResult {
    success: boolean;
    enabled: boolean;
    error?: string;
}
//# sourceMappingURL=types.d.ts.map