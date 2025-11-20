/**
 * @module @thinkeloquent/core-route-logger
 * Type definitions for route logging plugin
 */
import { z } from 'zod';
/**
 * Output mode for route logging
 */
export type RouteOutputMode = 'pretty' | 'json' | 'both';
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
}
/**
 * Zod schema for validating route logger options
 */
export declare const RouteLoggerOptionsSchema: z.ZodObject<{
    enabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    outputPath: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    consoleOutput: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    fileOutput: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    includeTimestamp: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    prettyPrint: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    outputMode: z.ZodDefault<z.ZodOptional<z.ZodEnum<["pretty", "json", "both"]>>>;
    loggerOutput: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    flattenRoutes: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    outputPath: string;
    consoleOutput: boolean;
    fileOutput: boolean;
    includeTimestamp: boolean;
    prettyPrint: boolean;
    outputMode: "both" | "pretty" | "json";
    loggerOutput: boolean;
    flattenRoutes: boolean;
}, {
    enabled?: boolean | undefined;
    outputPath?: string | undefined;
    consoleOutput?: boolean | undefined;
    fileOutput?: boolean | undefined;
    includeTimestamp?: boolean | undefined;
    prettyPrint?: boolean | undefined;
    outputMode?: "both" | "pretty" | "json" | undefined;
    loggerOutput?: boolean | undefined;
    flattenRoutes?: boolean | undefined;
}>;
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
//# sourceMappingURL=types.d.ts.map