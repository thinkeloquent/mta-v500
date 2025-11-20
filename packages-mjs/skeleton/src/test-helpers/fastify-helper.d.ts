import type { FastifyServerOptions } from 'fastify';
import { type FastifyInstance } from 'fastify';
/**
 * Create a Fastify test instance with common configuration
 */
export declare function createTestFastifyInstance(options?: FastifyServerOptions): FastifyInstance;
/**
 * Setup and teardown helper for Fastify tests
 */
export declare function withFastify<T>(callback: (fastify: FastifyInstance) => Promise<T>, options?: FastifyServerOptions): Promise<T>;
//# sourceMappingURL=fastify-helper.d.ts.map