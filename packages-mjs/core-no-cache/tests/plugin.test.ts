/**
 * @file Tests for no-cache plugin
 */

import Fastify, { type FastifyInstance } from 'fastify';
import { beforeEach, describe, expect, it } from 'vitest';
import noCachePlugin from '../src/plugin.js';

describe('No-Cache Plugin', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    server = Fastify();
  });

  it('should set no-cache headers on responses when enabled', async () => {
    // Register plugin with default options (enabled: true)
    await server.register(noCachePlugin);

    // Add a test route
    server.get('/test', async () => {
      return { message: 'test' };
    });

    // Make a request
    const response = await server.inject({
      method: 'GET',
      url: '/test',
    });

    // Verify response is successful
    expect(response.statusCode).toBe(200);

    // Verify no-cache headers are set
    expect(response.headers['cache-control']).toBe('no-cache, no-store, must-revalidate');
    expect(response.headers['pragma']).toBe('no-cache');
    expect(response.headers['expires']).toBe('0');

    await server.close();
  });

  it('should not set no-cache headers when disabled', async () => {
    // Register plugin with disabled option
    await server.register(noCachePlugin, { enabled: false });

    // Add a test route
    server.get('/test', async () => {
      return { message: 'test' };
    });

    // Make a request
    const response = await server.inject({
      method: 'GET',
      url: '/test',
    });

    // Verify response is successful
    expect(response.statusCode).toBe(200);

    // Verify no-cache headers are NOT set
    expect(response.headers['cache-control']).toBeUndefined();
    expect(response.headers['pragma']).toBeUndefined();
    expect(response.headers['expires']).toBeUndefined();

    await server.close();
  });

  it('should override existing Cache-Control headers', async () => {
    // Register plugin
    await server.register(noCachePlugin);

    // Add a route that sets its own Cache-Control header
    server.get('/test', async (request, reply) => {
      reply.header('Cache-Control', 'public, max-age=3600');
      return { message: 'test' };
    });

    // Make a request
    const response = await server.inject({
      method: 'GET',
      url: '/test',
    });

    // Verify response is successful
    expect(response.statusCode).toBe(200);

    // Verify no-cache headers override the route's header
    expect(response.headers['cache-control']).toBe('no-cache, no-store, must-revalidate');

    await server.close();
  });

  it('should set headers on all routes', async () => {
    // Register plugin
    await server.register(noCachePlugin);

    // Add multiple routes
    server.get('/route1', async () => ({ data: 'route1' }));
    server.post('/route2', async () => ({ data: 'route2' }));
    server.get('/api/route3', async () => ({ data: 'route3' }));

    // Test each route
    for (const [method, url] of [
      ['GET', '/route1'],
      ['POST', '/route2'],
      ['GET', '/api/route3'],
    ] as const) {
      const response = await server.inject({
        method,
        url,
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['cache-control']).toBe('no-cache, no-store, must-revalidate');
      expect(response.headers['pragma']).toBe('no-cache');
      expect(response.headers['expires']).toBe('0');
    }

    await server.close();
  });

  it('should decorate fastify instance with noCacheResult when enabled', async () => {
    // Register plugin
    await server.register(noCachePlugin, { enabled: true });

    // Verify decoration
    expect(server.noCacheResult).toBeDefined();
    expect(server.noCacheResult?.success).toBe(true);
    expect(server.noCacheResult?.enabled).toBe(true);

    await server.close();
  });

  it('should decorate fastify instance with noCacheResult when disabled', async () => {
    // Register plugin
    await server.register(noCachePlugin, { enabled: false });

    // Verify decoration
    expect(server.noCacheResult).toBeDefined();
    expect(server.noCacheResult?.success).toBe(true);
    expect(server.noCacheResult?.enabled).toBe(false);

    await server.close();
  });
});
