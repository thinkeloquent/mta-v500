/**
 * @module @thinkeloquent/core-plugin-logger
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
}
/**
 * Zod schema for validating plugin logger options
 */
export declare const PluginLoggerOptionsSchema: z.ZodObject<{
    enabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    outputPath: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    consoleOutput: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    fileOutput: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    includeTimestamp: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    prettyPrint: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    outputMode: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        both: "both";
        pretty: "pretty";
        json: "json";
    }>>>;
    loggerOutput: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
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
//# sourceMappingURL=types.d.ts.map