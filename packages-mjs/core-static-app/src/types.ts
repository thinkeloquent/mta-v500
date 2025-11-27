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
export const StaticAppOptionsSchema = z.object({
  root: z.string().min(1, 'Root directory is required'),
  prefix: z.string().optional().default('/'),
  maxAge: z.number().int().nonnegative().optional().default(86400),
  dotfiles: z.boolean().optional().default(false),
  index: z.array(z.string()).optional().default(['index.html']),
  etag: z.boolean().optional().default(true),
  preCompressed: z.boolean().optional().default(false),
});
