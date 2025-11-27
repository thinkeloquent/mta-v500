/**
 * Fastify Server Launcher
 *
 * This module re-exports all server initialization and launch functionality
 * from @internal/fastify-main, providing a clean public API for external modules
 * to import and launch the server.
 *
 * Usage:
 *   import { bootstrap, initializeServer, startServer } from '@internal/fastify-server';
 *
 *   // Option 1: Full bootstrap with custom options
 *   await bootstrap({
 *     internalAppsOptions: {
 *       aiSdkChat: { getModelForRequest: customResolver }
 *     }
 *   });
 *
 *   // Option 2: Custom initialization
 *   const { fastify, config } = await createMainServer();
 *   // Add custom plugins/routes
 *   await startServer(fastify);
 */

// Re-export all server functions from fastify-main
export {
  // Server lifecycle
  bootstrap,
  createMainServer,
  initializeServer,
  startServer,

  // Configuration
  buildDatabaseUrl,
  loadConfig,

  // App registration
  getDefaultApps,
  loadExternalApps,
  registerHealthRoutes,
  registerInternalApps,

  // Auth middleware
  registerUnderConstructionAuth,
} from '@internal/fastify-main';
