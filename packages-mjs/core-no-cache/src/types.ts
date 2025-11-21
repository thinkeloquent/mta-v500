/**
 * @module @internal/core-no-cache
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
export const NoCacheOptionsSchema = z.object({
  enabled: z.boolean().optional().default(true),
});

/**
 * Result of the no-cache plugin operation
 */
export interface NoCacheResult {
  success: boolean;
  enabled: boolean;
  error?: string;
}
