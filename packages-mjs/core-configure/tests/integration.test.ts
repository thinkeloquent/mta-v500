import { beforeEach, describe, expect, it } from 'vitest';
import {
  ConfigSource,
  type EntityConfig,
  EntityConfigurationManager,
  type EntityDefinition,
  type EntityDefinitionRegistry,
  MergeStrategy,
} from '../src/index.js';

describe('Integration Tests', () => {
  let manager: EntityConfigurationManager;
  let registry: EntityDefinitionRegistry;

  beforeEach(() => {
    manager = new EntityConfigurationManager({
      defaultMergeStrategy: MergeStrategy.MERGE,
      enableValidation: true,
      enableCaching: true,
    });
    registry = manager.getDefinitionRegistry();
  });

  describe('Complete entity lifecycle', () => {
    it('should manage complete entity configuration lifecycle', () => {
      // 1. Register entity definition
      const definition: EntityDefinition = {
        id: 'tenant-acme',
        type: 'tenant',
        name: 'Acme Corporation',
        description: 'Production tenant for Acme Corp',
        enabled: true,
        metadata: {
          region: 'us-east-1',
          tier: 'enterprise',
        },
      };

      const registerResult = registry.register(definition);
      expect(registerResult.isOk()).toBe(true);

      // 2. Set default configuration
      const defaultConfig: EntityConfig = {
        plugins: ['auth', 'logging'],
        settings: {
          theme: 'light',
          maxConnections: 100,
          features: {
            analytics: true,
            reporting: false,
          },
        },
        security: {
          rateLimit: {
            max: 100,
            timeWindow: 60000,
          },
        },
      };

      const setDefaultResult = manager.setConfig(
        'tenant-acme',
        'tenant',
        defaultConfig,
        ConfigSource.DEFAULT,
      );
      expect(setDefaultResult.isOk()).toBe(true);

      // 3. Override with filesystem configuration
      const filesystemConfig: EntityConfig = {
        plugins: ['notifications'],
        settings: {
          maxConnections: 200,
          features: {
            reporting: true,
            exports: true,
          },
        },
      };

      const setFsResult = manager.setConfig(
        'tenant-acme',
        'tenant',
        filesystemConfig,
        ConfigSource.FILESYSTEM,
      );
      expect(setFsResult.isOk()).toBe(true);

      // 4. Add runtime configuration
      const runtimeConfig: EntityConfig = {
        settings: {
          apiKey: 'runtime-secret-key',
        },
      };

      const setRuntimeResult = manager.setConfig(
        'tenant-acme',
        'tenant',
        runtimeConfig,
        ConfigSource.RUNTIME,
      );
      expect(setRuntimeResult.isOk()).toBe(true);

      // 5. Get merged configuration
      const getResult = manager.getConfig('tenant-acme', 'tenant');
      expect(getResult.isOk()).toBe(true);

      if (getResult.isOk()) {
        const config = getResult.value;

        // Verify plugins are merged (concatenated)
        expect(config.plugins).toContain('auth');
        expect(config.plugins).toContain('logging');
        expect(config.plugins).toContain('notifications');

        // Verify settings are deep merged with priority
        expect(config.settings?.maxConnections).toBe(200); // From filesystem
        expect(config.settings?.theme).toBe('light'); // From default
        expect(config.settings?.apiKey).toBe('runtime-secret-key'); // From runtime

        // Verify nested objects are merged
        const features = config.settings?.features as Record<string, boolean> | undefined;
        expect(features?.analytics).toBe(true); // From default
        expect(features?.reporting).toBe(true); // From filesystem (override)
        expect(features?.exports).toBe(true); // From filesystem (new)

        // Verify security configuration
        expect(config.security?.rateLimit?.max).toBe(100);
      }

      // 6. Get metadata
      const metadataResult = manager.getMetadata('tenant-acme', 'tenant');
      expect(metadataResult.isOk()).toBe(true);

      if (metadataResult.isOk()) {
        expect(metadataResult.value.entityId).toBe('tenant-acme');
        expect(metadataResult.value.sources).toHaveLength(3);
        expect(metadataResult.value.sources).toContain(ConfigSource.DEFAULT);
        expect(metadataResult.value.sources).toContain(ConfigSource.FILESYSTEM);
        expect(metadataResult.value.sources).toContain(ConfigSource.RUNTIME);
      }

      // 7. Verify entity definition is still accessible
      const defResult = registry.get('tenant-acme', 'tenant');
      expect(defResult.isOk()).toBe(true);
      if (defResult.isOk()) {
        expect(defResult.value.name).toBe('Acme Corporation');
      }
    });
  });

  describe('Multi-entity configuration', () => {
    it('should manage configurations for multiple entities independently', () => {
      // Register multiple tenants
      const tenant1: EntityDefinition = {
        id: 'tenant-1',
        type: 'tenant',
        name: 'Tenant 1',
        enabled: true,
      };

      const tenant2: EntityDefinition = {
        id: 'tenant-2',
        type: 'tenant',
        name: 'Tenant 2',
        enabled: true,
      };

      registry.register(tenant1);
      registry.register(tenant2);

      // Set different configurations
      const config1: EntityConfig = {
        plugins: ['plugin-a'],
        settings: { color: 'blue' },
      };

      const config2: EntityConfig = {
        plugins: ['plugin-b'],
        settings: { color: 'red' },
      };

      manager.setConfig('tenant-1', 'tenant', config1);
      manager.setConfig('tenant-2', 'tenant', config2);

      // Verify independent configurations
      const result1 = manager.getConfig('tenant-1', 'tenant');
      const result2 = manager.getConfig('tenant-2', 'tenant');

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);

      if (result1.isOk() && result2.isOk()) {
        expect(result1.value.settings?.color).toBe('blue');
        expect(result2.value.settings?.color).toBe('red');
        expect(result1.value.plugins).toEqual(['plugin-a']);
        expect(result2.value.plugins).toEqual(['plugin-b']);
      }
    });
  });

  describe('Configuration evolution', () => {
    it('should handle configuration updates over time', () => {
      const definition: EntityDefinition = {
        id: 'tenant-evolve',
        type: 'tenant',
        name: 'Evolving Tenant',
        enabled: true,
      };

      registry.register(definition);

      // Initial configuration
      const initialConfig: EntityConfig = {
        plugins: ['core'],
        settings: { version: 1 },
      };

      manager.setConfig('tenant-evolve', 'tenant', initialConfig, ConfigSource.DEFAULT);

      // Add feature flags via filesystem
      const featureConfig: EntityConfig = {
        settings: {
          features: {
            newFeature: true,
          },
        },
      };

      manager.setConfig('tenant-evolve', 'tenant', featureConfig, ConfigSource.FILESYSTEM);

      // Enable at runtime
      const runtimeConfig: EntityConfig = {
        plugins: ['feature-plugin'],
        settings: {
          version: 2,
        },
      };

      manager.setConfig('tenant-evolve', 'tenant', runtimeConfig, ConfigSource.RUNTIME);

      // Verify final state
      const result = manager.getConfig('tenant-evolve', 'tenant');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.plugins).toContain('core');
        expect(result.value.plugins).toContain('feature-plugin');
        expect(result.value.settings?.version).toBe(2); // Runtime wins
        const features = result.value.settings?.features as Record<string, boolean> | undefined;
        expect(features?.newFeature).toBe(true);
      }
    });
  });

  describe('Error handling', () => {
    it('should handle validation errors gracefully', () => {
      const invalidConfig = {
        plugins: 123, // Should be array
      } as unknown as EntityConfig;

      const result = manager.setConfig('tenant-invalid', 'tenant', invalidConfig);

      expect(result.isErr()).toBe(true);
      expect(result.isErr() && result.error.message).toContain('validation failed');
    });

    it('should handle missing entity errors', () => {
      const result = manager.getConfig('non-existent', 'tenant');

      expect(result.isErr()).toBe(true);
      expect(result.isErr() && result.error.message).toContain('No configuration found');
    });
  });

  describe('Merge strategy combinations', () => {
    it('should support different merge strategies', () => {
      const base: EntityConfig = {
        plugins: ['plugin1'],
        settings: { key1: 'value1' },
      };

      const additional: EntityConfig = {
        plugins: ['plugin2'],
        settings: { key1: 'new_value1', key2: 'value2' },
      };

      manager.setConfig('test-entity', 'tenant', base);

      // Test MERGE strategy
      const mergeResult = manager.mergeConfig('test-entity', 'tenant', additional, {
        strategy: MergeStrategy.MERGE,
      });

      expect(mergeResult.isOk()).toBe(true);
      if (mergeResult.isOk()) {
        expect(mergeResult.value.settings?.key1).toBe('new_value1'); // Overridden
        expect(mergeResult.value.settings?.key2).toBe('value2'); // Added
      }

      // Test EXTEND strategy (doesn't modify stored config)
      const extendResult = manager.mergeConfig('test-entity', 'tenant', additional, {
        strategy: MergeStrategy.EXTEND,
      });

      expect(extendResult.isOk()).toBe(true);
      if (extendResult.isOk()) {
        expect(extendResult.value.settings?.key1).toBe('value1'); // Not overridden
        expect(extendResult.value.settings?.key2).toBe('value2'); // Added
      }
    });
  });

  describe('Cache behavior', () => {
    it('should cache configurations and invalidate on updates', () => {
      const config: EntityConfig = {
        plugins: ['plugin1'],
      };

      manager.setConfig('cached-entity', 'tenant', config, ConfigSource.FILESYSTEM);

      // First read (populates cache)
      const result1 = manager.getConfig('cached-entity', 'tenant');
      expect(result1.isOk()).toBe(true);

      // Update config (should invalidate cache)
      const updatedConfig: EntityConfig = {
        plugins: ['plugin2'],
      };

      manager.setConfig('cached-entity', 'tenant', updatedConfig, ConfigSource.RUNTIME);

      // Second read (should get updated config, not cached)
      const result2 = manager.getConfig('cached-entity', 'tenant');
      expect(result2.isOk()).toBe(true);

      if (result2.isOk()) {
        expect(result2.value.plugins).toContain('plugin1'); // From first set
        expect(result2.value.plugins).toContain('plugin2'); // From runtime update
      }
    });
  });

  describe('Entity definition and configuration integration', () => {
    it('should manage entity definitions separately from configurations', () => {
      // Register definition
      const definition: EntityDefinition = {
        id: 'integrated',
        type: 'tenant',
        name: 'Integrated Entity',
        enabled: true,
      };

      registry.register(definition);

      // Set configuration
      const config: EntityConfig = {
        plugins: ['integration-plugin'],
      };

      manager.setConfig('integrated', 'tenant', config);

      // Both should be accessible
      const defResult = registry.get('integrated', 'tenant');
      const configResult = manager.getConfig('integrated', 'tenant');

      expect(defResult.isOk()).toBe(true);
      expect(configResult.isOk()).toBe(true);

      // Disable definition (doesn't affect config)
      registry.disable('integrated', 'tenant');

      const disabledDef = registry.get('integrated', 'tenant');
      expect(disabledDef.isOk() && !disabledDef.value.enabled).toBe(true);

      // Config should still be accessible
      const stillHasConfig = manager.hasConfig('integrated', 'tenant');
      expect(stillHasConfig).toBe(true);
    });
  });
});
