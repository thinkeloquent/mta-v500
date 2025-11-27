/**
 * @module @internal/core-route-logger
 * @description Fastify plugin for logging all registered routes to console and file
 *
 * Features:
 * - Automatic route logging on server ready
 * - Console output with pretty formatting
 * - File output to routes.log
 * - Configurable output options
 * - Type-safe with Zod validation
 * - Non-blocking error handling
 *
 * @example
 * ```typescript
 * import Fastify from 'fastify';
 * import routeLogger from '@internal/core-route-logger';
 *
 * const server = Fastify();
 *
 * // Register route logger plugin
 * await server.register(routeLogger, {
 *   enabled: true,
 *   outputPath: './logs/routes.log',
 *   consoleOutput: true,
 *   fileOutput: true,
 *   prettyPrint: true,
 * });
 *
 * // Register your routes
 * server.get('/api/users', async (request, reply) => {
 *   return { users: [] };
 * });
 *
 * // Start server - routes will be logged when ready
 * await server.listen({ port: 3000 });
 * ```
 *
 * @example
 * ```typescript
 * // Minimal configuration
 * await server.register(routeLogger);
 * ```
 *
 * @example
 * ```typescript
 * // Only file output, no console
 * await server.register(routeLogger, {
 *   consoleOutput: false,
 *   fileOutput: true,
 *   outputPath: './my-routes.log',
 * });
 * ```
 */

// Export plugin as default
export { default } from './plugin.js';

// Export types
export type {
  RouteInfo,
  RouteLoggerOptions,
  RouteLogResult,
  RouteOutputMode,
} from './types.js';

export { RouteLoggerOptionsSchema } from './types.js';
