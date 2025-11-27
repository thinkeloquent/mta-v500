import { beforeEach, describe, expect, it } from 'vitest';
import { EntityConfigurationManager } from '../src/configuration-manager.js';
import { ConfigSource, type EntityConfig, MergeStrategy } from '../src/types.js';

describe('EntityConfigurationManager', () => {
  let manager: EntityConfigurationManager;

  beforeEach(() => {
    manager = new EntityConfigurationManager({
      defaultMergeStrategy: MergeStrategy.MERGE,
      enableValidation: true,
      enableCaching: true,
    });
  });

  describe('setConfig and getConfig', () => {
    it('should set and retrieve configuration', () => {
      const config: EntityConfig = {
        plugins: ['plugin1', 'plugin2'],
        settings: { key: 'value' },
      };

      const setResult = manager.setConfig('tenant-1', 'tenant', config);
      expect(setResult.isOk()).toBe(true);

      const getResult = manager.getConfig('tenant-1', 'tenant');
      expect(getResult.isOk()).toBe(true);
      if (getResult.isOk()) {
        expect(getResult.value).toEqual(config);
      }
    });

    it('should return error for non-existent configuration', () => {
      const result = manager.getConfig('non-existent', 'tenant');
      expect(result.isErr()).toBe(true);
      expect(result.isErr() && result.error.message).toContain('No configuration found');
    });

    it('should validate configuration when validation is enabled', () => {
      const invalidConfig = {
        plugins: 'not-an-array', // Invalid type
      } as unknown as EntityConfig;

      const result = manager.setConfig('tenant-1', 'tenant', invalidConfig);
      expect(result.isErr()).toBe(true);
      expect(result.isErr() && result.error.message).toContain('validation failed');
    });

    it('should cache configuration when caching is enabled', () => {
      const config: EntityConfig = {
        plugins: ['plugin1'],
      };

      manager.setConfig('tenant-1', 'tenant', config);

      // First call
      const result1 = manager.getConfig('tenant-1', 'tenant');
      // Second call should use cache
      const result2 = manager.getConfig('tenant-1', 'tenant');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isOk() && result2.isOk()) {
        expect(result1.value).toEqual(result2.value);
      }
    });
  });

  describe('configuration layering', () => {
    it('should merge configurations from multiple sources with priority', () => {
      const defaultConfig: EntityConfig = {
        plugins: ['default-plugin'],
        settings: { theme: 'light', apiUrl: 'default.com' },
      };

      const filesystemConfig: EntityConfig = {
        plugins: ['fs-plugin'],
        settings: { apiUrl: 'filesystem.com', maxRetries: 3 },
      };

      const runtimeConfig: EntityConfig = {
        settings: { apiUrl: 'runtime.com' },
      };

      manager.setConfig('tenant-1', 'tenant', defaultConfig, ConfigSource.DEFAULT);
      manager.setConfig('tenant-1', 'tenant', filesystemConfig, ConfigSource.FILESYSTEM);
      manager.setConfig('tenant-1', 'tenant', runtimeConfig, ConfigSource.RUNTIME);

      const result = manager.getConfig('tenant-1', 'tenant');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Runtime has highest priority, so apiUrl should be from runtime
        expect(result.value.settings?.apiUrl).toBe('runtime.com');
        // Other settings should be merged from lower priority sources
        expect(result.value.settings?.theme).toBe('light');
        expect(result.value.settings?.maxRetries).toBe(3);
        // Plugins should be merged (concatenated)
        expect(result.value.plugins).toContain('default-plugin');
        expect(result.value.plugins).toContain('fs-plugin');
      }
    });

    it('should respect source priority order', () => {
      const config1: EntityConfig = { settings: { value: 'default' } };
      const config2: EntityConfig = { settings: { value: 'filesystem' } };
      const config3: EntityConfig = { settings: { value: 'control_plane' } };
      const config4: EntityConfig = { settings: { value: 'runtime' } };

      manager.setConfig('tenant-1', 'tenant', config1, ConfigSource.DEFAULT);
      manager.setConfig('tenant-1', 'tenant', config2, ConfigSource.FILESYSTEM);
      manager.setConfig('tenant-1', 'tenant', config3, ConfigSource.CONTROL_PLANE);
      manager.setConfig('tenant-1', 'tenant', config4, ConfigSource.RUNTIME);

      const result = manager.getConfig('tenant-1', 'tenant');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Runtime has highest priority
        expect(result.value.settings?.value).toBe('runtime');
      }
    });
  });

  describe('getConfigBySource', () => {
    it('should retrieve configuration from specific source', () => {
      const filesystemConfig: EntityConfig = {
        plugins: ['fs-plugin'],
      };
      const runtimeConfig: EntityConfig = {
        plugins: ['runtime-plugin'],
      };

      manager.setConfig('tenant-1', 'tenant', filesystemConfig, ConfigSource.FILESYSTEM);
      manager.setConfig('tenant-1', 'tenant', runtimeConfig, ConfigSource.RUNTIME);

      const result = manager.getConfigBySource('tenant-1', 'tenant', ConfigSource.FILESYSTEM);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(filesystemConfig);
      }
    });

    it('should return error for non-existent source', () => {
      const config: EntityConfig = { plugins: ['plugin1'] };
      manager.setConfig('tenant-1', 'tenant', config, ConfigSource.RUNTIME);

      const result = manager.getConfigBySource('tenant-1', 'tenant', ConfigSource.FILESYSTEM);

      expect(result.isErr()).toBe(true);
      expect(result.isErr() && result.error.message).toContain('No configuration from source');
    });
  });

  describe('mergeConfig', () => {
    it('should merge additional config with existing config', () => {
      const existingConfig: EntityConfig = {
        plugins: ['plugin1'],
        settings: { key1: 'value1' },
      };
      const additionalConfig: EntityConfig = {
        plugins: ['plugin2'],
        settings: { key2: 'value2' },
      };

      manager.setConfig('tenant-1', 'tenant', existingConfig);
      const result = manager.mergeConfig('tenant-1', 'tenant', additionalConfig);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.plugins).toEqual(['plugin1', 'plugin2']);
        expect(result.value.settings).toEqual({
          key1: 'value1',
          key2: 'value2',
        });
      }
    });

    it('should use custom merge options', () => {
      const existingConfig: EntityConfig = {
        plugins: ['plugin1', 'plugin2'],
      };
      const additionalConfig: EntityConfig = {
        plugins: ['plugin2', 'plugin3'],
      };

      manager.setConfig('tenant-1', 'tenant', existingConfig);
      const result = manager.mergeConfig('tenant-1', 'tenant', additionalConfig, {
        strategy: MergeStrategy.MERGE,
        arrayMerge: 'unique',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.plugins).toEqual(['plugin1', 'plugin2', 'plugin3']);
      }
    });
  });

  describe('removeConfig', () => {
    it('should remove all configurations for entity', () => {
      const config: EntityConfig = { plugins: ['plugin1'] };
      manager.setConfig('tenant-1', 'tenant', config);

      expect(manager.hasConfig('tenant-1', 'tenant')).toBe(true);

      const result = manager.removeConfig('tenant-1', 'tenant');
      expect(result.isOk()).toBe(true);
      expect(manager.hasConfig('tenant-1', 'tenant')).toBe(false);
    });

    it('should remove configuration from specific source', () => {
      const config1: EntityConfig = { plugins: ['plugin1'] };
      const config2: EntityConfig = { plugins: ['plugin2'] };

      manager.setConfig('tenant-1', 'tenant', config1, ConfigSource.FILESYSTEM);
      manager.setConfig('tenant-1', 'tenant', config2, ConfigSource.RUNTIME);

      const result = manager.removeConfig('tenant-1', 'tenant', ConfigSource.RUNTIME);

      expect(result.isOk()).toBe(true);
      expect(manager.hasConfig('tenant-1', 'tenant')).toBe(true);

      const getResult = manager.getConfigBySource('tenant-1', 'tenant', ConfigSource.FILESYSTEM);
      expect(getResult.isOk()).toBe(true);

      const getRuntimeResult = manager.getConfigBySource(
        'tenant-1',
        'tenant',
        ConfigSource.RUNTIME,
      );
      expect(getRuntimeResult.isErr()).toBe(true);
    });

    it('should invalidate cache when configuration is removed', () => {
      const config: EntityConfig = { plugins: ['plugin1'] };
      manager.setConfig('tenant-1', 'tenant', config);

      // Populate cache
      manager.getConfig('tenant-1', 'tenant');

      // Remove config
      manager.removeConfig('tenant-1', 'tenant');

      // Should not be in cache
      const result = manager.getConfig('tenant-1', 'tenant');
      expect(result.isErr()).toBe(true);
    });
  });

  describe('hasConfig', () => {
    it('should return true for existing configuration', () => {
      const config: EntityConfig = { plugins: ['plugin1'] };
      manager.setConfig('tenant-1', 'tenant', config);

      expect(manager.hasConfig('tenant-1', 'tenant')).toBe(true);
    });

    it('should return false for non-existent configuration', () => {
      expect(manager.hasConfig('non-existent', 'tenant')).toBe(false);
    });
  });

  describe('getMetadata', () => {
    it('should return configuration metadata', () => {
      const config: EntityConfig = { plugins: ['plugin1'] };
      manager.setConfig('tenant-1', 'tenant', config, ConfigSource.FILESYSTEM);

      const result = manager.getMetadata('tenant-1', 'tenant');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.entityId).toBe('tenant-1');
        expect(result.value.entityType).toBe('tenant');
        expect(result.value.sources).toEqual([ConfigSource.FILESYSTEM]);
        expect(result.value.lastUpdated).toBeInstanceOf(Date);
      }
    });

    it('should include all sources in metadata', () => {
      const config: EntityConfig = { plugins: ['plugin1'] };
      manager.setConfig('tenant-1', 'tenant', config, ConfigSource.DEFAULT);
      manager.setConfig('tenant-1', 'tenant', config, ConfigSource.RUNTIME);

      const result = manager.getMetadata('tenant-1', 'tenant');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.sources).toContain(ConfigSource.DEFAULT);
        expect(result.value.sources).toContain(ConfigSource.RUNTIME);
      }
    });
  });

  describe('validateConfig', () => {
    it('should validate valid configuration', () => {
      const config: EntityConfig = {
        plugins: ['plugin1'],
        settings: { key: 'value' },
      };

      const result = manager.validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid configuration', () => {
      const invalidConfig = {
        plugins: 'not-an-array',
      } as unknown as EntityConfig;

      const result = manager.validateConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('clearCache', () => {
    it('should clear cached configurations', () => {
      const config: EntityConfig = { plugins: ['plugin1'] };
      manager.setConfig('tenant-1', 'tenant', config);

      // Populate cache
      manager.getConfig('tenant-1', 'tenant');

      manager.clearCache();

      // Cache should be cleared, but config should still exist
      const result = manager.getConfig('tenant-1', 'tenant');
      expect(result.isOk()).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all configurations and cache', () => {
      const config: EntityConfig = { plugins: ['plugin1'] };
      manager.setConfig('tenant-1', 'tenant', config);
      manager.setConfig('tenant-2', 'tenant', config);

      expect(manager.count()).toBe(2);

      manager.clear();

      expect(manager.count()).toBe(0);
      expect(manager.hasConfig('tenant-1', 'tenant')).toBe(false);
      expect(manager.hasConfig('tenant-2', 'tenant')).toBe(false);
    });
  });

  describe('getAllKeys', () => {
    it('should return all entity keys with configurations', () => {
      const config: EntityConfig = { plugins: ['plugin1'] };
      manager.setConfig('tenant-1', 'tenant', config);
      manager.setConfig('org-1', 'organization', config);

      const keys = manager.getAllKeys();

      expect(keys).toHaveLength(2);
      expect(keys).toContain('tenant:tenant-1');
      expect(keys).toContain('organization:org-1');
    });
  });

  describe('count', () => {
    it('should return count of configured entities', () => {
      expect(manager.count()).toBe(0);

      const config: EntityConfig = { plugins: ['plugin1'] };
      manager.setConfig('tenant-1', 'tenant', config);
      expect(manager.count()).toBe(1);

      manager.setConfig('tenant-2', 'tenant', config);
      expect(manager.count()).toBe(2);
    });
  });

  describe('getDefinitionRegistry', () => {
    it('should return the entity definition registry', () => {
      const registry = manager.getDefinitionRegistry();
      expect(registry).toBeDefined();

      const definition = {
        id: 'tenant-1',
        type: 'tenant',
        name: 'Tenant 1',
        enabled: true,
      };

      const result = registry.register(definition);
      expect(result.isOk()).toBe(true);
      expect(registry.has('tenant-1', 'tenant')).toBe(true);
    });
  });

  describe('constructor options', () => {
    it('should accept valid options', () => {
      const mgr = new EntityConfigurationManager({
        defaultMergeStrategy: MergeStrategy.OVERRIDE,
        enableValidation: false,
        enableCaching: false,
      });

      expect(mgr).toBeDefined();
    });

    it('should throw error for invalid options', () => {
      expect(() => {
        new EntityConfigurationManager({
          defaultMergeStrategy: 'invalid' as unknown as MergeStrategy,
        });
      }).toThrow();
    });
  });
});
