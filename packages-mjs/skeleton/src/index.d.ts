import type { FastifyInstance } from 'fastify';
export type { AppRegistration, RegisteredApp } from './lib/app-registry.js';
export { AppRegistry } from './lib/app-registry.js';
export interface ServerConfig {
    loggerLevel?: string;
    prettyPrint?: boolean;
    logger?: {
        level?: string;
    };
    corsAllowLocalhost?: boolean;
    corsUseOrigin?: boolean;
    corsAllowedOrigins?: string[];
}
export interface LaunchConfig {
    port?: number;
    host?: string;
    /**
     * Additional metadata to log on successful startup
     */
    metadata?: {
        appsLoaded?: string[];
        [key: string]: unknown;
    };
}
/**
 * Creates and configures a Fastify instance with all plugins
 * @param config - Optional server configuration
 * @returns Configured Fastify instance
 */
export declare const createServer: (config?: ServerConfig) => Promise<FastifyInstance>;
/**
 * Starts the Fastify server with the given configuration
 * @param fastify - Fastify instance to start
 * @param config - Launch configuration with port, host, and optional metadata
 * @returns The started Fastify instance for lifecycle management
 */
export declare const launchServer: (fastify: FastifyInstance, config?: LaunchConfig) => Promise<FastifyInstance>;
export default createServer;
//# sourceMappingURL=index.d.ts.map