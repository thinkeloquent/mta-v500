import type { FastifySwaggerOptions } from '@fastify/swagger';
import type { FastifySwaggerUiOptions } from '@fastify/swagger-ui';
/**
 * Swagger plugin configuration options
 */
export interface SwaggerPluginOptions {
    /**
     * Enable/disable Swagger documentation
     * @default true
     */
    enabled?: boolean;
    /**
     * Route path for the Swagger UI
     * @default '/documentation'
     */
    routePrefix?: string;
    /**
     * OpenAPI specification options
     */
    openapi?: {
        /**
         * API title
         * @default 'API Documentation'
         */
        title?: string;
        /**
         * API description
         * @default 'API documentation'
         */
        description?: string;
        /**
         * API version
         * @default '1.0.0'
         */
        version?: string;
        /**
         * Server URLs for the API
         */
        servers?: Array<{
            url: string;
            description?: string;
        }>;
        /**
         * Contact information
         */
        contact?: {
            name?: string;
            url?: string;
            email?: string;
        };
        /**
         * License information
         */
        license?: {
            name: string;
            url?: string;
        };
        /**
         * Tags for grouping operations
         */
        tags?: Array<{
            name: string;
            description?: string;
        }>;
    };
    /**
     * Swagger UI customization options
     */
    ui?: {
        /**
         * Display operation ID in the UI
         * @default false
         */
        displayOperationId?: boolean;
        /**
         * Display request duration in the UI
         * @default true
         */
        displayRequestDuration?: boolean;
        /**
         * Default models expand depth
         * @default 1
         */
        defaultModelsExpandDepth?: number;
        /**
         * Default model expand depth
         * @default 1
         */
        defaultModelExpandDepth?: number;
        /**
         * Syntax highlighting theme
         * @default 'agate'
         */
        syntaxHighlight?: {
            theme?: 'agate' | 'arta' | 'monokai' | 'nord' | 'obsidian' | 'tomorrow-night';
        };
        /**
         * Enable deep linking
         * @default true
         */
        deepLinking?: boolean;
    };
    /**
     * Advanced Swagger options
     * Allows passing raw options directly to @fastify/swagger
     */
    swagger?: Partial<FastifySwaggerOptions>;
    /**
     * Advanced Swagger UI options
     * Allows passing raw options directly to @fastify/swagger-ui
     */
    swaggerUi?: Partial<FastifySwaggerUiOptions>;
}
//# sourceMappingURL=types.d.ts.map