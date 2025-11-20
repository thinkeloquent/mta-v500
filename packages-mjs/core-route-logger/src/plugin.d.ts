/**
 * @module @thinkeloquent/core-route-logger
 * Fastify plugin for logging all registered routes
 */
import type { RouteLogResult } from './types.js';
declare const _default: any;
export default _default;
declare module 'fastify' {
    interface FastifyInstance {
        routeLogResult?: RouteLogResult;
    }
}
//# sourceMappingURL=plugin.d.ts.map