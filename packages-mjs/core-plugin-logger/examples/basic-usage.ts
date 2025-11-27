/**
 * Basic usage example for @internal/core-plugin-logger
 *
 * To run this example:
 * 1. Build the module: npm run build
 * 2. Run: npx tsx examples/basic-usage.ts
 */

import Fastify from 'fastify';
import pluginLogger from '../dist/index.js';

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

  // Register some example plugins first
  // (These are just for demonstration - we'll register some routes as plugins)
  await server.register(
    async function examplePlugin1(fastify) {
      fastify.get('/plugin1', async () => {
        return { message: 'From plugin 1' };
      });
    },
    { name: 'example-plugin-1' },
  );

  await server.register(
    async function examplePlugin2(fastify) {
      fastify.get('/plugin2', async () => {
        return { message: 'From plugin 2' };
      });
    },
    { name: 'example-plugin-2' },
  );

  // Register the plugin logger plugin
  // Plugins will be logged when the server is ready
  await server.register(pluginLogger, {
    enabled: true,
    outputPath: './examples/plugins.log',
    consoleOutput: true,
    fileOutput: true,
    prettyPrint: true,
    includeTimestamp: true,
  });

  // Register some additional plugins
  await server.register(
    async function examplePlugin3(fastify) {
      fastify.get('/plugin3', async () => {
        return { message: 'From plugin 3' };
      });
    },
    { name: 'example-plugin-3' },
  );

  // Start server
  const port = 3000;
  await server.listen({ port, host: '0.0.0.0' });

  console.log(`\n✅ Server started on http://localhost:${port}`);
  console.log(`📝 Plugins logged to: ./examples/plugins.log`);
  console.log(`📊 Total plugins: ${server.pluginLogResult?.pluginCount}`);
  console.log(`\nPress Ctrl+C to stop the server\n`);
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
