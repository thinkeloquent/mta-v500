/**
 * Default Swagger configuration
 */
export const defaultConfig = {
    enabled: true,
    routePrefix: '/documentation',
    openapi: {
        title: 'API Documentation',
        description: 'REST API documentation for this service',
        version: '1.0.0',
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server',
            },
        ],
        tags: [],
    },
    ui: {
        displayOperationId: false,
        displayRequestDuration: true,
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        syntaxHighlight: {
            theme: 'monokai',
        },
        deepLinking: true,
    },
};
/**
 * Development configuration
 * More verbose with additional debugging information
 */
export const devConfig = {
    enabled: true,
    routePrefix: '/documentation',
    openapi: {
        title: 'API Documentation (Development)',
        description: 'REST API documentation for development environment',
        version: '1.0.0-dev',
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Local development server',
            },
        ],
        contact: {
            name: 'Development Team',
        },
        tags: [],
    },
    ui: {
        displayOperationId: true,
        displayRequestDuration: true,
        defaultModelsExpandDepth: 3,
        defaultModelExpandDepth: 3,
        syntaxHighlight: {
            theme: 'monokai',
        },
        deepLinking: true,
    },
};
/**
 * Production configuration
 * Minimal and optimized for production use
 */
export const prodConfig = {
    enabled: true,
    routePrefix: '/documentation',
    openapi: {
        title: 'API Documentation',
        description: 'REST API documentation',
        version: '1.0.0',
        servers: [
            {
                url: 'https://api.example.com',
                description: 'Production server',
            },
        ],
        license: {
            name: 'UNLICENSED',
        },
        tags: [],
    },
    ui: {
        displayOperationId: false,
        displayRequestDuration: false,
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        syntaxHighlight: {
            theme: 'agate',
        },
        deepLinking: true,
    },
};
//# sourceMappingURL=config.js.map