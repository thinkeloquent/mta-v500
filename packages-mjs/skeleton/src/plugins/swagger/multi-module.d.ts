import type { FastifyPluginAsync } from 'fastify';
import type { SwaggerPluginOptions } from './types.js';
/**
 * Multi-Module Swagger Options
 */
export interface MultiModuleSwaggerOptions {
    /**
     * Enable combined documentation showing all modules
     * @default true
     */
    enableCombinedDocs?: boolean;
    /**
     * Route for combined documentation
     * @default '/documentation'
     */
    combinedDocsRoute?: string;
    /**
     * Global Swagger options applied to all modules
     */
    globalOptions?: Partial<SwaggerPluginOptions>;
    /**
     * Whether to automatically register documentation for all registered modules
     * @default true
     */
    autoRegisterModules?: boolean;
}
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
export declare const multiModuleSwagger: FastifyPluginAsync<MultiModuleSwaggerOptions>;
export default multiModuleSwagger;
//# sourceMappingURL=multi-module.d.ts.map