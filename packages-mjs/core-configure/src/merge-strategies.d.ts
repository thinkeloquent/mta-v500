import { type EntityConfig, type MergeOptions, MergeStrategy } from './types.js';
/**
 * Apply merge strategy to combine configurations
 */
export declare function mergeConfigs(target: EntityConfig, source: EntityConfig, options: MergeOptions): EntityConfig;
/**
 * Merge multiple configuration layers in priority order
 */
export declare function mergeLayers(layers: EntityConfig[], options: MergeOptions): EntityConfig;
/**
 * Get default merge options
 */
export declare function getDefaultMergeOptions(strategy: MergeStrategy): MergeOptions;
//# sourceMappingURL=merge-strategies.d.ts.map