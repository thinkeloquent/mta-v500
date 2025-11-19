/**
 * Auth Service Module
 * Provides simple token-based authentication
 */

export async function authServiceApp(fastify) {
  // Decorate fastify with an auth check function
  fastify.decorate('verifyAuth', async (token) => {
    return token === 'valid-token';
  });

  fastify.get('/api/auth/login', async (_request, _reply) => {
    return {
      token: 'valid-token',
      expiresIn: 3600,
    };
  });

  fastify.get('/api/auth/verify', async (request, _reply) => {
    const token = request.headers.authorization?.replace('Bearer ', '');
    const isValid = token === 'valid-token';

    return {
      valid: isValid,
      message: isValid ? 'Token is valid' : 'Invalid token',
    };
  });

  console.log('✅ Auth Service loaded');
}
