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
export class ModuleSwaggerRegistry {
  private modules: Map<string, ModuleDocConfig> = new Map();
  private fastifyInstance?: FastifyInstance;

  /**
   * Register a module for documentation
   */
  register(config: ModuleDocConfig): void {
    const key = this.getModuleKey(config.module);

    if (this.modules.has(key)) {
      throw new Error(
        `Module "${config.module.name}" in "${config.module.type}" is already registered`,
      );
    }

    this.modules.set(key, config);
  }

  /**
   * Get all registered modules
   */
  getAll(): ModuleDocConfig[] {
    return Array.from(this.modules.values());
  }

  /**
   * Get modules by type
   */
  getByType(type: ModuleMetadata['type']): ModuleDocConfig[] {
    return this.getAll().filter((config) => config.module.type === type);
  }

  /**
   * Get a specific module
   */
  get(name: string, type: ModuleMetadata['type']): ModuleDocConfig | undefined {
    const key = this.getModuleKey({ name, type } as ModuleMetadata);
    return this.modules.get(key);
  }

  /**
   * Get module documentation route
   */
  getDocRoute(module: ModuleMetadata): string {
    return `/documentation/${module.type}/${module.name}`;
  }

  /**
   * Set the Fastify instance (used internally)
   */
  setFastifyInstance(fastify: FastifyInstance): void {
    this.fastifyInstance = fastify;
  }

  /**
   * Get the Fastify instance
   */
  getFastifyInstance(): FastifyInstance | undefined {
    return this.fastifyInstance;
  }

  /**
   * Generate a unique key for the module
   */
  private getModuleKey(module: Pick<ModuleMetadata, 'name' | 'type'>): string {
    return `${module.type}/${module.name}`;
  }

  /**
   * Clear all registered modules (useful for testing)
   */
  clear(): void {
    this.modules.clear();
  }

  /**
   * Get modules that should be included in combined documentation
   */
  getForCombinedDocs(): ModuleDocConfig[] {
    return this.getAll().filter((config) => config.includeInCombined !== false);
  }
}

/**
 * Global singleton registry instance
 */
export const moduleRegistry = new ModuleSwaggerRegistry();
