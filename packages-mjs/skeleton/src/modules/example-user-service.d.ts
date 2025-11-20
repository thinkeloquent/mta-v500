/**
 * Example Module: User Service
 *
 * This file demonstrates how to structure a module with Swagger documentation
 * in a multi-module setup. Copy this pattern for your own modules.
 */
import type { FastifyInstance } from 'fastify';
/**
 * User Service Module Configuration
 *
 * Register this module for Swagger documentation
 * Call this BEFORE registering the multiModuleSwagger plugin in plugin.ts
 */
export declare function registerUserServiceModule(): void;
/**
 * User Service Routes
 *
 * Register all routes for the user service module
 * Routes are automatically tagged with the module name for proper organization
 */
export declare function registerUserServiceRoutes(fastify: FastifyInstance): Promise<void>;
//# sourceMappingURL=example-user-service.d.ts.map