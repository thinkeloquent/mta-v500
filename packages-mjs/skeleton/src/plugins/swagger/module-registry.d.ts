import type { FastifyInstance } from 'fastify';
import type { SwaggerPluginOptions } from './types.js';
/**
 * Module metadata for Swagger documentation
 */
export interface ModuleMetadata {
    /**
     * Module name (e.g., 'user-service', 'auth-api')
     */
    name: string;
    /**
     * Module type/category (e.g., 'apps', 'capability', 'utilities')
     */
    type: 'apps' | 'capability' | 'utilities' | 'external' | 'core';
    /**
     * Module version
     */
    version: string;
    /**
     * Module description
     */
    description?: string;
    /**
     * Route prefix for this module's routes
     * Example: '/api/users', '/auth', etc.
     */
    routePrefix?: string;
    /**
     * Tags to automatically apply to all routes in this module
     */
    tags?: string[];
    /**
     * Contact information
     */
    contact?: {
        name?: string;
        email?: string;
        url?: string;
    };
}
/**
 * Module documentation configuration
 */
export interface ModuleDocConfig {
    /**
     * Module metadata
     */
    module: ModuleMetadata;
    /**
     * Swagger options specific to this module
     */
    swagger?: Partial<SwaggerPluginOptions>;
    /**
     * Whether to include this module in the combined documentation
     * @default true
     */
    includeInCombined?: boolean;
}
/**
 * Module Swagger Registry
 * Centralized registry for managing module-scoped documentation
 */
export declare class ModuleSwaggerRegistry {
    private modules;
    private fastifyInstance?;
    /**
     * Register a module for documentation
     */
    register(config: ModuleDocConfig): void;
    /**
     * Get all registered modules
     */
    getAll(): ModuleDocConfig[];
    /**
     * Get modules by type
     */
    getByType(type: ModuleMetadata['type']): ModuleDocConfig[];
    /**
     * Get a specific module
     */
    get(name: string, type: ModuleMetadata['type']): ModuleDocConfig | undefined;
    /**
     * Get module documentation route
     */
    getDocRoute(module: ModuleMetadata): string;
    /**
     * Set the Fastify instance (used internally)
     */
    setFastifyInstance(fastify: FastifyInstance): void;
    /**
     * Get the Fastify instance
     */
    getFastifyInstance(): FastifyInstance | undefined;
    /**
     * Generate a unique key for the module
     */
    private getModuleKey;
    /**
     * Clear all registered modules (useful for testing)
     */
    clear(): void;
    /**
     * Get modules that should be included in combined documentation
     */
    getForCombinedDocs(): ModuleDocConfig[];
}
/**
 * Global singleton registry instance
 */
export declare const moduleRegistry: ModuleSwaggerRegistry;
//# sourceMappingURL=module-registry.d.ts.map