/**
 * Unit tests for ai-sdk-chat plugin
 *
 * Tests plugin initialization and option validation.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import Fastify from 'fastify';

// Import the plugin directly (not the wrapped version)
import aiSdkChatPluginWrapped, { aiSdkChatPlugin } from './index.mjs';

describe('ai-sdk-chat plugin', () => {
  let fastify;

  beforeEach(() => {
    fastify = Fastify({ logger: false });
  });

  afterEach(async () => {
    await fastify.close();
  });

  describe('option validation', () => {
    it('should throw error when getModelForRequest is missing', async () => {
      await assert.rejects(
        async () => {
          await fastify.register(aiSdkChatPlugin, {});
        },
        {
          message: 'ai-sdk-chat plugin requires getModelForRequest option',
        }
      );
    });

    it('should throw error when getModelForRequest is not a function', async () => {
      await assert.rejects(
        async () => {
          await fastify.register(aiSdkChatPlugin, {
            getModelForRequest: 'not-a-function',
          });
        },
        {
          message: 'getModelForRequest must be a function',
        }
      );
    });

    it('should throw error when getModelForRequest is null', async () => {
      await assert.rejects(
        async () => {
          await fastify.register(aiSdkChatPlugin, {
            getModelForRequest: null,
          });
        },
        {
          message: 'ai-sdk-chat plugin requires getModelForRequest option',
        }
      );
    });

    it('should throw error when getModelForRequest is undefined', async () => {
      await assert.rejects(
        async () => {
          await fastify.register(aiSdkChatPlugin, {
            getModelForRequest: undefined,
          });
        },
        {
          message: 'ai-sdk-chat plugin requires getModelForRequest option',
        }
      );
    });

    it('should accept valid getModelForRequest function', async () => {
      const mockGetModelForRequest = () => ({
        chatModel: () => ({}),
      });

      // Should not throw
      await fastify.register(aiSdkChatPlugin, {
        getModelForRequest: mockGetModelForRequest,
      });

      await fastify.ready();
    });
  });

  describe('route registration', () => {
    it('should register health check endpoint', async () => {
      const mockGetModelForRequest = () => ({});

      await fastify.register(aiSdkChatPlugin, {
        getModelForRequest: mockGetModelForRequest,
      });

      await fastify.ready();

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/ai-sdk-chat',
      });

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.status, 'ok');
      assert.strictEqual(body.service, 'ai-sdk-chat');
    });

    it('should register all streaming endpoints', async () => {
      const mockGetModelForRequest = () => ({});

      await fastify.register(aiSdkChatPlugin, {
        getModelForRequest: mockGetModelForRequest,
      });

      await fastify.ready();

      const routes = fastify.printRoutes();

      // Check that all expected routes are registered
      const expectedRoutes = [
        '/api/ai-sdk-chat',
        '/api/ai-sdk-chat/stream-protocol',
        '/api/ai-sdk-chat/stream-text',
        '/api/ai-sdk-chat/stream-custom',
        '/api/ai-sdk-chat/stream-protocol-prompt',
        '/api/ai-sdk-chat/stream-text-prompt',
        '/api/ai-sdk-chat/stream-custom-prompt',
      ];

      for (const route of expectedRoutes) {
        assert.ok(
          routes.includes(route),
          `Expected route ${route} to be registered`
        );
      }
    });
  });
});

// Run tests if executed directly
if (process.argv[1]?.endsWith('index.test.mjs')) {
  console.log('Running ai-sdk-chat plugin tests...');
}
