import { Err, Ok, type Result } from '@internal/core-exceptions';
import { EntityDefinitionRegistry } from './entity-definitions.js';
import { getDefaultMergeOptions, mergeConfigs, mergeLayers } from './merge-strategies.js';
import {
  type ConfigLayer,
  type ConfigMetadata,
  ConfigSource,
  type ConfigurationManagerOptions,
  ConfigurationManagerOptionsSchema,
  type EntityConfig,
  EntityConfigSchema,
  type MergeOptions,
  type ValidationResult,
} from './types.js';

/**
 * Entity configuration manager with layered configuration support
 */
export class EntityConfigurationManager {
  private readonly options: ConfigurationManagerOptions;
  private readonly configLayers = new Map<string, ConfigLayer[]>();
  private readonly configCache = new Map<string, EntityConfig>();
  private readonly definitions: EntityDefinitionRegistry;

  constructor(options?: Partial<ConfigurationManagerOptions>) {
    const validation = ConfigurationManagerOptionsSchema.safeParse(options || {});
    if (!validation.success) {
      throw new Error(`Invalid configuration manager options: ${validation.error.message}`);
    }
    this.options = validation.data;
    this.definitions = new EntityDefinitionRegistry();
  }

  /**
   * Get entity definition registry
   */
  getDefinitionRegistry(): EntityDefinitionRegistry {
    return this.definitions;
  }

  /**
   * Set configuration for an entity
   */
  setConfig(
    entityId: string,
    entityType: string,
    config: EntityConfig,
    source: ConfigSource = ConfigSource.RUNTIME,
  ): Result<void, Error> {
    if (this.options.enableValidation) {
      const validationResult = this.validateConfig(config);
      if (!validationResult.valid) {
        return new Err(
          new Error(`Configuration validation failed: ${validationResult.errors.join(', ')}`),
        );
      }
    }

    const key = this.getKey(entityId, entityType);
    const layers = this.configLayers.get(key) || [];

    // Add or update layer for this source
    const priority = this.getSourcePriority(source);
    const existingLayerIndex = layers.findIndex((l) => l.source === source);

    const newLayer: ConfigLayer = {
      source,
      priority,
      config,
      timestamp: new Date(),
    };

    if (existingLayerIndex >= 0) {
      layers[existingLayerIndex] = newLayer;
    } else {
      layers.push(newLayer);
    }

    // Sort by priority (highest first)
    layers.sort((a, b) => b.priority - a.priority);

    this.configLayers.set(key, layers);

    // Invalidate cache
    this.configCache.delete(key);

    return new Ok(undefined);
  }

  /**
   * Get merged configuration for an entity
   */
  getConfig(entityId: string, entityType: string): Result<EntityConfig, Error> {
    const key = this.getKey(entityId, entityType);

    // Check cache
    if (this.options.enableCaching) {
      const cached = this.configCache.get(key);
      if (cached) {
        return new Ok(cached);
      }
    }

    const layers = this.configLayers.get(key);
    if (!layers || layers.length === 0) {
      return new Err(new Error(`No configuration found for entity: ${entityId} (${entityType})`));
    }

    // Merge all layers (reverse so lowest priority merges first, highest last)
    const mergeOptions = getDefaultMergeOptions(this.options.defaultMergeStrategy);
    const configs = layers.map((layer) => layer.config).reverse();
    const merged = mergeLayers(configs, mergeOptions);

    // Cache result
    if (this.options.enableCaching) {
      this.configCache.set(key, merged);
    }

    return new Ok(merged);
  }

  /**
   * Get configuration from specific source
   */
  getConfigBySource(
    entityId: string,
    entityType: string,
    source: ConfigSource,
  ): Result<EntityConfig, Error> {
    const key = this.getKey(entityId, entityType);
    const layers = this.configLayers.get(key);

    if (!layers) {
      return new Err(new Error(`No configuration found for entity: ${entityId} (${entityType})`));
    }

    const layer = layers.find((l) => l.source === source);
    if (!layer) {
      return new Err(
        new Error(`No configuration from source ${source} for entity: ${entityId} (${entityType})`),
      );
    }

    return new Ok(layer.config);
  }

