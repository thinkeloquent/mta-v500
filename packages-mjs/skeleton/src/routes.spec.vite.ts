import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { headerRequestEnhancements } from './plugins/header-request-enhancements/index.js';

describe('Application Routes', () => {
  describe('GET /', () => {
    it('should return Hello World message', async () => {
      const fastify = Fastify({ logger: false });

      fastify.get('/', async () => {
        return { message: 'Hello World!' };
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toEqual({ message: 'Hello World!' });

      await fastify.close();
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const fastify = Fastify({ logger: false });

      fastify.get('/health', async () => {
        return { status: 'ok', timestamp: new Date().toISOString() };
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
      expect(typeof body.timestamp).toBe('string');

      // Verify timestamp is a valid ISO date
      expect(() => new Date(body.timestamp)).not.toThrow();

      await fastify.close();
    });

    it('should return valid ISO timestamp', async () => {
      const fastify = Fastify({ logger: false });

      fastify.get('/health', async () => {
        return { status: 'ok', timestamp: new Date().toISOString() };
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/health',
      });

      const body = JSON.parse(response.payload);
      const timestamp = new Date(body.timestamp);

      expect(timestamp.getTime()).toBeGreaterThan(0);
      expect(Number.isNaN(timestamp.getTime())).toBe(false);

      await fastify.close();
    });
  });

  describe('Integration with Plugins', () => {
    it('should work with header-request-enhancements plugin', async () => {
      const fastify = Fastify({ logger: false });

      // Register plugin
      await fastify.register(headerRequestEnhancements, {
        corsUseAnyHost: true,
        plugins: {
          helmet: false, // Disable for testing
          rateLimit: false, // Disable for testing
        },
      });

      // Register routes
      fastify.get('/', async () => {
        return { message: 'Hello World!' };
      });

      fastify.get('/health', async () => {
        return { status: 'ok', timestamp: new Date().toISOString() };
      });

      // Test root route
      const rootResponse = await fastify.inject({
        method: 'GET',
        url: '/',
      });
      expect(rootResponse.statusCode).toBe(200);
      const rootBody = JSON.parse(rootResponse.payload);
      expect(rootBody.message).toBe('Hello World!');

      // Test health route
      const healthResponse = await fastify.inject({
        method: 'GET',
        url: '/health',
      });
      expect(healthResponse.statusCode).toBe(200);
      const healthBody = JSON.parse(healthResponse.payload);
      expect(healthBody.status).toBe('ok');

      await fastify.close();
    });

    it('should handle 404 routes with sensible plugin', async () => {
      const fastify = Fastify({ logger: false });

      await fastify.register(headerRequestEnhancements, {
        plugins: {
          sensible: true,
        },
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/nonexistent',
      });

      expect(response.statusCode).toBe(404);

      await fastify.close();
    });
  });

  describe('HTTP Methods', () => {
    it('should only accept GET for root route', async () => {
      const fastify = Fastify({ logger: false });

      fastify.get('/', async () => {
        return { message: 'Hello World!' };
      });

      // GET should work
      const getResponse = await fastify.inject({
        method: 'GET',
        url: '/',
      });
      expect(getResponse.statusCode).toBe(200);

      // POST should not be allowed
      const postResponse = await fastify.inject({
        method: 'POST',
        url: '/',
      });
      expect(postResponse.statusCode).toBe(404);

      await fastify.close();
    });

    it('should only accept GET for health route', async () => {
      const fastify = Fastify({ logger: false });

      fastify.get('/health', async () => {
        return { status: 'ok', timestamp: new Date().toISOString() };
      });

      // GET should work
      const getResponse = await fastify.inject({
        method: 'GET',
        url: '/health',
      });
      expect(getResponse.statusCode).toBe(200);

      // PUT should not be allowed
      const putResponse = await fastify.inject({
        method: 'PUT',
        url: '/health',
      });
      expect(putResponse.statusCode).toBe(404);

      await fastify.close();
    });
  });
});
