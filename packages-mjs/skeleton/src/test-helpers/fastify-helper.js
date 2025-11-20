import Fastify from 'fastify';
/**
 * Create a Fastify test instance with common configuration
 */
export function createTestFastifyInstance(options) {
    return Fastify({
        logger: false, // Disable logging in tests
        ...options,
    });
}
/**
 * Setup and teardown helper for Fastify tests
 */
export async function withFastify(callback, options) {
    const fastify = createTestFastifyInstance(options);
    try {
        const result = await callback(fastify);
        return result;
    }
    finally {
        await fastify.close();
    }
}
//# sourceMappingURL=fastify-helper.js.map