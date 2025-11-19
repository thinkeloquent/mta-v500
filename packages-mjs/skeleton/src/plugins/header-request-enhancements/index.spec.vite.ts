import { describe, expect, it } from 'vitest';
import { createTestFastifyInstance } from '../../test-helpers/fastify-helper.js';
import { headerRequestEnhancements } from './index.js';

describe('Header Request Enhancements Plugin', () => {
  describe('Plugin Registration', () => {
    it('should register successfully with default config', async () => {
      const fastify = createTestFastifyInstance();

      await expect(fastify.register(headerRequestEnhancements)).resolves.not.toThrow();

      await fastify.close();
    });

    it('should register with custom config', async () => {
      const fastify = createTestFastifyInstance();

      await expect(
        fastify.register(headerRequestEnhancements, {
          corsUseAnyHost: true,
          rateLimitMax: 200,
        }),
      ).resolves.not.toThrow();

      await fastify.close();
    });

    it('should register with plugins disabled', async () => {
      const fastify = createTestFastifyInstance();

      await expect(
        fastify.register(headerRequestEnhancements, {
          plugins: {
            sensible: false,
            etag: false,
            helmet: false,
            rateLimit: false,
            cors: false,
            compress: false,
            formbody: false,
            multipart: false,
          },
        }),
      ).resolves.not.toThrow();

      await fastify.close();
    });
  });

  describe('Sensible Plugin', () => {
    it('should register sensible plugin when enabled', async () => {
      const fastify = createTestFastifyInstance();

      await expect(
        fastify.register(headerRequestEnhancements, {
          plugins: { sensible: true },
        }),
      ).resolves.not.toThrow();

      await fastify.close();
    });
  });

  describe('ETag Plugin', () => {
    it('should register ETag plugin when enabled', async () => {
      const fastify = createTestFastifyInstance();

      await expect(
        fastify.register(headerRequestEnhancements, {
          plugins: {
            etag: true,
          },
        }),
      ).resolves.not.toThrow();

      await fastify.close();
    });
  });

  describe('CORS Plugin', () => {
    it('should register with corsUseAnyHost mode', async () => {
      const fastify = createTestFastifyInstance();

      await expect(
        fastify.register(headerRequestEnhancements, {
          corsUseAnyHost: true,
          plugins: {
            cors: true,
          },
        }),
      ).resolves.not.toThrow();

      await fastify.close();
    });

    it('should register with corsUseOrigin mode', async () => {
      const fastify = createTestFastifyInstance();

      await expect(
        fastify.register(headerRequestEnhancements, {
          corsUseOrigin: true,
          plugins: {
            cors: true,
          },
        }),
      ).resolves.not.toThrow();

      await fastify.close();
    });
  });

  describe('Rate Limit Plugin', () => {
    it('should register rate limiting with custom config', async () => {
      const fastify = createTestFastifyInstance();

      await expect(
        fastify.register(headerRequestEnhancements, {
          rateLimitMax: 100,
          rateLimitTimeWindow: '1 minute',
          plugins: {
            rateLimit: true,
          },
        }),
      ).resolves.not.toThrow();

      await fastify.close();
    });
  });

  describe('Formbody Plugin', () => {
    it('should register formbody plugin when enabled', async () => {
      const fastify = createTestFastifyInstance();

      await expect(
        fastify.register(headerRequestEnhancements, {
          plugins: {
            formbody: true,
          },
        }),
      ).resolves.not.toThrow();

      await fastify.close();
    });
  });

  describe('Compress Plugin', () => {
    it('should register compress plugin when enabled', async () => {
      const fastify = createTestFastifyInstance();

      await expect(
        fastify.register(headerRequestEnhancements, {
          plugins: {
            compress: true,
          },
        }),
      ).resolves.not.toThrow();

      await fastify.close();
    });
  });

  describe('Configuration Validation', () => {
    it('should handle empty options object', async () => {
      const fastify = createTestFastifyInstance();

      await expect(fastify.register(headerRequestEnhancements, {})).resolves.not.toThrow();

      await fastify.close();
    });

    it('should merge custom config with defaults', async () => {
      const fastify = createTestFastifyInstance();

      await expect(
        fastify.register(headerRequestEnhancements, {
          rateLimitMax: 500,
          // Other options should use defaults
        }),
      ).resolves.not.toThrow();

      await fastify.close();
    });
  });
});
