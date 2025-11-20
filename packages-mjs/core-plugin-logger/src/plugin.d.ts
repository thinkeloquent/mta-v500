/**
 * @module @thinkeloquent/core-plugin-logger
 * Fastify plugin for logging all registered plugins
 */
import type { PluginLogResult } from './types.js';
declare const _default: any;
export default _default;
declare module 'fastify' {
    interface FastifyInstance {
        pluginLogResult?: PluginLogResult;
    }
}
//# sourceMappingURL=plugin.d.ts.map