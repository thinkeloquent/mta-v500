/**
 * Auth Service Module
 * Provides simple token-based authentication
 *
 * @param {object} fastify - Fastify instance
 * @param {object} options - Plugin options passed from server.mjs appOptions.authService
 * @param {string} [options.tokenSecret] - Secret for token validation
 * @param {number} [options.tokenExpiry] - Token expiry time in seconds (default: 3600)
 * @param {string} [options.validToken] - Valid token for demo (default: 'valid-token')
 */
export async function authServiceApp(fastify, options = {}) {
  // Extract options with defaults
  const {
    tokenExpiry = 3600,
    validToken = "valid-token",
  } = options;

  // Log received options for debugging
  fastify.log.debug({ options }, "Auth Service options received");

  // Decorate fastify with an auth check function
  fastify.decorate("verifyAuth", async (token) => {
    return token === validToken;
  });

  fastify.get("/api/auth/login", async (_request, _reply) => {
    return {
      token: validToken,
      expiresIn: tokenExpiry,
    };
  });

  fastify.get("/api/auth/verify", async (request, _reply) => {
    const token = request.headers.authorization?.replace("Bearer ", "");
    const isValid = token === validToken;

    return {
      valid: isValid,
      message: isValid ? "Token is valid" : "Invalid token",
    };
  });

  fastify.log.info("✅ Auth Service loaded");
}
