import deepmerge from 'deepmerge';
import { MergeStrategy } from './types.js';
/**
 * Determines if a value is a plain object
 */
function isPlainObject(value) {
    return (typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        !(value instanceof Date) &&
        !(value instanceof RegExp));
}
/**
 * Override merge: source completely replaces target
 */
function overrideMerge(_target, source) {
    return { ...source };
}
/**
 * Deep merge with custom merge support for all keys
 */
function deepMergeWithCustom(target, source, options, customMergeFn) {
    const result = { ...target };
    const sourceRecord = source;
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
            if (customResult !== sourceValue ||
                !isPlainObject(sourceValue) ||
                !isPlainObject(targetValue)) {
                result[key] = customResult;
                continue;
            }
            // Otherwise fall through to handle nested objects
        }
        // Handle different value types
        if (targetValue === undefined) {
            result[key] = sourceValue;
        }
        else if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
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
        }
        else if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
            // Recursively merge objects
            result[key] = deepMergeWithCustom(targetValue, sourceValue, options, customMergeFn);
        }
        else {
            // For primitives, use source value
            result[key] = sourceValue;
        }
    }
    return result;
}
/**
 * Deep merge: recursively merge objects and arrays
 */
function deepMerge(target, source, options) {
    if (options.customMerge) {
        return deepMergeWithCustom(target, source, options, options.customMerge);
    }
    // No custom merge, use deepmerge library
    const arrayMergeStrategy = options.arrayMerge || 'concat';
    return deepmerge(target, source, {
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
function extendMerge(target, source) {
    const result = { ...target };
    for (const [key, value] of Object.entries(source)) {
        const typedKey = key;
        if (!(typedKey in result)) {
            // Key doesn't exist, add it
            result[key] = value;
        }
        else if (isPlainObject(result[typedKey]) && isPlainObject(value)) {
            // Both are objects, recursively extend
            result[key] = extendMerge(result[typedKey], value);
        }
        else if (Array.isArray(result[typedKey]) && Array.isArray(value)) {
            // Both are arrays, concatenate unique values
            const existingArray = result[typedKey];
            const newValues = value.filter((v) => !existingArray.includes(v));
            result[key] = [...existingArray, ...newValues];
        }
        // Otherwise, keep existing value (don't override)
    }
    return result;
}
/**
 * Apply merge strategy to combine configurations
 */
export function mergeConfigs(target, source, options) {
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
export function mergeLayers(layers, options) {
    if (layers.length === 0) {
        return {};
    }
    if (layers.length === 1) {
        return layers[0];
    }
    return layers.reduce((accumulated, current) => {
        return mergeConfigs(accumulated, current, options);
    });
}
/**
 * Get default merge options
 */
export function getDefaultMergeOptions(strategy) {
    return {
        strategy,
        arrayMerge: strategy === MergeStrategy.EXTEND ? 'unique' : 'concat',
    };
}
//# sourceMappingURL=merge-strategies.js.map