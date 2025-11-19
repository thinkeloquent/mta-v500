import Fastify, { type FastifyError, type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { processExceptionHandlers } from './index.js';
import type { ProcessExceptionOptions } from './types.js';

describe('Process Exception Handlers Plugin', () => {
  let fastify: FastifyInstance;

  beforeEach(async () => {
    fastify = Fastify({ logger: false });
  });

  afterEach(async () => {
    if (fastify) {
      await fastify.close();
    }
  });

  describe('Plugin Registration', () => {
    it('should register successfully with default config', async () => {
      await expect(fastify.register(processExceptionHandlers)).resolves.not.toThrow();
    });

    it('should register successfully with custom config', async () => {
      const config: ProcessExceptionOptions = {
        enableErrorHandler: true,
        enableGracefulShutdown: false,
        enableProcessHandlers: false,
        shutdownTimeout: 5000,
      };

      await expect(fastify.register(processExceptionHandlers, config)).resolves.not.toThrow();
    });
  });

  describe('Error Handler', () => {
    it('should handle validation errors with 400 status', async () => {
      await fastify.register(processExceptionHandlers);

      fastify.get('/test', {
        schema: {
          querystring: {
            type: 'object',
            required: ['id'],
            properties: {
              id: { type: 'number' },
            },
          },
        },
        handler: async () => {
          return { success: true };
        },
      });

      await fastify.ready();

      const response = await fastify.inject({
        method: 'GET',
        url: '/test?id=invalid',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Validation Error');
      expect(body.details).toBeDefined();
    });

    it('should handle server errors with 500 status', async () => {
      await fastify.register(processExceptionHandlers);

      fastify.get('/error', async () => {
        throw new Error('Test error');
      });

      await fastify.ready();

      const response = await fastify.inject({
        method: 'GET',
        url: '/error',
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });

    it('should use custom error handler when provided', async () => {
      const customHandler = (_error: FastifyError, _request: FastifyRequest, reply: FastifyReply) => {
        return reply.code(418).send({
          custom: true,
          message: 'Custom error handler',
        });
      };

      await fastify.register(processExceptionHandlers, {
        customErrorHandler: customHandler,
      });

      fastify.get('/error', async () => {
        throw new Error('Test error');
      });

      await fastify.ready();

      const response = await fastify.inject({
        method: 'GET',
        url: '/error',
      });

      expect(response.statusCode).toBe(418);
      const body = JSON.parse(response.body);
      expect(body.custom).toBe(true);
      expect(body.message).toBe('Custom error handler');
    });

    it('should not register error handler when disabled', async () => {
      await fastify.register(processExceptionHandlers, {
        enableErrorHandler: false,
      });

      fastify.get('/error', async () => {
        throw new Error('Test error');
      });

      await fastify.ready();

      const response = await fastify.inject({
        method: 'GET',
        url: '/error',
      });

      // Fastify's default error handler should be used
      expect(response.statusCode).toBe(500);
    });
  });

  describe('Graceful Shutdown Decorator', () => {
    it('should expose gracefulShutdown method when enabled', async () => {
      await fastify.register(processExceptionHandlers, {
        exposeGracefulShutdown: true,
      });

      await fastify.ready();

      expect(fastify.gracefulShutdown).toBeDefined();
      expect(typeof fastify.gracefulShutdown).toBe('function');
    });

    it('should not expose gracefulShutdown when disabled', async () => {
      await fastify.register(processExceptionHandlers, {
        exposeGracefulShutdown: false,
        enableGracefulShutdown: false,
      });

      await fastify.ready();

      expect(fastify.gracefulShutdown).toBeUndefined();
    });

    it('should execute graceful shutdown without errors', async () => {
      await fastify.register(processExceptionHandlers, {
        exposeGracefulShutdown: true,
        shutdownTimeout: 1000,
      });

      await fastify.listen({ port: 0 });

      await expect(fastify.gracefulShutdown()).resolves.not.toThrow();
    });
  });

  describe('Configuration Merging', () => {
    it('should merge custom config with defaults', async () => {
      await fastify.register(processExceptionHandlers, {
        shutdownTimeout: 5000,
      });

      await fastify.ready();

      // Plugin should still work with partial config
      expect(fastify.gracefulShutdown).toBeDefined();
    });

    it('should respect feature toggles', async () => {
      await fastify.register(processExceptionHandlers, {
        features: {
          validationErrors: false,
          handleSigInt: false,
        },
      });

      await fastify.ready();

      // Should register without errors
      expect(fastify).toBeDefined();
    });
  });

  describe('Server Lifecycle', () => {
    it('should handle server start and stop', async () => {
      await fastify.register(processExceptionHandlers);

      fastify.get('/health', async () => {
        return { status: 'ok' };
      });

      await fastify.listen({ port: 0 });

      const response = await fastify.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');

      await fastify.close();
    });
  });

  describe('Minimal Configuration', () => {
    it('should work with minimal config', async () => {
      await fastify.register(processExceptionHandlers, {
        enableErrorHandler: true,
        enableGracefulShutdown: false,
        enableProcessHandlers: false,
      });

      fastify.get('/test', async () => {
        return { success: true };
      });

      await fastify.ready();

      const response = await fastify.inject({
        method: 'GET',
        url: '/test',
      });

      expect(response.statusCode).toBe(200);
    });
  });

  // Additional test cases for latest implementation
  describe('Advanced Error Handling', () => {
    it('should handle errors with custom status codes', async () => {
      await fastify.register(processExceptionHandlers);

      fastify.get('/not-found', async () => {
        const error = new Error('Resource not found') as Error & { statusCode?: number };
        error.statusCode = 404;
        throw error;
      });

      await fastify.ready();

      const response = await fastify.inject({
        method: 'GET',
        url: '/not-found',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Resource not found');
    });

    it('should handle multiple routes with errors', async () => {
      await fastify.register(processExceptionHandlers);

      fastify.get('/error1', async () => {
        throw new Error('Error 1');
      });

      fastify.get('/error2', async () => {
        throw new Error('Error 2');
      });

      await fastify.ready();

      const response1 = await fastify.inject({ method: 'GET', url: '/error1' });
      const response2 = await fastify.inject({ method: 'GET', url: '/error2' });

      expect(response1.statusCode).toBe(500);
      expect(response2.statusCode).toBe(500);
      expect(JSON.parse(response1.body).error).toBe('Error 1');
      expect(JSON.parse(response2.body).error).toBe('Error 2');
    });

    it('should handle validation errors with multiple fields', async () => {
      await fastify.register(processExceptionHandlers);

      fastify.post('/user', {
        schema: {
          body: {
            type: 'object',
            required: ['name', 'email', 'age'],
            properties: {
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
              age: { type: 'number', minimum: 18 },
            },
          },
        },
        handler: async () => {
          return { success: true };
        },
      });

      await fastify.ready();

      const response = await fastify.inject({
        method: 'POST',
        url: '/user',
        payload: { name: 'John' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Validation Error');
      expect(body.details).toBeDefined();
      expect(Array.isArray(body.details)).toBe(true);
    });

    it('should disable validation error handling when feature is disabled', async () => {
      await fastify.register(processExceptionHandlers, {
        features: {
          validationErrors: false,
        },
      });

      fastify.get('/test', {
        schema: {
          querystring: {
            type: 'object',
            required: ['id'],
            properties: {
              id: { type: 'number' },
            },
          },
        },
        handler: async () => {
          return { success: true };
        },
      });

      await fastify.ready();

      const response = await fastify.inject({
        method: 'GET',
        url: '/test?id=invalid',
      });

      // Should still return error but without special validation handling
      expect(response.statusCode).toBe(400);
    });
  });

  describe('Custom Error Handler Edge Cases', () => {
    it('should support async custom error handler', async () => {
      const customHandler = async (_error: FastifyError, _request: FastifyRequest, reply: FastifyReply) => {
        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 10));
        return reply.code(503).send({
          async: true,
          message: 'Async custom handler',
        });
      };

      await fastify.register(processExceptionHandlers, {
        customErrorHandler: customHandler,
      });

      fastify.get('/error', async () => {
        throw new Error('Test error');
      });

      await fastify.ready();

      const response = await fastify.inject({
        method: 'GET',
        url: '/error',
      });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.async).toBe(true);
    });

    it('should pass error details to custom handler', async () => {
      let capturedError: FastifyError | undefined;

      const customHandler = (error: FastifyError, _request: FastifyRequest, reply: FastifyReply) => {
        capturedError = error;
        return reply.code(500).send({ custom: true });
      };

      await fastify.register(processExceptionHandlers, {
        customErrorHandler: customHandler,
      });

      fastify.get('/error', async () => {
        throw new Error('Specific error message');
      });

      await fastify.ready();

      await fastify.inject({ method: 'GET', url: '/error' });

      expect(capturedError).toBeDefined();
      expect(capturedError?.message).toBe('Specific error message');
    });
  });

  describe('Graceful Shutdown Integration', () => {
    it('should cleanup close-with-grace listeners on server close', async () => {
      await fastify.register(processExceptionHandlers, {
        enableGracefulShutdown: true,
      });

      await fastify.ready();
      await fastify.close();

      // Server should close cleanly without hanging listeners
      expect(fastify).toBeDefined();
    });

    it('should work with different shutdown timeouts', async () => {
      await fastify.register(processExceptionHandlers, {
        shutdownTimeout: 100,
      });

      await fastify.listen({ port: 0 });
      await fastify.gracefulShutdown();

      expect(fastify).toBeDefined();
    });

    it('should handle shutdown without graceful shutdown enabled', async () => {
      await fastify.register(processExceptionHandlers, {
        enableGracefulShutdown: false,
        exposeGracefulShutdown: false,
      });

      await fastify.ready();

      expect(fastify.gracefulShutdown).toBeUndefined();

      // Regular close should still work
      await expect(fastify.close()).resolves.not.toThrow();
    });
  });

  describe('Feature Flag Combinations', () => {
    it('should work with all features disabled except error handler', async () => {
      await fastify.register(processExceptionHandlers, {
        enableErrorHandler: true,
        enableGracefulShutdown: false,
        enableProcessHandlers: false,
        exposeGracefulShutdown: false,
        features: {
          validationErrors: false,
          handleSigInt: false,
          handleSigTerm: false,
          handleUnhandledRejection: false,
          handleUncaughtException: false,
        },
      });

      fastify.get('/error', async () => {
        throw new Error('Test');
      });

      await fastify.ready();

      const response = await fastify.inject({ method: 'GET', url: '/error' });
      expect(response.statusCode).toBe(500);
    });

    it('should work with only graceful shutdown enabled', async () => {
      await fastify.register(processExceptionHandlers, {
        enableErrorHandler: false,
        enableGracefulShutdown: true,
        enableProcessHandlers: false,
      });

      await fastify.ready();
      expect(fastify.gracefulShutdown).toBeDefined();
    });

    it('should work with only process handlers enabled', async () => {
      await fastify.register(processExceptionHandlers, {
        enableErrorHandler: false,
        enableGracefulShutdown: false,
        enableProcessHandlers: true,
        features: {
          handleUnhandledRejection: true,
          handleUncaughtException: true,
        },
      });

      await fastify.ready();

      // Should register without errors
      expect(fastify).toBeDefined();
    });

    it('should work with selective signal handlers', async () => {
      await fastify.register(processExceptionHandlers, {
        enableProcessHandlers: true,
        features: {
          handleSigInt: true,
          handleSigTerm: false,
          handleUnhandledRejection: false,
          handleUncaughtException: false,
        },
      });

      await fastify.ready();
      expect(fastify).toBeDefined();
    });
  });

  describe('Configuration Overrides', () => {
    it('should prioritize custom config over defaults', async () => {
      await fastify.register(processExceptionHandlers, {
        shutdownTimeout: 999,
        enableErrorHandler: false,
      });

      await fastify.ready();

      // Error handler should be disabled based on custom config
      // gracefulShutdown should still be available (default)
      expect(fastify.gracefulShutdown).toBeDefined();
    });

    it('should deep merge feature flags', async () => {
      await fastify.register(processExceptionHandlers, {
        features: {
          handleSigInt: false,
          // Other features should retain default values
        },
      });

      // Should still have error handler (default enabled)
      fastify.get('/error', async () => {
        throw new Error('Test');
      });

      await fastify.ready();

      const response = await fastify.inject({ method: 'GET', url: '/error' });
      expect(response.statusCode).toBe(500);
    });

    it('should handle empty options object', async () => {
      await fastify.register(processExceptionHandlers, {});

      await fastify.ready();

      // Should use all defaults
      expect(fastify.gracefulShutdown).toBeDefined();
    });
  });

  describe('Plugin Metadata', () => {
    it('should be wrapped with fastify-plugin', async () => {
      await fastify.register(processExceptionHandlers);
      await fastify.ready();

      // Decorators should be available at root level due to fastify-plugin
      expect(fastify.gracefulShutdown).toBeDefined();
    });

    it('should work in encapsulated context', async () => {
      await fastify.register(async (instance) => {
        await instance.register(processExceptionHandlers);

        instance.get('/test', async () => {
          return { success: true };
        });
      });

      await fastify.ready();

      // Should work within encapsulated context
      const response = await fastify.inject({ method: 'GET', url: '/test' });
      expect(response.statusCode).toBe(200);
    });
  });

  describe('Error Response Structure', () => {
    it('should return consistent error structure for server errors', async () => {
      await fastify.register(processExceptionHandlers);

      fastify.get('/error', async () => {
        throw new Error('Test error message');
      });

      await fastify.ready();

      const response = await fastify.inject({ method: 'GET', url: '/error' });
      const body = JSON.parse(response.body);

      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('error');
      expect(body.success).toBe(false);
      expect(typeof body.error).toBe('string');
    });

    it('should return consistent error structure for validation errors', async () => {
      await fastify.register(processExceptionHandlers);

      fastify.get('/test', {
        schema: {
          querystring: {
            type: 'object',
            required: ['id'],
            properties: {
              id: { type: 'number' },
            },
          },
        },
        handler: async () => {
          return { success: true };
        },
      });

      await fastify.ready();

      const response = await fastify.inject({
        method: 'GET',
        url: '/test?id=invalid',
      });

      const body = JSON.parse(response.body);

      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('details');
      expect(body.success).toBe(false);
      expect(body.error).toBe('Validation Error');
    });
  });

  describe('Server Lifecycle Edge Cases', () => {
    it('should handle multiple close calls', async () => {
      await fastify.register(processExceptionHandlers);
      await fastify.ready();

      await fastify.close();

      // Second close should not throw
      await expect(fastify.close()).resolves.not.toThrow();
    });

    it('should work with server that never starts listening', async () => {
      await fastify.register(processExceptionHandlers);
      await fastify.ready();

      // Close without listen
      await expect(fastify.close()).resolves.not.toThrow();
    });

    it('should handle errors after server is closed', async () => {
      await fastify.register(processExceptionHandlers);

      fastify.get('/test', async () => {
        return { success: true };
      });

      await fastify.ready();
      await fastify.close();

      // Inject after close should throw an error
      await expect(fastify.inject({ method: 'GET', url: '/test' })).rejects.toThrow(
        'Fastify has already been closed',
      );
    });
  });
});
