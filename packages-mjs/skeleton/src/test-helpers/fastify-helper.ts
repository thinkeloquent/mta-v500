import type { FastifyServerOptions } from 'fastify';
import Fastify, { type FastifyInstance } from 'fastify';

/**
 * Create a Fastify test instance with common configuration
 */
export function createTestFastifyInstance(options?: FastifyServerOptions): FastifyInstance {
  return Fastify({
    logger: false, // Disable logging in tests
    ...options,
  });
}

/**
 * Setup and teardown helper for Fastify tests
 */
export async function withFastify<T>(
  callback: (fastify: FastifyInstance) => Promise<T>,
  options?: FastifyServerOptions,
): Promise<T> {
  const fastify = createTestFastifyInstance(options);

  try {
    const result = await callback(fastify);
    return result;
  } finally {
    await fastify.close();
  }
}
