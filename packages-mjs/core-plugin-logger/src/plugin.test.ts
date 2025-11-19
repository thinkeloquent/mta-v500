/**
 * Tests for core-plugin-logger
 */

import Fastify, { type FastifyInstance } from 'fastify';
import { existsSync } from 'fs';
import { readFile, rm } from 'fs/promises';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import pluginLogger from './plugin.js';
import type { PluginLoggerOptions } from './types.js';

describe('core-plugin-logger', () => {
  let server: FastifyInstance;

  beforeEach(() => {
    server = Fastify({ logger: false });
  });

  afterEach(async () => {
    await server.close();
    // Clean up any test log files
    const testPaths = ['./test-plugins.log', './plugins.log', './test-logs/plugins.log'];
    for (const path of testPaths) {
      if (existsSync(path)) {
        await rm(path, { force: true });
      }
    }
    // Clean up test directories
    if (existsSync('./test-logs')) {
      await rm('./test-logs', { recursive: true, force: true });
    }
  });

  describe('Plugin Registration', () => {
    it('should register successfully with default options', async () => {
      await expect(server.register(pluginLogger)).resolves.not.toThrow();
    });

    it('should register successfully with custom options', async () => {
      const options: PluginLoggerOptions = {
        enabled: true,
        outputPath: './test-plugins.log',
        consoleOutput: false,
        fileOutput: true,
      };

      await expect(server.register(pluginLogger, options)).resolves.not.toThrow();
    });

    it('should skip initialization when disabled', async () => {
      const options: PluginLoggerOptions = {
        enabled: false,
      };

      await server.register(pluginLogger, options);
      await server.ready();

      expect(server.pluginLogResult).toBeUndefined();
    });
  });

  describe('Output Modes', () => {
    it('should log plugins with pretty mode (default)', async () => {
      const options: PluginLoggerOptions = {
        enabled: true,
        consoleOutput: false,
        fileOutput: true,
        outputPath: './test-plugins.log',
        outputMode: 'pretty',
      };

      await server.register(pluginLogger, options);
      await server.ready();

      // Check that file was created
      expect(existsSync('./test-plugins.log')).toBe(true);

      // Read file and verify content
      const content = await readFile('./test-plugins.log', 'utf-8');
      expect(content).toContain('Fastify Plugins');
      expect(content).toContain('core-plugin-logger');

      // Check result decoration
      expect(server.pluginLogResult).toBeDefined();
      expect(server.pluginLogResult?.success).toBe(true);
      expect(server.pluginLogResult?.fileLogged).toBe(true);
      expect(server.pluginLogResult?.consoleLogged).toBe(false);
      expect(server.pluginLogResult?.loggerLogged).toBe(false);
    });

    it('should log plugins with json mode', async () => {
      const testServer = Fastify({ logger: true });

      const options: PluginLoggerOptions = {
        enabled: true,
        outputMode: 'json',
      };

      await testServer.register(pluginLogger, options);
      await testServer.ready();

      // Check result decoration
      expect(testServer.pluginLogResult).toBeDefined();
      expect(testServer.pluginLogResult?.success).toBe(true);
      expect(testServer.pluginLogResult?.loggerLogged).toBe(true);
      expect(testServer.pluginLogResult?.consoleLogged).toBe(false);
      expect(testServer.pluginLogResult?.fileLogged).toBe(false);

      await testServer.close();
    });

    it('should log plugins with both mode', async () => {
      const testServer = Fastify({ logger: true });

      const options: PluginLoggerOptions = {
        enabled: true,
        consoleOutput: false,
        fileOutput: true,
        outputPath: './test-plugins.log',
        outputMode: 'both',
      };

      await testServer.register(pluginLogger, options);
      await testServer.ready();

      // Check that file was created
      expect(existsSync('./test-plugins.log')).toBe(true);

      // Check result decoration
      expect(testServer.pluginLogResult).toBeDefined();
      expect(testServer.pluginLogResult?.success).toBe(true);
      expect(testServer.pluginLogResult?.fileLogged).toBe(true);
      expect(testServer.pluginLogResult?.loggerLogged).toBe(true);
      expect(testServer.pluginLogResult?.consoleLogged).toBe(false);

      await testServer.close();
    });
  });

  describe('Console and File Output', () => {
    it('should only log to console when fileOutput is false', async () => {
      const options: PluginLoggerOptions = {
        enabled: true,
        consoleOutput: true,
        fileOutput: false,
      };

      await server.register(pluginLogger, options);
      await server.ready();

      expect(server.pluginLogResult?.consoleLogged).toBe(true);
      expect(server.pluginLogResult?.fileLogged).toBe(false);
    });

    it('should only log to file when consoleOutput is false', async () => {
      const options: PluginLoggerOptions = {
        enabled: true,
        consoleOutput: false,
        fileOutput: true,
        outputPath: './test-plugins.log',
      };

      await server.register(pluginLogger, options);
      await server.ready();

      expect(server.pluginLogResult?.consoleLogged).toBe(false);
      expect(server.pluginLogResult?.fileLogged).toBe(true);
      expect(existsSync('./test-plugins.log')).toBe(true);
    });

    it('should create parent directories if they do not exist', async () => {
      const options: PluginLoggerOptions = {
        enabled: true,
        consoleOutput: false,
        fileOutput: true,
        outputPath: './test-logs/nested/plugins.log',
      };

      await server.register(pluginLogger, options);
      await server.ready();

      expect(server.pluginLogResult?.fileLogged).toBe(true);
      expect(existsSync('./test-logs/nested/plugins.log')).toBe(true);

      // Clean up
      await rm('./test-logs', { recursive: true, force: true });
    });
  });

  describe('Formatting Options', () => {
    it('should include timestamp when includeTimestamp is true', async () => {
      const options: PluginLoggerOptions = {
        enabled: true,
        consoleOutput: false,
        fileOutput: true,
        outputPath: './test-plugins.log',
        includeTimestamp: true,
      };

      await server.register(pluginLogger, options);
      await server.ready();

      const content = await readFile('./test-plugins.log', 'utf-8');
      expect(content).toMatch(/Generated at: \d{4}-\d{2}-\d{2}/);
    });

    it('should exclude timestamp when includeTimestamp is false', async () => {
      const options: PluginLoggerOptions = {
        enabled: true,
        consoleOutput: false,
        fileOutput: true,
        outputPath: './test-plugins.log',
        includeTimestamp: false,
      };

      await server.register(pluginLogger, options);
      await server.ready();

      const content = await readFile('./test-plugins.log', 'utf-8');
      expect(content).not.toContain('Generated at:');
    });

    it('should format with pretty print when prettyPrint is true', async () => {
      const options: PluginLoggerOptions = {
        enabled: true,
        consoleOutput: false,
        fileOutput: true,
        outputPath: './test-plugins.log',
        prettyPrint: true,
      };

      await server.register(pluginLogger, options);
      await server.ready();

      const content = await readFile('./test-plugins.log', 'utf-8');
      expect(content).toContain('='.repeat(80));
      expect(content).toContain('Fastify Plugins');
    });

    it('should not format with pretty print when prettyPrint is false', async () => {
      const options: PluginLoggerOptions = {
        enabled: true,
        consoleOutput: false,
        fileOutput: true,
        outputPath: './test-plugins.log',
        prettyPrint: false,
      };

      await server.register(pluginLogger, options);
      await server.ready();

      const content = await readFile('./test-plugins.log', 'utf-8');
      expect(content).not.toContain('Fastify Plugins');
      expect(content).not.toContain('='.repeat(80));
    });
  });

  describe('Plugin Counting', () => {
    it('should count plugins correctly', async () => {
      const options: PluginLoggerOptions = {
        enabled: true,
        consoleOutput: false,
        fileOutput: false,
      };

      // Register some additional plugins
      await server.register(async (fastify) => {
        fastify.get('/test', async () => ({ hello: 'world' }));
      });

      await server.register(pluginLogger, options);
      await server.ready();

      expect(server.pluginLogResult?.pluginCount).toBeGreaterThan(0);
      expect(typeof server.pluginLogResult?.pluginCount).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle file write errors gracefully', async () => {
      const options: PluginLoggerOptions = {
        enabled: true,
        consoleOutput: false,
        fileOutput: true,
        // Invalid path that will cause an error
        outputPath: '/invalid/path/that/does/not/exist/plugins.log',
      };

      const testServer = Fastify({ logger: true });

      await testServer.register(pluginLogger, options);
      await testServer.ready();

      // Should not throw but should log error
      expect(testServer.pluginLogResult?.success).toBe(false);
      expect(testServer.pluginLogResult?.error).toBeDefined();

      await testServer.close();
    });
  });

  describe('Backwards Compatibility', () => {
    it('should support deprecated loggerOutput option', async () => {
      const testServer = Fastify({ logger: true });

      const options: PluginLoggerOptions = {
        enabled: true,
        consoleOutput: false,
        fileOutput: true,
        outputPath: './test-plugins.log',
        loggerOutput: true, // deprecated option
      };

      await testServer.register(pluginLogger, options);
      await testServer.ready();

      // Should behave like 'both' mode
      expect(testServer.pluginLogResult?.fileLogged).toBe(true);
      expect(testServer.pluginLogResult?.loggerLogged).toBe(true);

      await testServer.close();
    });
  });
});
