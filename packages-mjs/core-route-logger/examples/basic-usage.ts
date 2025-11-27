/**
 * Basic usage example for @internal/core-route-logger
 *
 * To run this example:
 * 1. Build the module: npm run build
 * 2. Run: npx tsx examples/basic-usage.ts
 */

import Fastify from 'fastify';
import routeLogger from '../dist/index.js';

async function main() {
  // Create Fastify instance
  const server = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
      },
    },
  });

  // Register the route logger plugin
  // Routes will be logged when the server is ready
  await server.register(routeLogger, {
    enabled: true,
    outputPath: './examples/routes.log',
    consoleOutput: true,
    fileOutput: true,
    prettyPrint: true,
    includeTimestamp: true,
  });

  // Register some example routes
  server.get('/', async () => {
    return { message: 'Welcome to the API' };
  });

  server.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // User routes
  server.get('/api/users', async () => {
    return { users: [] };
  });

  server.post('/api/users', async (request) => {
    return { created: true, user: request.body };
  });

  server.get('/api/users/:id', async (request) => {
    const params = request.params as { id: string };
    return { user: { id: params.id } };
  });

  server.put('/api/users/:id', async (request) => {
    const params = request.params as { id: string };
    return { updated: true, user: { id: params.id } };
  });

  server.delete('/api/users/:id', async (request) => {
    const params = request.params as { id: string };
    return { deleted: true, userId: params.id };
  });

  // Post routes
  server.get('/api/posts', async () => {
    return { posts: [] };
  });

  server.get('/api/posts/:id', async (request) => {
    const params = request.params as { id: string };
    return { post: { id: params.id } };
  });

  server.post('/api/posts', async (request) => {
    return { created: true, post: request.body };
  });

  // Start server
  const port = 3000;
  await server.listen({ port, host: '0.0.0.0' });

  console.log(`\n✅ Server started on http://localhost:${port}`);
  console.log(`📝 Routes logged to: ./examples/routes.log`);
  console.log(`📊 Total routes: ${server.routeLogResult?.routeCount}`);
  console.log(`\nPress Ctrl+C to stop the server\n`);
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
