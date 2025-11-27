import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getApp,
  getAppsInOrder,
  loadConfig,
  resolvePath,
  validateConfig,
} from '../../src/lib/config.js';
import type { AppConfig, MtaPrismaConfig } from '../../src/types/config.js';
import {
  createMockAppConfig,
  createMockConfig,
  getFixturePath,
} from '../__fixtures__/test-helpers.js';

// Mock fs/promises
vi.mock('node:fs/promises');

describe('Config Module', () => {
  describe('loadConfig', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should load valid configuration from file', async () => {
      const mockConfig: MtaPrismaConfig = {
        apps: [
          {
            name: 'auth',
            schemaPath: 'apps/auth/prisma/schema.prisma',
            outputName: 'client-auth',
            enabled: true,
          },
        ],
        strategy: 'orchestrated',
      };

      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockConfig));

      const config = await loadConfig('test-config.json');

      expect(config).toEqual(mockConfig);
      expect(access).toHaveBeenCalledWith('test-config.json');
      expect(readFile).toHaveBeenCalledWith('test-config.json', 'utf-8');
    });

    it('should use default config name when no path provided', async () => {
      const mockConfig = createMockConfig();

      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockConfig));

      await loadConfig();

      expect(access).toHaveBeenCalledWith('mta-prisma.config.json');
    });

    it('should handle missing config file gracefully', async () => {
      vi.mocked(access).mockRejectedValue(new Error('File not found'));

      await expect(loadConfig('nonexistent.json')).rejects.toThrow();
    });

    it('should handle invalid JSON in config file', async () => {
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(readFile).mockResolvedValue('{ invalid json }');

      await expect(loadConfig('invalid.json')).rejects.toThrow();
    });
  });

  describe('validateConfig', () => {
    it('should validate a correct configuration', () => {
      const config = createMockConfig();
      const result = validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing apps array', () => {
      const config = { strategy: 'orchestrated' } as any;
      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Configuration must include at least one app');
    });

    it('should detect empty apps array', () => {
      const config = { apps: [], strategy: 'orchestrated' };
      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Configuration must include at least one app');
    });

    it('should detect missing required fields in app', () => {
      const config: MtaPrismaConfig = {
        apps: [{ name: '', schemaPath: '', outputName: '' } as any],
        strategy: 'orchestrated',
      };
      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect duplicate app names', () => {
      const config: MtaPrismaConfig = {
        apps: [createMockAppConfig({ name: 'auth' }), createMockAppConfig({ name: 'auth' })],
        strategy: 'orchestrated',
      };
      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Duplicate app name'))).toBe(true);
    });

    it('should detect duplicate output names', () => {
      const config: MtaPrismaConfig = {
        apps: [
          createMockAppConfig({ name: 'auth', outputName: 'client-shared' }),
          createMockAppConfig({ name: 'billing', outputName: 'client-shared' }),
        ],
        strategy: 'orchestrated',
      };
      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Duplicate output name'))).toBe(true);
    });

    it('should detect invalid strategy', () => {
      const config: MtaPrismaConfig = {
        apps: [createMockAppConfig()],
        strategy: 'invalid' as any,
      };
      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Invalid strategy'))).toBe(true);
    });

    it('should detect unknown dependencies', () => {
      const config: MtaPrismaConfig = {
        apps: [
          createMockAppConfig({
            name: 'auth',
            dependencies: ['nonexistent-app'],
          }),
        ],
        strategy: 'orchestrated',
      };
      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('depends on unknown app'))).toBe(true);
    });

    it('should warn about missing merged schema path', () => {
      const config: MtaPrismaConfig = {
        apps: [createMockAppConfig()],
        strategy: 'merged',
      };
      const result = validateConfig(config);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes('mergedSchemaPath'))).toBe(true);
    });
  });

  describe('getAppsInOrder', () => {
    it('should return apps in dependency order', () => {
      const config: MtaPrismaConfig = {
        apps: [
          createMockAppConfig({ name: 'billing', dependencies: ['auth'] }),
          createMockAppConfig({ name: 'auth', dependencies: [] }),
        ],
        strategy: 'orchestrated',
      };

      const sorted = getAppsInOrder(config);

      expect(sorted).toHaveLength(2);
      expect(sorted[0].name).toBe('auth');
      expect(sorted[1].name).toBe('billing');
    });

    it('should handle multiple dependency levels', () => {
      const config: MtaPrismaConfig = {
        apps: [
          createMockAppConfig({ name: 'reports', dependencies: ['billing'] }),
          createMockAppConfig({ name: 'billing', dependencies: ['auth'] }),
          createMockAppConfig({ name: 'auth', dependencies: [] }),
        ],
        strategy: 'orchestrated',
      };

      const sorted = getAppsInOrder(config);

      expect(sorted).toHaveLength(3);
      expect(sorted[0].name).toBe('auth');
      expect(sorted[1].name).toBe('billing');
      expect(sorted[2].name).toBe('reports');
    });

    it('should filter out disabled apps', () => {
      const config: MtaPrismaConfig = {
        apps: [
          createMockAppConfig({ name: 'auth', enabled: true }),
          createMockAppConfig({ name: 'billing', enabled: false }),
        ],
        strategy: 'orchestrated',
      };

      const sorted = getAppsInOrder(config);

      expect(sorted).toHaveLength(1);
      expect(sorted[0].name).toBe('auth');
    });

    it('should throw on circular dependencies', () => {
      const config: MtaPrismaConfig = {
        apps: [
          createMockAppConfig({ name: 'auth', dependencies: ['billing'] }),
          createMockAppConfig({ name: 'billing', dependencies: ['auth'] }),
        ],
        strategy: 'orchestrated',
      };

      expect(() => getAppsInOrder(config)).toThrow('Circular dependency');
    });

    it('should handle apps with no dependencies', () => {
      const config: MtaPrismaConfig = {
        apps: [createMockAppConfig({ name: 'auth' }), createMockAppConfig({ name: 'billing' })],
        strategy: 'orchestrated',
      };

      const sorted = getAppsInOrder(config);

      expect(sorted).toHaveLength(2);
    });
  });

  describe('getApp', () => {
    it('should find app by name', () => {
      const config = createMockConfig();
      const app = getApp(config, 'auth');

      expect(app).toBeDefined();
      expect(app?.name).toBe('auth');
    });

    it('should return undefined for non-existent app', () => {
      const config = createMockConfig();
      const app = getApp(config, 'nonexistent');

      expect(app).toBeUndefined();
    });
  });

  describe('resolvePath', () => {
    it('should resolve relative paths', () => {
      const resolved = resolvePath('apps/auth/prisma/schema.prisma', '/project');

      expect(resolved).toBe(resolve('/project', 'apps/auth/prisma/schema.prisma'));
    });

    it('should use current working directory as default', () => {
      const resolved = resolvePath('test.txt');

      expect(resolved).toBe(resolve(process.cwd(), 'test.txt'));
    });
  });
});
