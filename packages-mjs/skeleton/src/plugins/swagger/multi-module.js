import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';
import { moduleRegistry } from './module-registry.js';
/**
 * Multi-Module Swagger Plugin
 *
 * Registers Swagger documentation for multiple modules in a monorepo.
 * Each module gets its own documentation at `/documentation/{type}/{moduleName}`
 * and optionally provides a combined view at `/documentation`
 *
 * @example
 * ```ts
 * import { multiModuleSwagger } from './plugins/swagger/multi-module';
 * import { registerModule } from './plugins/swagger/utilities';
 *
 * // Register modules
 * registerModule({
 *   module: {
 *     name: 'user-service',
 *     type: 'apps',
 *     version: '1.0.0',
 *     description: 'User management service',
 *   }
 * });
 *
 * // Register the multi-module plugin
 * await fastify.register(multiModuleSwagger, {
 *   enableCombinedDocs: true,
 *   combinedDocsRoute: '/documentation'
 * });
 * ```
 */
export const multiModuleSwagger = async (fastify, options) => {
    const { enableCombinedDocs = true, combinedDocsRoute = '/documentation', globalOptions = {}, autoRegisterModules = true, } = options;
    // Store fastify instance in registry for utilities
    moduleRegistry.setFastifyInstance(fastify);
    if (!autoRegisterModules) {
        fastify.log.info('Auto-registration disabled, skipping module documentation');
        return;
    }
    const modules = moduleRegistry.getAll();
    if (modules.length === 0) {
        fastify.log.warn('No modules registered for documentation');
        return;
    }
    // Register documentation for each module
    for (const moduleConfig of modules) {
        await registerModuleDocumentation(fastify, moduleConfig, globalOptions);
    }
    // Register combined documentation if enabled
    if (enableCombinedDocs) {
        await registerCombinedDocumentation(fastify, combinedDocsRoute, globalOptions);
    }
    fastify.log.info(`Multi-module Swagger registered: ${modules.length} module(s)`);
};
/**
 * Register Swagger documentation for a single module
 */
async function registerModuleDocumentation(fastify, moduleConfig, globalOptions) {
    const { module, swagger = {} } = moduleConfig;
    const routePrefix = moduleRegistry.getDocRoute(module);
    // Merge global options with module-specific options
    const mergedOptions = {
        ...globalOptions,
        ...swagger,
        openapi: {
            ...globalOptions.openapi,
            ...swagger.openapi,
            title: swagger.openapi?.title || `${module.name} API`,
            description: swagger.openapi?.description ||
                module.description ||
                `API documentation for ${module.name}`,
            version: swagger.openapi?.version || module.version,
            tags: [
                ...(globalOptions.openapi?.tags || []),
                ...(swagger.openapi?.tags || []),
                {
                    name: module.name,
                    description: module.description,
                },
            ],
            contact: swagger.openapi?.contact || module.contact,
        },
    };
    // Register in a separate plugin context to isolate each module's documentation
    await fastify.register(async (instance) => {
        // Register @fastify/swagger
        await instance.register(fastifySwagger, {
            openapi: {
                openapi: '3.1.0',
                info: {
                    title: mergedOptions.openapi?.title || `${module.name} API`,
                    description: mergedOptions.openapi?.description || module.description || '',
                    version: mergedOptions.openapi?.version || module.version,
                    contact: mergedOptions.openapi?.contact,
                },
                servers: mergedOptions.openapi?.servers || [],
                tags: mergedOptions.openapi?.tags || [],
                components: {
                    securitySchemes: {
                        bearerAuth: {
                            type: 'http',
                            scheme: 'bearer',
                            bearerFormat: 'JWT',
                        },
                        apiKey: {
                            type: 'apiKey',
                            name: 'X-API-Key',
                            in: 'header',
                        },
                    },
                },
            },
        });
        // Register @fastify/swagger-ui
        await instance.register(fastifySwaggerUI, {
            routePrefix,
            uiConfig: {
                docExpansion: 'list',
                deepLinking: true,
                displayOperationId: mergedOptions.ui?.displayOperationId ?? process.env.NODE_ENV === 'development',
                displayRequestDuration: mergedOptions.ui?.displayRequestDuration ?? true,
                defaultModelsExpandDepth: mergedOptions.ui?.defaultModelsExpandDepth ?? 1,
                defaultModelExpandDepth: mergedOptions.ui?.defaultModelExpandDepth ?? 1,
                syntaxHighlight: mergedOptions.ui?.syntaxHighlight || {
                    theme: 'monokai',
                },
            },
            staticCSP: true,
        });
        instance.log.info(`✓ Module documentation registered: ${module.type}/${module.name} at ${routePrefix}`);
    });
}
/**
 * Register combined documentation showing all modules
 */
async function registerCombinedDocumentation(fastify, routePrefix, globalOptions) {
    const modules = moduleRegistry.getForCombinedDocs();
    // Build tags from all modules
    const tags = modules.map((config) => ({
        name: config.module.name,
        description: config.module.description || `${config.module.name} API endpoints`,
    }));
    await fastify.register(async (instance) => {
        // Register @fastify/swagger
        await instance.register(fastifySwagger, {
            openapi: {
                openapi: '3.1.0',
                info: {
                    title: globalOptions.openapi?.title || 'Combined API Documentation',
                    description: globalOptions.openapi?.description || 'Documentation for all API modules',
                    version: globalOptions.openapi?.version || '1.0.0',
                    contact: globalOptions.openapi?.contact,
                },
                servers: globalOptions.openapi?.servers || [],
                tags,
                components: {
                    securitySchemes: {
                        bearerAuth: {
                            type: 'http',
                            scheme: 'bearer',
                            bearerFormat: 'JWT',
                        },
                        apiKey: {
                            type: 'apiKey',
                            name: 'X-API-Key',
                            in: 'header',
                        },
                    },
                },
            },
        });
        // Register @fastify/swagger-ui
        await instance.register(fastifySwaggerUI, {
            routePrefix,
            uiConfig: {
                docExpansion: 'list',
                deepLinking: true,
                displayOperationId: process.env.NODE_ENV === 'development',
                displayRequestDuration: true,
                syntaxHighlight: { theme: 'monokai' },
            },
            staticCSP: true,
        });
        instance.log.info(`✓ Combined documentation registered at ${routePrefix}`);
    });
}
export default multiModuleSwagger;
//# sourceMappingURL=multi-module.js.map