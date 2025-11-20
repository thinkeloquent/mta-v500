/**
 * Module Swagger Registry
 * Centralized registry for managing module-scoped documentation
 */
export class ModuleSwaggerRegistry {
    modules = new Map();
    fastifyInstance;
    /**
     * Register a module for documentation
     */
    register(config) {
        const key = this.getModuleKey(config.module);
        if (this.modules.has(key)) {
            throw new Error(`Module "${config.module.name}" in "${config.module.type}" is already registered`);
        }
        this.modules.set(key, config);
    }
    /**
     * Get all registered modules
     */
    getAll() {
        return Array.from(this.modules.values());
    }
    /**
     * Get modules by type
     */
    getByType(type) {
        return this.getAll().filter((config) => config.module.type === type);
    }
    /**
     * Get a specific module
     */
    get(name, type) {
        const key = this.getModuleKey({ name, type });
        return this.modules.get(key);
    }
    /**
     * Get module documentation route
     */
    getDocRoute(module) {
        return `/documentation/${module.type}/${module.name}`;
    }
    /**
     * Set the Fastify instance (used internally)
     */
    setFastifyInstance(fastify) {
        this.fastifyInstance = fastify;
    }
    /**
     * Get the Fastify instance
     */
    getFastifyInstance() {
        return this.fastifyInstance;
    }
    /**
     * Generate a unique key for the module
     */
    getModuleKey(module) {
        return `${module.type}/${module.name}`;
    }
    /**
     * Clear all registered modules (useful for testing)
     */
    clear() {
        this.modules.clear();
    }
    /**
     * Get modules that should be included in combined documentation
     */
    getForCombinedDocs() {
        return this.getAll().filter((config) => config.includeInCombined !== false);
    }
}
/**
 * Global singleton registry instance
 */
export const moduleRegistry = new ModuleSwaggerRegistry();
//# sourceMappingURL=module-registry.js.map