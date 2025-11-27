import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';
import type { FastifyPluginAsync } from 'fastify';
import { defaultConfig } from './config.js';
import type { SwaggerPluginOptions } from './types.js';

/**
 * Swagger/OpenAPI Documentation Plugin
 *
 * Provides interactive API documentation using Swagger UI with OpenAPI 3.1.0 specification.
 *
 * Features:
 * - Automatic OpenAPI spec generation from route schemas
 * - Interactive Swagger UI for testing endpoints
 * - TypeScript support with type-safe schemas
 * - Environment-based configuration (dev/prod)
 * - Customizable UI themes and options
 *
 * @example
 * ```ts
 * import { swaggerPlugin } from './plugins/swagger';
 *
 * // Use with default config (UI at /documentation)
 * await fastify.register(swaggerPlugin);
 *
 * // Use with custom config
 * await fastify.register(swaggerPlugin, {
 *   routePrefix: '/api-docs',
 *   openapi: {
 *     title: 'My API',
 *     version: '2.0.0'
 *   }
 * });
 * ```
 *
 * Routes:
 * - GET /documentation - Swagger UI interface
 * - GET /documentation/json - OpenAPI JSON spec
 * - GET /documentation/yaml - OpenAPI YAML spec
 */
export const swaggerPlugin: FastifyPluginAsync<SwaggerPluginOptions> = async (fastify, options) => {
  // Merge options with defaults
  const config = {
    ...defaultConfig,
    ...options,
    openapi: { ...defaultConfig.openapi, ...options.openapi },
    ui: { ...defaultConfig.ui, ...options.ui },
  };

  // Skip registration if disabled
  if (config.enabled === false) {
    fastify.log.info('Swagger plugin is disabled');
    return;
  }

  // Register @fastify/swagger for OpenAPI spec generation
  await fastify.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: config.openapi?.title || 'API Documentation',
        description: config.openapi?.description || 'API documentation',
        version: config.openapi?.version || '1.0.0',
        contact: config.openapi?.contact,
        license: config.openapi?.license,
      },
      servers: config.openapi?.servers || [],
      tags: config.openapi?.tags || [],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Enter your JWT token',
          },
          apiKey: {
            type: 'apiKey',
            name: 'X-API-Key',
            in: 'header',
            description: 'API key for authentication',
          },
        },
      },
    },
  });

  fastify.log.debug('✓ @fastify/swagger registered (OpenAPI 3.1.0)');

  // Register @fastify/swagger-ui for the interactive UI
  await fastify.register(fastifySwaggerUI, {
    routePrefix: config.routePrefix || '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: config.ui?.deepLinking ?? true,
      displayOperationId: config.ui?.displayOperationId ?? false,
      displayRequestDuration: config.ui?.displayRequestDuration ?? true,
      defaultModelsExpandDepth: config.ui?.defaultModelsExpandDepth ?? 1,
      defaultModelExpandDepth: config.ui?.defaultModelExpandDepth ?? 1,
      syntaxHighlight: config.ui?.syntaxHighlight || { theme: 'monokai' },
    },
    staticCSP: true,
    transformStaticCSP: (header: string) => header,
  });

  fastify.log.debug(`✓ @fastify/swagger-ui registered (route: ${config.routePrefix})`);
  fastify.log.info(`Swagger documentation available at ${config.routePrefix || '/documentation'}`);
};

// Export single-module plugin as default
export default swaggerPlugin;

export { defaultConfig, devConfig, prodConfig } from './config.js';
export type { ModuleDocConfig, ModuleMetadata } from './module-registry.js';

// Export module registry and types
export { ModuleSwaggerRegistry, moduleRegistry } from './module-registry.js';
export type { MultiModuleSwaggerOptions } from './multi-module.js';
// Export multi-module functionality
export { multiModuleSwagger } from './multi-module.js';

// Re-export types and config
export type { SwaggerPluginOptions } from './types.js';
// Export utilities
export {
  createModuleRouter,
  generateDocIndex,
  getAllModules,
  getModuleDocUrl,
  getModulesByType,
  registerModule,
  registerModuleRoutes,
  withSwaggerSchema,
} from './utilities.js';
