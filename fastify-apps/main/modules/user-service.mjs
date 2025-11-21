/**
 * User Service Module
 * Provides user management endpoints (requires auth)
 *
 * @param {object} fastify - Fastify instance
 * @param {object} options - Plugin options passed from server.mjs appOptions.userService
 * @param {boolean} [options.requireAuth] - Whether to require authentication (default: true)
 * @param {Array} [options.mockUsers] - Mock users for demo (default: Alice & Bob)
 */
export async function userServiceApp(fastify, options = {}) {
  // Extract options with defaults
  const {
    requireAuth = true,
    mockUsers = [
      { id: 1, name: "Alice", email: "alice@example.com" },
      { id: 2, name: "Bob", email: "bob@example.com" },
    ],
  } = options;

  // Log received options for debugging
  fastify.log.debug({ options }, "User Service options received");

  fastify.get("/api/users", async (request, reply) => {
    // Use auth decorator from auth-service (if requireAuth is enabled)
    if (requireAuth) {
      const token = request.headers.authorization?.replace("Bearer ", "");
      const isAuth = await fastify.verifyAuth(token || "");

      if (!isAuth) {
        return reply.code(401).send({ error: "Unauthorized" });
      }
    }

    return {
      users: mockUsers,
    };
  });

  fastify.log.info("✅ User Service loaded");
}
