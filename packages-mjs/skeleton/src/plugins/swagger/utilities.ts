import type { FastifyInstance, FastifySchema, RouteOptions } from 'fastify';
import type { ModuleDocConfig, ModuleMetadata } from './module-registry.js';
import { moduleRegistry } from './module-registry.js';

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
export function registerModule(config: ModuleDocConfig): void {
  moduleRegistry.register(config);
}

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
export function createModuleRouter(module: ModuleMetadata) {
  return <T extends RouteOptions>(route: T): T => {
    // Add module tags to route schema
    const tags = [module.name, ...(module.tags || [])];

    return {
      ...route,
      schema: {
        ...route.schema,
        tags: [...((route.schema as FastifySchema & { tags?: string[] })?.tags || []), ...tags],
      },
    } as T;
  };
}

/**
 * Helper to get the documentation URL for a module
 *
 * @example
 * ```ts
 * const docUrl = getModuleDocUrl('user-service', 'apps');
 * // Returns: '/documentation/apps/user-service'
 * ```
 */
export function getModuleDocUrl(name: string, type: ModuleMetadata['type']): string {
  return moduleRegistry.getDocRoute({ name, type } as ModuleMetadata);
}

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
export function withSwaggerSchema(schema: FastifySchema) {
  return { schema };
}

/**
 * Get all registered modules
 */
export function getAllModules(): ModuleDocConfig[] {
  return moduleRegistry.getAll();
}

/**
 * Get modules by type
 */
export function getModulesByType(type: ModuleMetadata['type']): ModuleDocConfig[] {
  return moduleRegistry.getByType(type);
}

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
export function generateDocIndex() {
  const modules = moduleRegistry.getAll();

  const modulesByType = modules.reduce(
    (acc, config) => {
      const type = config.module.type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push({
        name: config.module.name,
        version: config.module.version,
        description: config.module.description,
        docUrl: moduleRegistry.getDocRoute(config.module),
        routePrefix: config.module.routePrefix,
      });
      return acc;
    },
    {} as Record<
      string,
      Array<{
        name: string;
        version: string;
        description?: string;
        docUrl: string;
        routePrefix?: string;
      }>
    >,
  );

  return {
    title: 'API Documentation Index',
    totalModules: modules.length,
    modules: modulesByType,
    combinedDocs: '/documentation',
  };
}

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
export async function registerModuleRoutes(
  fastify: FastifyInstance,
  module: ModuleMetadata,
  registerFn: (instance: FastifyInstance, module: ModuleMetadata) => void | Promise<void>,
): Promise<void> {
  await fastify.register(async (instance) => {
    // Add a decorator to automatically tag routes
    instance.addHook('onRoute', (routeOptions) => {
      if (!routeOptions.schema) {
        routeOptions.schema = {};
      }

      const schemaWithTags = routeOptions.schema as FastifySchema & { tags?: string[] };
      const existingTags = schemaWithTags.tags || [];
      const moduleTags = [module.name, ...(module.tags || [])];

      schemaWithTags.tags = [...new Set([...existingTags, ...moduleTags])];
    });

    await registerFn(instance, module);
  });
}
