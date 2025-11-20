import { z } from 'zod';
/**
 * Options for configuring the static file server plugin
 */
export interface StaticAppOptions {
    /**
     * Root directory to serve static files from
     */
    root: string;
    /**
     * URL prefix for serving static files
     * @default '/'
     */
    prefix?: string;
    /**
     * Maximum age for cache-control header (in seconds)
     * Set to 0 to disable caching with no-cache headers
     * @default 86400 (1 day)
     */
    maxAge?: number;
    /**
     * Enable serving dotfiles
     * @default false
     */
    dotfiles?: boolean;
    /**
     * Index files to serve automatically
     * @default ['index.html']
     */
    index?: string[];
    /**
     * Enable etag generation
     * @default true
     */
    etag?: boolean;
    /**
     * Enable serving pre-compressed files (.gz, .br)
     * @default false
     */
    preCompressed?: boolean;
}
/**
 * Zod schema for validating StaticAppOptions
 */
export declare const StaticAppOptionsSchema: z.ZodObject<{
    root: z.ZodString;
    prefix: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    maxAge: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    dotfiles: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    index: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    etag: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    preCompressed: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    prefix: string;
    etag: boolean;
    root: string;
    maxAge: number;
    dotfiles: boolean;
    index: string[];
    preCompressed: boolean;
}, {
    root: string;
    prefix?: string | undefined;
    etag?: boolean | undefined;
    maxAge?: number | undefined;
    dotfiles?: boolean | undefined;
    index?: string[] | undefined;
    preCompressed?: boolean | undefined;
}>;
//# sourceMappingURL=types.d.ts.map