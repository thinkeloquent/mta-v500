/**
 * @module @internal/core-route-logger
 * Type definitions for route logging plugin
 */

import { z } from "zod";

/**
 * Output mode for route logging
 */
export type RouteOutputMode = "pretty" | "json" | "both";

/**
 * Options for configuring the route logger plugin
 */
export interface RouteLoggerOptions {
  /**
   * Enable or disable route logging
   * @default true
   */
  enabled?: boolean;

  /**
   * Path where the routes.log file will be written
   * @default './routes.log'
   */
  outputPath?: string;

  /**
   * Enable console output of routes
   * @default true
   */
  consoleOutput?: boolean;

  /**
   * Enable file output of routes
   * @default true
   */
  fileOutput?: boolean;

  /**
   * Include timestamp in the log output
   * @default true
   */
  includeTimestamp?: boolean;

  /**
   * Pretty print routes in a formatted table
   * @default true
   */
  prettyPrint?: boolean;

  /**
   * Output mode for route logging
   * - 'pretty': Formatted text output to console/file (default behavior)
   * - 'json': Structured JSON output to fastify.log only
   * - 'both': Both pretty console/file AND JSON to fastify.log
   * @default 'pretty'
   */
  outputMode?: RouteOutputMode;

  /**
   * Enable structured JSON logging to fastify.log
   * This is a convenience option equivalent to outputMode: 'both'
   * @deprecated Use outputMode instead
   * @default false
   */
  loggerOutput?: boolean;

  /**
   * Flatten routes into a simple list instead of tree structure
   * @default false
   */
  flattenRoutes?: boolean;
  port: number;
  host: string;
}

/**
 * Zod schema for validating route logger options
 */
export const RouteLoggerOptionsSchema = z.object({
  enabled: z.boolean().optional().default(true),
  outputPath: z.string().optional().default("./routes.log"),
  consoleOutput: z.boolean().optional().default(true),
  fileOutput: z.boolean().optional().default(true),
  includeTimestamp: z.boolean().optional().default(true),
  prettyPrint: z.boolean().optional().default(true),
  outputMode: z.enum(["pretty", "json", "both"]).optional().default("pretty"),
  loggerOutput: z.boolean().optional().default(false),
  flattenRoutes: z.boolean().optional().default(false),
});

/**
 * Represents a single route in the Fastify application
 */
export interface RouteInfo {
  method: string;
  path: string;
  handler?: string;
}

/**
 * Result of the route logging operation
 */
export interface RouteLogResult {
  success: boolean;
  routeCount: number;
  consoleLogged: boolean;
  fileLogged: boolean;
  loggerLogged: boolean;
  outputPath?: string;
  error?: string;
}
