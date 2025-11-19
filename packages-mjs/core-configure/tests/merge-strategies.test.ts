import { describe, expect, it } from 'vitest';
import { getDefaultMergeOptions, mergeConfigs, mergeLayers } from '../src/merge-strategies.js';
import { type EntityConfig, MergeStrategy } from '../src/types.js';

describe('merge-strategies', () => {
  describe('mergeConfigs', () => {
    it('should override target with source using OVERRIDE strategy', () => {
      const target: EntityConfig = {
        plugins: ['plugin1', 'plugin2'],
        settings: { key1: 'value1' },
      };
      const source: EntityConfig = {
        plugins: ['plugin3'],
        settings: { key2: 'value2' },
      };

      const result = mergeConfigs(target, source, { strategy: MergeStrategy.OVERRIDE });

      expect(result).toEqual(source);
      expect(result.plugins).toEqual(['plugin3']);
      expect(result.settings).toEqual({ key2: 'value2' });
    });

    it('should deep merge objects using MERGE strategy', () => {
      const target: EntityConfig = {
        plugins: ['plugin1'],
        settings: { key1: 'value1', nested: { a: 1 } },
      };
      const source: EntityConfig = {
        plugins: ['plugin2'],
        settings: { key2: 'value2', nested: { b: 2 } },
      };

      const result = mergeConfigs(target, source, { strategy: MergeStrategy.MERGE });

      expect(result.plugins).toEqual(['plugin1', 'plugin2']);
      expect(result.settings).toEqual({
        key1: 'value1',
        key2: 'value2',
        nested: { a: 1, b: 2 },
      });
    });

    it('should concatenate arrays by default with MERGE strategy', () => {
      const target: EntityConfig = {
        plugins: ['plugin1', 'plugin2'],
      };
      const source: EntityConfig = {
        plugins: ['plugin2', 'plugin3'],
      };

      const result = mergeConfigs(target, source, {
        strategy: MergeStrategy.MERGE,
        arrayMerge: 'concat',
      });

      expect(result.plugins).toEqual(['plugin1', 'plugin2', 'plugin2', 'plugin3']);
    });

    it('should create unique array values with unique merge', () => {
      const target: EntityConfig = {
        plugins: ['plugin1', 'plugin2'],
      };
      const source: EntityConfig = {
        plugins: ['plugin2', 'plugin3'],
      };

      const result = mergeConfigs(target, source, {
        strategy: MergeStrategy.MERGE,
        arrayMerge: 'unique',
      });

      expect(result.plugins).toEqual(['plugin1', 'plugin2', 'plugin3']);
    });

    it('should replace arrays with source using replace merge', () => {
      const target: EntityConfig = {
        plugins: ['plugin1', 'plugin2'],
      };
      const source: EntityConfig = {
        plugins: ['plugin3'],
      };

      const result = mergeConfigs(target, source, {
        strategy: MergeStrategy.MERGE,
        arrayMerge: 'replace',
      });

      expect(result.plugins).toEqual(['plugin3']);
    });

    it('should extend without overriding existing keys using EXTEND strategy', () => {
      const target: EntityConfig = {
        plugins: ['plugin1'],
        settings: { key1: 'value1', nested: { a: 1 } },
      };
      const source: EntityConfig = {
        plugins: ['plugin2'],
        settings: { key1: 'new_value1', key2: 'value2', nested: { b: 2 } },
        routes: ['route1'],
      };

      const result = mergeConfigs(target, source, { strategy: MergeStrategy.EXTEND });

      expect(result.plugins).toEqual(['plugin1', 'plugin2']); // Arrays are extended uniquely
      expect(result.settings?.key1).toBe('value1'); // Existing key not overridden
      expect(result.settings?.key2).toBe('value2'); // New key added
      expect(result.routes).toEqual(['route1']); // New top-level key added
    });

    it('should handle custom merge function', () => {
      const target: EntityConfig = {
        settings: { count: 1 },
      };
      const source: EntityConfig = {
        settings: { count: 5 },
      };

      const result = mergeConfigs(target, source, {
        strategy: MergeStrategy.MERGE,
        customMerge: (key: string, targetValue: unknown, sourceValue: unknown) => {
          if (
            key === 'count' &&
            typeof targetValue === 'number' &&
            typeof sourceValue === 'number'
          ) {
            return targetValue + sourceValue;
          }
          return sourceValue;
        },
      });

      expect(result.settings?.count).toBe(6);
    });

    it('should handle empty configs', () => {
      const target: EntityConfig = {};
      const source: EntityConfig = { plugins: ['plugin1'] };

      const result = mergeConfigs(target, source, { strategy: MergeStrategy.MERGE });

      expect(result).toEqual(source);
    });
  });

  describe('mergeLayers', () => {
    it('should merge multiple configuration layers', () => {
      const layers: EntityConfig[] = [
        { plugins: ['plugin1'], settings: { key1: 'value1' } },
        { plugins: ['plugin2'], settings: { key2: 'value2' } },
        { settings: { key3: 'value3' } },
      ];

      const result = mergeLayers(layers, { strategy: MergeStrategy.MERGE });

      expect(result.plugins).toEqual(['plugin1', 'plugin2']);
      expect(result.settings).toEqual({
        key1: 'value1',
        key2: 'value2',
        key3: 'value3',
      });
    });

    it('should return empty config for empty layers', () => {
      const result = mergeLayers([], { strategy: MergeStrategy.MERGE });
      expect(result).toEqual({});
    });

    it('should return single layer unchanged', () => {
      const layer: EntityConfig = { plugins: ['plugin1'] };
      const result = mergeLayers([layer], { strategy: MergeStrategy.MERGE });
      expect(result).toEqual(layer);
    });
  });

  describe('getDefaultMergeOptions', () => {
    it('should return default options for MERGE strategy', () => {
      const options = getDefaultMergeOptions(MergeStrategy.MERGE);
      expect(options.strategy).toBe(MergeStrategy.MERGE);
      expect(options.arrayMerge).toBe('concat');
    });

    it('should return unique array merge for EXTEND strategy', () => {
      const options = getDefaultMergeOptions(MergeStrategy.EXTEND);
      expect(options.strategy).toBe(MergeStrategy.EXTEND);
      expect(options.arrayMerge).toBe('unique');
    });

    it('should return default options for OVERRIDE strategy', () => {
      const options = getDefaultMergeOptions(MergeStrategy.OVERRIDE);
      expect(options.strategy).toBe(MergeStrategy.OVERRIDE);
      expect(options.arrayMerge).toBe('concat');
    });
  });
});
