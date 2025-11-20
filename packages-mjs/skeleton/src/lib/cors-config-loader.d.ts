/**
 * CORS Configuration Loader
 *
 * Loads and merges CORS configuration from:
 * 1. Central cors.json file
 * 2. Environment variables (highest priority)
 *
 * @module cors-config-loader
 */
import type { FastifyBaseLogger } from 'fastify';
import type { CorsConfig } from './cors-policy-engine.js';
export interface CorsConfigLoaderOptions {
    /** Path to cors.json file */
    configPath?: string;
    /** Override environment (defaults to NODE_ENV) */
    environment?: string;
    /** Logger instance */
    logger?: FastifyBaseLogger;
    /** Monorepo root path */
    monorepoRoot?: string;
}
export interface LoadedCorsConfig extends CorsConfig {
    /** Source of the configuration */
    _source: string;
    /** Environment variables that were applied */
    _envOverrides: string[];
}
/**
 * Loads CORS configuration from file and merges with environment variables
 */
export declare function loadCorsConfig(options?: CorsConfigLoaderOptions): LoadedCorsConfig;
/**
 * Validates that the configuration is correct for the environment
 */
export declare function validateCorsConfig(config: CorsConfig, environment: string, logger?: FastifyBaseLogger): {
    valid: boolean;
    errors: string[];
    warnings: string[];
};
/**
 * Gets a human-readable summary of the CORS configuration
 */
export declare function getCorsConfigSummary(config: LoadedCorsConfig, environment: string): string;
export default loadCorsConfig;
//# sourceMappingURL=cors-config-loader.d.ts.map