/**
 * Example Module: User Service
 *
 * This file demonstrates how to structure a module with Swagger documentation
 * in a multi-module setup. Copy this pattern for your own modules.
 */
import { registerModule, registerModuleRoutes } from '../plugins/swagger/index.js';
/**
 * User Service Module Configuration
 *
 * Register this module for Swagger documentation
 * Call this BEFORE registering the multiModuleSwagger plugin in plugin.ts
 */
export function registerUserServiceModule() {
    registerModule({
        module: {
            name: 'user-service',
            type: 'apps',
            version: '1.0.0',
            description: 'User management and authentication service',
            routePrefix: '/api/users',
            tags: ['users', 'authentication', 'profile'],
            contact: {
                name: 'User Service Team',
                email: 'users@example.com',
            },
        },
        swagger: {
            openapi: {
                servers: [
                    {
                        url: 'http://localhost:3000',
                        description: 'Development server',
                    },
                ],
            },
        },
    });
}
/**
 * User Service Routes
 *
 * Register all routes for the user service module
 * Routes are automatically tagged with the module name for proper organization
 */
export async function registerUserServiceRoutes(fastify) {
    await registerModuleRoutes(fastify, {
        name: 'user-service',
        type: 'apps',
        version: '1.0.0',
        description: 'User management and authentication service',
    }, async (instance) => {
        // Get all users
        instance.get('/api/users', {
            schema: {
                description: 'Retrieve a list of all users',
                summary: 'Get all users',
                tags: ['users'],
                response: {
                    200: {
                        description: 'Successful response',
                        type: 'object',
                        properties: {
                            users: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        id: { type: 'string' },
                                        email: { type: 'string', format: 'email' },
                                        name: { type: 'string' },
                                        createdAt: { type: 'string', format: 'date-time' },
                                    },
                                },
                            },
                            total: { type: 'number' },
                        },
                    },
                },
            },
            handler: async () => {
                return {
                    users: [
                        {
                            id: '1',
                            email: 'user@example.com',
                            name: 'John Doe',
                            createdAt: new Date().toISOString(),
                        },
                    ],
                    total: 1,
                };
            },
        });
        // Get user by ID
        instance.get('/api/users/:id', {
            schema: {
                description: 'Retrieve a specific user by their ID',
                summary: 'Get user by ID',
                tags: ['users'],
                params: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', description: 'User ID' },
                    },
                    required: ['id'],
                },
                response: {
                    200: {
                        description: 'User found',
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            email: { type: 'string', format: 'email' },
                            name: { type: 'string' },
                            createdAt: { type: 'string', format: 'date-time' },
                        },
                    },
                    404: {
                        description: 'User not found',
                        type: 'object',
                        properties: {
                            error: { type: 'string' },
                        },
                    },
                },
            },
            handler: async (request) => {
                const { id } = request.params;
                return {
                    id,
                    email: 'user@example.com',
                    name: 'John Doe',
                    createdAt: new Date().toISOString(),
                };
            },
        });
        // Create user
        instance.post('/api/users', {
            schema: {
                description: 'Create a new user account',
                summary: 'Create user',
                tags: ['users'],
                body: {
                    type: 'object',
                    required: ['email', 'name', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email' },
                        name: { type: 'string', minLength: 1 },
                        password: { type: 'string', minLength: 8 },
                    },
                },
                response: {
                    201: {
                        description: 'User created successfully',
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            email: { type: 'string' },
                            name: { type: 'string' },
                            createdAt: { type: 'string', format: 'date-time' },
                        },
                    },
                    400: {
                        description: 'Invalid input',
                        type: 'object',
                        properties: {
                            error: { type: 'string' },
                        },
                    },
                },
            },
            handler: async (request, reply) => {
                const body = request.body;
                reply.status(201);
                return {
                    id: 'new-user-id',
                    email: body.email,
                    name: body.name,
                    createdAt: new Date().toISOString(),
                };
            },
        });
        // Login endpoint
        instance.post('/api/users/login', {
            schema: {
                description: 'Authenticate a user and receive an access token',
                summary: 'User login',
                tags: ['authentication'],
                body: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email' },
                        password: { type: 'string' },
                    },
                },
                response: {
                    200: {
                        description: 'Login successful',
                        type: 'object',
                        properties: {
                            token: { type: 'string' },
                            expiresIn: { type: 'number' },
                        },
                    },
                    401: {
                        description: 'Invalid credentials',
                        type: 'object',
                        properties: {
                            error: { type: 'string' },
                        },
                    },
                },
            },
            handler: async () => {
                return {
                    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                    expiresIn: 3600,
                };
            },
        });
    });
}
//# sourceMappingURL=example-user-service.js.map