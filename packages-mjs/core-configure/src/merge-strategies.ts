import deepmerge from 'deepmerge';
import { type EntityConfig, type MergeOptions, MergeStrategy } from './types.js';

/**
 * Determines if a value is a plain object
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !(value instanceof RegExp)
  );
}

/**
 * Override merge: source completely replaces target
 */
function overrideMerge(_target: EntityConfig, source: EntityConfig): EntityConfig {
  return { ...source };
}

/**
 * Deep merge with custom merge support for all keys
 */
function deepMergeWithCustom(
  target: EntityConfig,
  source: EntityConfig,
  options: MergeOptions,
  customMergeFn?: (key: string, targetValue: unknown, sourceValue: unknown) => unknown,
): EntityConfig {
  const result: Record<string, unknown> = { ...target };
  const sourceRecord = source as Record<string, unknown>;

  for (const key in source) {
    if (!Object.hasOwn(source, key)) {
      continue;
    }

    const sourceValue = sourceRecord[key];
    const targetValue = result[key];

    // If there's a custom merge function, try it first
    if (customMergeFn) {
      const customResult = customMergeFn(key, targetValue, sourceValue);

      // If customMerge handled it (returned something other than default), use that
      if (
        customResult !== sourceValue ||
        !isPlainObject(sourceValue) ||
        !isPlainObject(targetValue)
      ) {
        result[key] = customResult;
        continue;
      }
      // Otherwise fall through to handle nested objects
    }

    // Handle different value types
    if (targetValue === undefined) {
      result[key] = sourceValue;
    } else if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
      // Handle arrays based on strategy
      const arrayMergeStrategy = options.arrayMerge || 'concat';
      switch (arrayMergeStrategy) {
        case 'replace':
          result[key] = sourceValue;
          break;
        case 'unique':
          result[key] = Array.from(new Set([...targetValue, ...sourceValue]));
          break;
        default:
          result[key] = [...targetValue, ...sourceValue];
      }
    } else if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
      // Recursively merge objects
      result[key] = deepMergeWithCustom(
        targetValue as EntityConfig,
        sourceValue as EntityConfig,
        options,
        customMergeFn,
      );
    } else {
      // For primitives, use source value
      result[key] = sourceValue;
    }
  }

  return result as EntityConfig;
}

/**
 * Deep merge: recursively merge objects and arrays
 */
function deepMerge(
  target: EntityConfig,
  source: EntityConfig,
  options: MergeOptions,
): EntityConfig {
  if (options.customMerge) {
    return deepMergeWithCustom(target, source, options, options.customMerge);
  }

  // No custom merge, use deepmerge library
  const arrayMergeStrategy = options.arrayMerge || 'concat';
  return deepmerge<EntityConfig>(target, source, {
    arrayMerge: (targetArray, sourceArray) => {
      switch (arrayMergeStrategy) {
        case 'replace':
          return sourceArray;
        case 'unique':
          return Array.from(new Set([...targetArray, ...sourceArray]));
        default:
          return [...targetArray, ...sourceArray];
      }
    },
  });
}

/**
 * Extend merge: add new keys without replacing existing ones
 */
function extendMerge(target: EntityConfig, source: EntityConfig): EntityConfig {
  const result = { ...target };

  for (const [key, value] of Object.entries(source)) {
    const typedKey = key as keyof EntityConfig;
    if (!(typedKey in result)) {
      // Key doesn't exist, add it
      (result as Record<string, unknown>)[key] = value;
    } else if (isPlainObject(result[typedKey]) && isPlainObject(value)) {
      // Both are objects, recursively extend
      (result as Record<string, unknown>)[key] = extendMerge(
        result[typedKey] as EntityConfig,
        value as EntityConfig,
      );
    } else if (Array.isArray(result[typedKey]) && Array.isArray(value)) {
      // Both are arrays, concatenate unique values
      const existingArray = result[typedKey] as unknown[];
      const newValues = (value as unknown[]).filter((v) => !existingArray.includes(v));
      (result as Record<string, unknown>)[key] = [...existingArray, ...newValues];
    }
    // Otherwise, keep existing value (don't override)
  }

  return result;
}

/**
 * Apply merge strategy to combine configurations
 */
export function mergeConfigs(
  target: EntityConfig,
  source: EntityConfig,
  options: MergeOptions,
): EntityConfig {
  switch (options.strategy) {
    case MergeStrategy.OVERRIDE:
      return overrideMerge(target, source);
    case MergeStrategy.EXTEND:
      return extendMerge(target, source);
    default:
      return deepMerge(target, source, options);
  }
}

/**
 * Merge multiple configuration layers in priority order
 */
export function mergeLayers(layers: EntityConfig[], options: MergeOptions): EntityConfig {
  if (layers.length === 0) {
    return {};
  }

  if (layers.length === 1) {
    return layers[0]!;
  }

  return layers.reduce((accumulated, current) => {
    return mergeConfigs(accumulated, current, options);
  });
}

/**
 * Get default merge options
 */
export function getDefaultMergeOptions(strategy: MergeStrategy): MergeOptions {
  return {
    strategy,
    arrayMerge: strategy === MergeStrategy.EXTEND ? 'unique' : 'concat',
  };
}
