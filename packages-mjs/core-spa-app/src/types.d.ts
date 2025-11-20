import { z } from 'zod';
/**
 * Options for configuring the SPA routing plugin
 */
export interface SpaAppOptions {
    /**
     * Root directory containing the index.html file
     */
    root: string;
    /**
     * URL prefix for SPA routes
     * @default '/'
     */
    prefix?: string;
    /**
     * Name of the index file to serve
     * @default 'index.html'
     */
    indexFile?: string;
    /**
     * Disable caching for the index file (recommended for development)
     * @default true
     */
    noCache?: boolean;
    /**
     * Enable wildcard route matching (e.g., /apps/auth/*)
     * @default true
     */
    wildcard?: boolean;
}
/**
 * Zod schema for validating SpaAppOptions
 */
export declare const SpaAppOptionsSchema: z.ZodObject<{
    root: z.ZodString;
    prefix: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    indexFile: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    noCache: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    wildcard: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    prefix: string;
    root: string;
    indexFile: string;
    noCache: boolean;
    wildcard: boolean;
}, {
    root: string;
    prefix?: string | undefined;
    indexFile?: string | undefined;
    noCache?: boolean | undefined;
    wildcard?: boolean | undefined;
}>;
//# sourceMappingURL=types.d.ts.map