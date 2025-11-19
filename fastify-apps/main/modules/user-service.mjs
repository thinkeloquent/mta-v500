/**
 * User Service Module
 * Provides user management endpoints (requires auth)
 */

export async function userServiceApp(fastify) {
  fastify.get('/api/users', async (request, reply) => {
    // Use auth decorator from auth-service
    const token = request.headers.authorization?.replace('Bearer ', '');
    const isAuth = await fastify.verifyAuth(token || '');

    if (!isAuth) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    return {
      users: [
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' },
      ],
    };
  });

  console.log('✅ User Service loaded');
}
