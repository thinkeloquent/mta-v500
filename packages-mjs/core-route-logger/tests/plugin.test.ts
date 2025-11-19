/**
 * Tests for core-route-logger plugin
 */

import Fastify, { type FastifyInstance } from 'fastify';
import { access, unlink } from 'fs/promises';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import routeLogger from '../src/plugin.js';
import type { RouteLoggerOptions } from '../src/types.js';

describe('core-route-logger', () => {
  let server: FastifyInstance;
  const testOutputPath = './test-routes.log';

  beforeEach(async () => {
    server = Fastify({ logger: false });
  });

  afterEach(async () => {
    await server.close();

    // Clean up test file
    try {
      await access(testOutputPath);
      await unlink(testOutputPath);
    } catch {
      // File doesn't exist, ignore
    }
  });

  describe('Plugin Registration', () => {
    it('should register the plugin successfully', async () => {
      await expect(server.register(routeLogger, { enabled: false })).resolves.not.toThrow();
    });

    it('should work with default options', async () => {
      await server.register(routeLogger, {
        enabled: false, // Disable to prevent file creation in tests
      });

      expect(server).toBeDefined();
    });
  });

  describe('Route Logging', () => {
    it('should log routes when server is ready', async () => {
      await server.register(routeLogger, {
        enabled: true,
        outputPath: testOutputPath,
        consoleOutput: false,
        fileOutput: true,
      });

      // Register some test routes
      server.get('/api/users', async () => ({ users: [] }));
      server.post('/api/users', async () => ({ created: true }));
      server.get('/api/posts/:id', async () => ({ post: {} }));

      // Start server to trigger onReady hook
      await server.ready();

      // Wait a bit for file to be written
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check if file was created
      await expect(access(testOutputPath)).resolves.not.toThrow();

      // Check if routeLogResult was decorated
      expect(server.routeLogResult).toBeDefined();
      expect(server.routeLogResult?.success).toBe(true);
      expect(server.routeLogResult?.fileLogged).toBe(true);
      expect(server.routeLogResult?.routeCount).toBeGreaterThan(0);
    });

    it('should skip logging when disabled', async () => {
      await server.register(routeLogger, {
        enabled: false,
        outputPath: testOutputPath,
      });

      server.get('/api/test', async () => ({ test: true }));

      await server.ready();

      // File should not be created when disabled
      await expect(access(testOutputPath)).rejects.toThrow();
    });

    it('should handle consoleOutput only mode', async () => {
      await server.register(routeLogger, {
        enabled: true,
        consoleOutput: true,
        fileOutput: false,
      });

      server.get('/api/test', async () => ({ test: true }));

      await server.ready();

      // Check result
      expect(server.routeLogResult?.consoleLogged).toBe(true);
      expect(server.routeLogResult?.fileLogged).toBe(false);
    });

    it('should handle fileOutput only mode', async () => {
      await server.register(routeLogger, {
        enabled: true,
        outputPath: testOutputPath,
        consoleOutput: false,
        fileOutput: true,
      });

      server.get('/api/test', async () => ({ test: true }));

      await server.ready();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check result
      expect(server.routeLogResult?.consoleLogged).toBe(false);
      expect(server.routeLogResult?.fileLogged).toBe(true);

      // Verify file exists
      await expect(access(testOutputPath)).resolves.not.toThrow();
    });
  });

  describe('Options Validation', () => {
    it('should use default options when not provided', async () => {
      await server.register(routeLogger, {
        enabled: false,
      });

      await server.ready();

      // Should not throw
      expect(server).toBeDefined();
    });

    it('should accept custom output path', async () => {
      const customPath = './custom-routes.log';

      await server.register(routeLogger, {
        enabled: true,
        outputPath: customPath,
        consoleOutput: false,
        fileOutput: true,
      });

      server.get('/test', async () => ({ ok: true }));

      await server.ready();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check custom path was used
      expect(server.routeLogResult?.outputPath).toBe(customPath);

      // Clean up
      try {
        await unlink(customPath);
      } catch {
        // Ignore
      }
    });

    it('should handle prettyPrint option', async () => {
      await server.register(routeLogger, {
        enabled: true,
        prettyPrint: true,
        consoleOutput: false,
        fileOutput: false,
      });

      server.get('/test', async () => ({ ok: true }));

      await server.ready();

      // Should complete without errors
      expect(server.routeLogResult?.success).toBe(true);
    });

    it('should handle includeTimestamp option', async () => {
      await server.register(routeLogger, {
        enabled: true,
        includeTimestamp: true,
        consoleOutput: false,
        fileOutput: false,
      });

      server.get('/test', async () => ({ ok: true }));

      await server.ready();

      // Should complete without errors
      expect(server.routeLogResult?.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid output path gracefully', async () => {
      await server.register(routeLogger, {
        enabled: true,
        outputPath: '/invalid/path/that/does/not/exist/routes.log',
        consoleOutput: false,
        fileOutput: true,
      });

      server.get('/test', async () => ({ ok: true }));

      await server.ready();

      // Should not crash the server
      expect(server).toBeDefined();

      // Result should indicate failure
      if (server.routeLogResult) {
        expect(server.routeLogResult.success).toBe(false);
        expect(server.routeLogResult.error).toBeDefined();
      }
    });

    it('should not prevent server startup on error', async () => {
      await server.register(routeLogger, {
        enabled: true,
        outputPath: '/invalid/path/routes.log',
        consoleOutput: false,
        fileOutput: true,
      });

      server.get('/test', async () => ({ ok: true }));

      // Server should still start successfully
      await expect(server.ready()).resolves.not.toThrow();
    });
  });

  describe('Route Counting', () => {
    it('should count registered routes correctly', async () => {
      await server.register(routeLogger, {
        enabled: true,
        consoleOutput: false,
        fileOutput: false,
      });

      // Register multiple routes
      server.get('/route1', async () => ({ ok: true }));
      server.post('/route2', async () => ({ ok: true }));
      server.put('/route3', async () => ({ ok: true }));
      server.delete('/route4', async () => ({ ok: true }));

      await server.ready();

      // Should count all routes (including any internal routes)
      expect(server.routeLogResult?.routeCount).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Output Modes', () => {
    it('should handle outputMode: "json" (structured JSON only)', async () => {
      await server.register(routeLogger, {
        enabled: true,
        outputMode: 'json',
        consoleOutput: false,
        fileOutput: false,
      });

      server.get('/api/test', async () => ({ test: true }));

      await server.ready();

      // Check result - only logger should be logged
      expect(server.routeLogResult?.loggerLogged).toBe(true);
      expect(server.routeLogResult?.consoleLogged).toBe(false);
      expect(server.routeLogResult?.fileLogged).toBe(false);
    });

    it('should handle outputMode: "both" (pretty + JSON)', async () => {
      await server.register(routeLogger, {
        enabled: true,
        outputMode: 'both',
        outputPath: testOutputPath,
        consoleOutput: true,
        fileOutput: true,
      });

      server.get('/api/test', async () => ({ test: true }));

      await server.ready();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check result - all should be logged
      expect(server.routeLogResult?.loggerLogged).toBe(true);
      expect(server.routeLogResult?.consoleLogged).toBe(true);
      expect(server.routeLogResult?.fileLogged).toBe(true);

      // Verify file exists
      await expect(access(testOutputPath)).resolves.not.toThrow();
    });

    it('should handle outputMode: "pretty" (default behavior)', async () => {
      await server.register(routeLogger, {
        enabled: true,
        outputMode: 'pretty',
        outputPath: testOutputPath,
        consoleOutput: true,
        fileOutput: true,
      });

      server.get('/api/test', async () => ({ test: true }));

      await server.ready();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check result - no logger output
      expect(server.routeLogResult?.loggerLogged).toBe(false);
      expect(server.routeLogResult?.consoleLogged).toBe(true);
      expect(server.routeLogResult?.fileLogged).toBe(true);
    });

    it('should handle backwards compatible loggerOutput option', async () => {
      await server.register(routeLogger, {
        enabled: true,
        loggerOutput: true,
        outputPath: testOutputPath,
        consoleOutput: true,
        fileOutput: true,
      });

      server.get('/api/test', async () => ({ test: true }));

      await server.ready();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // loggerOutput=true should behave like outputMode='both'
      expect(server.routeLogResult?.loggerLogged).toBe(true);
      expect(server.routeLogResult?.consoleLogged).toBe(true);
      expect(server.routeLogResult?.fileLogged).toBe(true);
    });

    it('should handle json mode with no file or console', async () => {
      await server.register(routeLogger, {
        enabled: true,
        outputMode: 'json',
      });

      server.get('/api/test', async () => ({ test: true }));

      await server.ready();

      // Check result
      expect(server.routeLogResult?.success).toBe(true);
      expect(server.routeLogResult?.loggerLogged).toBe(true);
      expect(server.routeLogResult?.routeCount).toBeGreaterThan(0);
    });
  });
});
