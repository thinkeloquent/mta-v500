/**
 * @module @internal/core-configure
 * @description Entity configuration management with deep merging, validation, and entity definitions
 *
 * Features:
 * - Layered configuration with source priority (default < filesystem < control_plane < runtime)
 * - Deep merge strategies (override, merge, extend)
 * - Entity definition registry
 * - Zod schema validation
 * - Configuration caching
 * - Result<T,E> error handling
 *
 * @example
 * ```typescript
 * import { EntityConfigurationManager, ConfigSource } from '@internal/core-configure';
 *
 * const manager = new EntityConfigurationManager({
 *   defaultMergeStrategy: MergeStrategy.MERGE,
 *   enableValidation: true,
 *   enableCaching: true,
 * });
 *
 * // Set configuration from filesystem
 * manager.setConfig('tenant-1', 'tenant', {
 *   plugins: ['auth', 'logging'],
 *   settings: { theme: 'dark' }
 * }, ConfigSource.FILESYSTEM);
 *
 * // Override with runtime config
 * manager.setConfig('tenant-1', 'tenant', {
 *   settings: { apiKey: 'secret' }
 * }, ConfigSource.RUNTIME);
 *
 * // Get merged configuration
 * const configResult = manager.getConfig('tenant-1', 'tenant');
 * if (configResult.isOk()) {
 *   console.log(configResult.value);
 *   // { plugins: ['auth', 'logging'], settings: { theme: 'dark', apiKey: 'secret' } }
 * }
 * ```
 */

export { EntityConfigurationManager } from './configuration-manager.js';
export { EntityDefinitionRegistry } from './entity-definitions.js';
export { getDefaultMergeOptions, mergeConfigs, mergeLayers } from './merge-strategies.js';
export {
  type ConfigLayer,
  type ConfigMetadata,
  ConfigSource,
  type ConfigurationManagerOptions,
  ConfigurationManagerOptionsSchema,
  type EntityConfig,
  EntityConfigSchema,
  type EntityDefinition,
  EntityDefinitionSchema,
  type MergeOptions,
  MergeStrategy,
  type ValidationResult,
} from './types.js';
