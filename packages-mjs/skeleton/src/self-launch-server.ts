import { createServer, launchServer } from './index.js';

// Create Fastify instance with default configuration
const fastify = await createServer();

// Hello World route
fastify.get('/', async () => {
  return { message: 'Hello World!' };
});

// Health check endpoint
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Launch server with environment configuration
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const host = process.env.HOST || '0.0.0.0';

await launchServer(fastify, { port, host });
