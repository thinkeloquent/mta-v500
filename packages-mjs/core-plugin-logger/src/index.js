/**
 * @module @thinkeloquent/core-plugin-logger
 * @description Fastify plugin for logging all registered plugins to console and file
 *
 * Features:
 * - Automatic plugin logging on server ready
 * - Console output with pretty formatting
 * - File output to plugins.log
 * - Configurable output options
 * - Type-safe with Zod validation
 * - Non-blocking error handling
 *
 * @example
 * ```typescript
 * import Fastify from 'fastify';
 * import pluginLogger from '@thinkeloquent/core-plugin-logger';
 *
 * const server = Fastify();
 *
 * // Register plugin logger plugin
 * await server.register(pluginLogger, {
 *   enabled: true,
 *   outputPath: './logs/plugins.log',
 *   consoleOutput: true,
 *   fileOutput: true,
 *   prettyPrint: true,
 * });
 *
 * // Register your plugins
 * await server.register(somePlugin);
 *
 * // Start server - plugins will be logged when ready
 * await server.listen({ port: 3000 });
 * ```
 *
 * @example
 * ```typescript
 * // Minimal configuration
 * await server.register(pluginLogger);
 * ```
 *
 * @example
 * ```typescript
 * // Only file output, no console
 * await server.register(pluginLogger, {
 *   consoleOutput: false,
 *   fileOutput: true,
 *   outputPath: './my-plugins.log',
 * });
 * ```
 */
// Export plugin as default
export { default } from './plugin.js';
export { PluginLoggerOptionsSchema } from './types.js';
//# sourceMappingURL=index.js.map