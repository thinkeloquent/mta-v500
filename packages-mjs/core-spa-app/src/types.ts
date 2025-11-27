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
export const SpaAppOptionsSchema = z.object({
  root: z.string().min(1, 'Root directory is required'),
  prefix: z.string().optional().default('/'),
  indexFile: z.string().optional().default('index.html'),
  noCache: z.boolean().optional().default(true),
  wildcard: z.boolean().optional().default(true),
});