  /**
   * Merge additional configuration with existing config
   */
  mergeConfig(
    entityId: string,
    entityType: string,
    additionalConfig: EntityConfig,
    options?: MergeOptions,
  ): Result<EntityConfig, Error> {
    const currentResult = this.getConfig(entityId, entityType);
    if (currentResult.isErr()) {
      return currentResult;
    }

    const mergeOpts = options || getDefaultMergeOptions(this.options.defaultMergeStrategy);
    const merged = mergeConfigs(currentResult.value, additionalConfig, mergeOpts);

    return new Ok(merged);
  }

  /**
   * Remove configuration for an entity
   */
  removeConfig(entityId: string, entityType: string, source?: ConfigSource): Result<void, Error> {
    const key = this.getKey(entityId, entityType);

    if (source) {
      // Remove specific source layer
      const layers = this.configLayers.get(key);
      if (!layers) {
        return new Err(new Error(`No configuration found for entity: ${entityId} (${entityType})`));
      }

      const filteredLayers = layers.filter((l) => l.source !== source);
      if (filteredLayers.length === layers.length) {
        return new Err(
          new Error(
            `No configuration from source ${source} for entity: ${entityId} (${entityType})`,
          ),
        );
      }

      if (filteredLayers.length === 0) {
        this.configLayers.delete(key);
      } else {
        this.configLayers.set(key, filteredLayers);
      }
    } else {
      // Remove all layers
      this.configLayers.delete(key);
    }

    // Invalidate cache
    this.configCache.delete(key);

    return new Ok(undefined);
  }

  /**
   * Check if configuration exists for an entity
   */
  hasConfig(entityId: string, entityType: string): boolean {
    const key = this.getKey(entityId, entityType);
    return this.configLayers.has(key);
  }

  /**
   * Get configuration metadata
   */
  getMetadata(entityId: string, entityType: string): Result<ConfigMetadata, Error> {
    const key = this.getKey(entityId, entityType);
    const layers = this.configLayers.get(key);

    if (!layers || layers.length === 0) {
      return new Err(new Error(`No configuration found for entity: ${entityId} (${entityType})`));
    }

    const sources = layers.map((l) => l.source);
    const lastUpdated = new Date(Math.max(...layers.map((l) => l.timestamp.getTime())));

    const metadata: ConfigMetadata = {
      entityId,
      entityType,
      version: '2.0.0',
      sources,
      lastUpdated,
    };

    return new Ok(metadata);
  }

  /**
   * Validate configuration against schema
   */
  validateConfig(config: EntityConfig): ValidationResult {
    const result = EntityConfigSchema.safeParse(config);

    if (result.success) {
      return {
        valid: true,
        errors: [],
        warnings: [],
      };
    }

    const errors = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);

    return {
      valid: false,
      errors,
      warnings: [],
    };
  }

  /**
   * Clear all cached configurations
   */
  clearCache(): void {
    this.configCache.clear();
  }

  /**
   * Clear all configurations
   */
  clear(): void {
    this.configLayers.clear();
    this.configCache.clear();
  }

  /**
   * Get all entity keys with configurations
   */
  getAllKeys(): string[] {
    return Array.from(this.configLayers.keys());
  }

  /**
   * Get count of configured entities
   */
  count(): number {
    return this.configLayers.size;
  }

  /**
   * Get source priority for layering
   */
  private getSourcePriority(source: ConfigSource): number {
    const priorities: Record<ConfigSource, number> = {
      [ConfigSource.DEFAULT]: 1,
      [ConfigSource.FILESYSTEM]: 2,
      [ConfigSource.CONTROL_PLANE]: 3,
      [ConfigSource.RUNTIME]: 4,
    };
    return priorities[source];
  }

  /**
   * Generate unique key for entity
   */
  private getKey(entityId: string, entityType: string): string {
    return `${entityType}:${entityId}`;
  }
}
