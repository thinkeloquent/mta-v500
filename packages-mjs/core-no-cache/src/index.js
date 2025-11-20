/**
 * @module @thinkeloquent/core-no-cache
 * @description Fastify plugin for setting no-cache headers on all responses
 *
 * Features:
 * - Sets no-cache headers on all responses globally
 * - Overrides any existing Cache-Control headers
 * - HTTP/1.0 compatibility with Pragma header
 * - Legacy client support with Expires header
 * - Configurable enable/disable option
 * - Type-safe with Zod validation
 *
 * Headers Set:
 * - Cache-Control: no-cache, no-store, must-revalidate
 * - Pragma: no-cache
 * - Expires: 0
 *
 * @example
 * ```typescript
 * import Fastify from 'fastify';
 * import noCache from '@thinkeloquent/core-no-cache';
 *
 * const server = Fastify();
 *
 * // Register no-cache plugin
 * await server.register(noCache, {
 *   enabled: true,
 * });
 *
 * // All responses will now have no-cache headers
 * server.get('/api/data', async (request, reply) => {
 *   return { data: 'fresh data' };
 * });
 *
 * await server.listen({ port: 3000 });
 * ```
 *
 * @example
 * ```typescript
 * // Disable no-cache headers
 * await server.register(noCache, {
 *   enabled: false,
 * });
 * ```
 */
// Export plugin as default
export { default } from './plugin.js';
export { NoCacheOptionsSchema } from './types.js';
//# sourceMappingURL=index.js.map