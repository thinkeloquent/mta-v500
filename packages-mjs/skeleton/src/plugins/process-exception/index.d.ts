import type { FastifyPluginAsync } from 'fastify';
import type { ProcessExceptionOptions } from './types.js';
/**
 * Declare the gracefulShutdown decorator on Fastify instance
 */
declare module 'fastify' {
    interface FastifyInstance {
        gracefulShutdown(): Promise<void>;
    }
}
export declare const processExceptionHandlers: FastifyPluginAsync<ProcessExceptionOptions>;
export default processExceptionHandlers;
//# sourceMappingURL=index.d.ts.map