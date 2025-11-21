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

// Bootstrap and start the server
try {
  await bootstrap();
} catch (error) {
  console.error('❌ Failed to start server:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
}
