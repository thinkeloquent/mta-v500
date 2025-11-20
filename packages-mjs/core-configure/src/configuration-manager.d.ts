import { type Result } from '@thinkeloquent/core-exceptions';
import { EntityDefinitionRegistry } from './entity-definitions.js';
import { type ConfigMetadata, ConfigSource, type ConfigurationManagerOptions, type EntityConfig, type MergeOptions, type ValidationResult } from './types.js';
/**
 * Entity configuration manager with layered configuration support
 */
export declare class EntityConfigurationManager {
    private readonly options;
    private readonly configLayers;
    private readonly configCache;
    private readonly definitions;
    constructor(options?: Partial<ConfigurationManagerOptions>);
    /**
     * Get entity definition registry
     */
    getDefinitionRegistry(): EntityDefinitionRegistry;
    /**
     * Set configuration for an entity
     */
    setConfig(entityId: string, entityType: string, config: EntityConfig, source?: ConfigSource): Result<void, Error>;
    /**
     * Get merged configuration for an entity
     */
    getConfig(entityId: string, entityType: string): Result<EntityConfig, Error>;
    /**
     * Get configuration from specific source
     */
    getConfigBySource(entityId: string, entityType: string, source: ConfigSource): Result<EntityConfig, Error>;
    /**
     * Merge additional configuration with existing config
     */
    mergeConfig(entityId: string, entityType: string, additionalConfig: EntityConfig, options?: MergeOptions): Result<EntityConfig, Error>;
    /**
     * Remove configuration for an entity
     */
    removeConfig(entityId: string, entityType: string, source?: ConfigSource): Result<void, Error>;
    /**
     * Check if configuration exists for an entity
     */
    hasConfig(entityId: string, entityType: string): boolean;
    /**
     * Get configuration metadata
     */
    getMetadata(entityId: string, entityType: string): Result<ConfigMetadata, Error>;
    /**
     * Validate configuration against schema
     */
    validateConfig(config: EntityConfig): ValidationResult;
    /**
     * Clear all cached configurations
     */
    clearCache(): void;
    /**
     * Clear all configurations
     */
    clear(): void;
    /**
     * Get all entity keys with configurations
     */
    getAllKeys(): string[];
    /**
     * Get count of configured entities
     */
    count(): number;
    /**
     * Get source priority for layering
     */
    private getSourcePriority;
    /**
     * Generate unique key for entity
     */
    private getKey;
}
//# sourceMappingURL=configuration-manager.d.ts.map