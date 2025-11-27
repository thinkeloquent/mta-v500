/**
 * @module @internal/core-plugin-logger
 * Type definitions for plugin logging plugin
 */

import { z } from 'zod';

/**
 * Output mode for plugin logging
 */
export type PluginOutputMode = 'pretty' | 'json' | 'both';

/**
 * Options for configuring the plugin logger plugin
 */
export interface PluginLoggerOptions {
  /**
   * Enable or disable plugin logging
   * @default true
   */
  enabled?: boolean;

  /**
   * Path where the plugins.log file will be written
   * @default './plugins.log'
   */
  outputPath?: string;

  /**
   * Enable console output of plugins
   * @default true
   */
  consoleOutput?: boolean;

  /**
   * Enable file output of plugins
   * @default true
   */
  fileOutput?: boolean;

  /**
   * Include timestamp in the log output
   * @default true
   */
  includeTimestamp?: boolean;

  /**
   * Pretty print plugins in a formatted table
   * @default true
   */
  prettyPrint?: boolean;

  /**
   * Output mode for plugin logging
   * - 'pretty': Formatted text output to console/file (default behavior)
   * - 'json': Structured JSON output to fastify.log only
   * - 'both': Both pretty console/file AND JSON to fastify.log
   * @default 'pretty'
   */
  outputMode?: PluginOutputMode;

  /**
   * Enable structured JSON logging to fastify.log
   * This is a convenience option equivalent to outputMode: 'both'
   * @deprecated Use outputMode instead
   * @default false
   */
  loggerOutput?: boolean;

  /**
   * Server port number
   * @default 3000
   */
  port: number;

  /**
   * Server host address
   * @default '0.0.0.0'
   */
  host: string;
}

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

/**
 * Represents a single plugin in the Fastify application
 */
export interface PluginInfo {
  name: string;
  dependencies?: string[];
}

/**
 * Result of the plugin logging operation
 */
export interface PluginLogResult {
  success: boolean;
  pluginCount: number;
  consoleLogged: boolean;
  fileLogged: boolean;
  loggerLogged: boolean;
  outputPath?: string;
  error?: string;
}
