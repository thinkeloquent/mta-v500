/**
 * Main Server Entry Point (Auto-starter)
 *
 * This file serves as the main entry point for starting the server.
 * It uses launch.mjs for all initialization and startup logic.
 *
 * For custom server configurations or extensions, import from launch.mjs:
 *
 *   import { createMainServer, startServer } from './launch.mjs';
 *
 *   const { fastify, config, databaseUrl } = await createMainServer();
 *   // Add custom plugins, routes, etc.
 *   await startServer(fastify);
 *
 * Or use initializeServer for full initialization with customization:
 *
 *   import { initializeServer, startServer } from './launch.mjs';
 *
 *   const { fastify } = await initializeServer({
 *     skipExternalApps: true,  // Skip loading from config
 *   });
 *   // Add custom logic
 *   await startServer(fastify);
 */

import { bootstrap } from './launch.mjs';

// =============================================================================
// App Options Configuration
// =============================================================================
// These options are passed down to individual app plugins during registration.
// Each namespace corresponds to an app defined in getDefaultApps().
//
// Available namespaces:
//   - authService: Options for auth-service plugin
//   - userService: Options for user-service plugin
//   - aiSdkChat: Options for ai-sdk-chat plugin
// =============================================================================

const appOptions = {
  // Auth service options
  authService: {
    // tokenSecret: process.env.AUTH_TOKEN_SECRET,
    // tokenExpiry: 3600,
  },

  // User service options
  userService: {
    // requireAuth: true,
  },

  // AI SDK Chat options
  aiSdkChat: {
    // Override default prefixes if needed:
    // apiPrefix: '/api/ai-sdk-chat',
    // frontendPrefix: '/apps/ai-sdk-chat',
  },
};

// Bootstrap and start the server
try {
  await bootstrap({
    internalAppsOptions: appOptions,
  });
} catch (error) {
  console.error('❌ Failed to start server:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
}
