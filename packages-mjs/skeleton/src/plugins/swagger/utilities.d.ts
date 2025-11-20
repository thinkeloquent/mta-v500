import type { FastifyInstance, FastifySchema, RouteOptions } from 'fastify';
import type { ModuleDocConfig, ModuleMetadata } from './module-registry.js';
/**
 * Register a module for documentation
 *
 * This should be called before registering the multi-module Swagger plugin.
 *
 * @example
 * ```ts
 * import { registerModule } from './plugins/swagger/utilities';
 *
 * registerModule({
 *   module: {
 *     name: 'user-service',
 *     type: 'apps',
 *     version: '1.0.0',
 *     description: 'User management API',
 *     tags: ['users', 'authentication'],
 *   }
 * });
 * ```
 */
export declare function registerModule(config: ModuleDocConfig): void;
/**
 * Create a module-scoped route registrar
 *
 * Returns a function that automatically adds module-specific tags
 * and metadata to routes for proper organization in Swagger docs.
 *
 * @example
 * ```ts
 * import { createModuleRouter } from './plugins/swagger/utilities';
 *
 * const userRouter = createModuleRouter({
 *   name: 'users',
 *   type: 'apps',
 *   version: '1.0.0'
 * });
 *
 * // Routes registered with this router automatically get tagged
 * fastify.route(userRouter({
 *   method: 'GET',
 *   url: '/users',
 *   schema: {
 *     description: 'Get all users',
 *     response: {
 *       200: { type: 'array', items: { type: 'object' } }
 *     }
 *   },
 *   handler: async () => ({ users: [] })
 * }));
 * ```
 */
export declare function createModuleRouter(module: ModuleMetadata): <T extends RouteOptions>(route: T) => T;
/**
 * Helper to get the documentation URL for a module
 *
 * @example
 * ```ts
 * const docUrl = getModuleDocUrl('user-service', 'apps');
 * // Returns: '/documentation/apps/user-service'
 * ```
 */
export declare function getModuleDocUrl(name: string, type: ModuleMetadata['type']): string;
/**
 * Decorator to add Swagger schema to a route handler
 *
 * @example
 * ```ts
 * import { withSwaggerSchema } from './plugins/swagger/utilities';
 *
 * fastify.get('/users',
 *   withSwaggerSchema({
 *     description: 'Get all users',
 *     tags: ['users'],
 *     response: {
 *       200: {
 *         type: 'object',
 *         properties: {
 *           users: { type: 'array' }
 *         }
 *       }
 *     }
 *   }),
 *   async (request, reply) => {
 *     return { users: [] };
 *   }
 * );
 * ```
 */
export declare function withSwaggerSchema(schema: FastifySchema): {
    schema: FastifySchema;
};
/**
 * Get all registered modules
 */
export declare function getAllModules(): ModuleDocConfig[];
/**
 * Get modules by type
 */
export declare function getModulesByType(type: ModuleMetadata['type']): ModuleDocConfig[];
/**
 * Generate a documentation index showing all registered modules
 *
 * Can be used to create a landing page that links to all module docs
 *
 * @example
 * ```ts
 * fastify.get('/docs', async () => {
 *   return generateDocIndex();
 * });
 * ```
 */
export declare function generateDocIndex(): {
    title: string;
    totalModules: number;
    modules: Record<string, {
        name: string;
        version: string;
        description?: string;
        docUrl: string;
        routePrefix?: string;
    }[]>;
    combinedDocs: string;
};
/**
 * Register routes with automatic module tagging
 *
 * @example
 * ```ts
 * import { registerModuleRoutes } from './plugins/swagger/utilities';
 *
 * registerModuleRoutes(fastify, {
 *   name: 'users',
 *   type: 'apps',
 *   version: '1.0.0'
 * }, (instance, module) => {
 *   instance.get('/users', {
 *     schema: {
 *       description: 'Get all users',
 *       response: { 200: { type: 'array' } }
 *     },
 *     handler: async () => []
 *   });
 * });
 * ```
 */
export declare function registerModuleRoutes(fastify: FastifyInstance, module: ModuleMetadata, registerFn: (instance: FastifyInstance, module: ModuleMetadata) => void | Promise<void>): Promise<void>;
//# sourceMappingURL=utilities.d.ts.map