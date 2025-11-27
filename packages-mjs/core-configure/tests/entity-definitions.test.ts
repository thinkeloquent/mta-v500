import { beforeEach, describe, expect, it } from 'vitest';
import { EntityDefinitionRegistry } from '../src/entity-definitions.js';
import type { EntityDefinition } from '../src/types.js';

describe('EntityDefinitionRegistry', () => {
  let registry: EntityDefinitionRegistry;

  beforeEach(() => {
    registry = new EntityDefinitionRegistry();
  });

  describe('register', () => {
    it('should register a valid entity definition', () => {
      const definition: EntityDefinition = {
        id: 'tenant-1',
        type: 'tenant',
        name: 'Tenant 1',
        enabled: true,
      };

      const result = registry.register(definition);

      expect(result.isOk()).toBe(true);
      expect(registry.has('tenant-1', 'tenant')).toBe(true);
    });

    it('should reject invalid entity definition', () => {
      const invalidDefinition = {
        id: '',
        type: 'tenant',
        name: 'Invalid',
      } as EntityDefinition;

      const result = registry.register(invalidDefinition);

      expect(result.isErr()).toBe(true);
      expect(result.isErr() && result.error.message).toContain('Invalid entity definition');
    });

    it('should register definition with metadata', () => {
      const definition: EntityDefinition = {
        id: 'tenant-1',
        type: 'tenant',
        name: 'Tenant 1',
        description: 'Test tenant',
        enabled: true,
        metadata: {
          region: 'us-east-1',
          tier: 'premium',
        },
      };

      const result = registry.register(definition);

      expect(result.isOk()).toBe(true);
      const getResult = registry.get('tenant-1', 'tenant');
      expect(getResult.isOk()).toBe(true);
      if (getResult.isOk()) {
        expect(getResult.value.metadata).toEqual({
          region: 'us-east-1',
          tier: 'premium',
        });
      }
    });
  });

  describe('get', () => {
    it('should retrieve registered entity definition', () => {
      const definition: EntityDefinition = {
        id: 'tenant-1',
        type: 'tenant',
        name: 'Tenant 1',
        enabled: true,
      };

      registry.register(definition);
      const result = registry.get('tenant-1', 'tenant');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe('tenant-1');
        expect(result.value.name).toBe('Tenant 1');
      }
    });

    it('should return error for non-existent definition', () => {
      const result = registry.get('non-existent', 'tenant');

      expect(result.isErr()).toBe(true);
      expect(result.isErr() && result.error.message).toContain('not found');
    });
  });

  describe('update', () => {
    it('should update existing entity definition', () => {
      const definition: EntityDefinition = {
        id: 'tenant-1',
        type: 'tenant',
        name: 'Tenant 1',
        enabled: true,
      };

      registry.register(definition);
      const updateResult = registry.update({
        id: 'tenant-1',
        type: 'tenant',
        name: 'Updated Tenant',
      });

      expect(updateResult.isOk()).toBe(true);
      const getResult = registry.get('tenant-1', 'tenant');
      expect(getResult.isOk() && getResult.value.name).toBe('Updated Tenant');
    });

    it('should set updatedAt timestamp on update', () => {
      const definition: EntityDefinition = {
        id: 'tenant-1',
        type: 'tenant',
        name: 'Tenant 1',
        enabled: true,
      };

      registry.register(definition);
      const before = new Date();
      registry.update({ id: 'tenant-1', type: 'tenant', name: 'Updated' });
      const after = new Date();

      const getResult = registry.get('tenant-1', 'tenant');
      if (getResult.isOk()) {
        expect(getResult.value.updatedAt).toBeDefined();
        const updated = getResult.value.updatedAt!;
        expect(updated.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(updated.getTime()).toBeLessThanOrEqual(after.getTime());
      }
    });

    it('should return error when updating non-existent definition', () => {
      const result = registry.update({
        id: 'non-existent',
        type: 'tenant',
        name: 'Test',
      });

      expect(result.isErr()).toBe(true);
      expect(result.isErr() && result.error.message).toContain('not found');
    });
  });

  describe('remove', () => {
    it('should remove existing entity definition', () => {
      const definition: EntityDefinition = {
        id: 'tenant-1',
        type: 'tenant',
        name: 'Tenant 1',
        enabled: true,
      };

      registry.register(definition);
      expect(registry.has('tenant-1', 'tenant')).toBe(true);

      const removeResult = registry.remove('tenant-1', 'tenant');
      expect(removeResult.isOk()).toBe(true);
      expect(registry.has('tenant-1', 'tenant')).toBe(false);
    });

    it('should return error when removing non-existent definition', () => {
      const result = registry.remove('non-existent', 'tenant');

      expect(result.isErr()).toBe(true);
      expect(result.isErr() && result.error.message).toContain('not found');
    });
  });

  describe('getAll', () => {
    it('should return all entity definitions', () => {
      const def1: EntityDefinition = {
        id: 'tenant-1',
        type: 'tenant',
        name: 'Tenant 1',
        enabled: true,
      };
      const def2: EntityDefinition = {
        id: 'org-1',
        type: 'organization',
        name: 'Org 1',
        enabled: true,
      };

      registry.register(def1);
      registry.register(def2);

      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all.some((d) => d.id === 'tenant-1')).toBe(true);
      expect(all.some((d) => d.id === 'org-1')).toBe(true);
    });

    it('should return empty array when no definitions exist', () => {
      const all = registry.getAll();
      expect(all).toEqual([]);
    });
  });

  describe('getByType', () => {
    it('should return definitions filtered by type', () => {
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
      const org: EntityDefinition = {
        id: 'org-1',
        type: 'organization',
        name: 'Org 1',
        enabled: true,
      };

      registry.register(tenant1);
      registry.register(tenant2);
      registry.register(org);

      const tenants = registry.getByType('tenant');
      expect(tenants).toHaveLength(2);
      expect(tenants.every((d) => d.type === 'tenant')).toBe(true);
    });
  });

  describe('getEnabled', () => {
    it('should return only enabled definitions', () => {
      const enabled: EntityDefinition = {
        id: 'tenant-1',
        type: 'tenant',
        name: 'Enabled',
        enabled: true,
      };
      const disabled: EntityDefinition = {
        id: 'tenant-2',
        type: 'tenant',
        name: 'Disabled',
        enabled: false,
      };

      registry.register(enabled);
      registry.register(disabled);

      const enabledDefs = registry.getEnabled();
      expect(enabledDefs).toHaveLength(1);
      expect(enabledDefs[0]?.id).toBe('tenant-1');
    });
  });

  describe('enable and disable', () => {
    it('should enable a disabled definition', () => {
      const definition: EntityDefinition = {
        id: 'tenant-1',
        type: 'tenant',
        name: 'Tenant 1',
        enabled: false,
      };

      registry.register(definition);
      const result = registry.enable('tenant-1', 'tenant');

      expect(result.isOk()).toBe(true);
      const getResult = registry.get('tenant-1', 'tenant');
      expect(getResult.isOk() && getResult.value.enabled).toBe(true);
    });

    it('should disable an enabled definition', () => {
      const definition: EntityDefinition = {
        id: 'tenant-1',
        type: 'tenant',
        name: 'Tenant 1',
        enabled: true,
      };

      registry.register(definition);
      const result = registry.disable('tenant-1', 'tenant');

      expect(result.isOk()).toBe(true);
      const getResult = registry.get('tenant-1', 'tenant');
      expect(getResult.isOk() && getResult.value.enabled).toBe(false);
    });
  });

  describe('count', () => {
    it('should return count of all definitions', () => {
      expect(registry.count()).toBe(0);

      registry.register({
        id: 'tenant-1',
        type: 'tenant',
        name: 'Tenant 1',
        enabled: true,
      });

      expect(registry.count()).toBe(1);

      registry.register({
        id: 'org-1',
        type: 'organization',
        name: 'Org 1',
        enabled: true,
      });

      expect(registry.count()).toBe(2);
    });
  });

  describe('countByType', () => {
    it('should return count of definitions by type', () => {
      registry.register({
        id: 'tenant-1',
        type: 'tenant',
        name: 'Tenant 1',
        enabled: true,
      });
      registry.register({
        id: 'tenant-2',
        type: 'tenant',
        name: 'Tenant 2',
        enabled: true,
      });
      registry.register({
        id: 'org-1',
        type: 'organization',
        name: 'Org 1',
        enabled: true,
      });

      expect(registry.countByType('tenant')).toBe(2);
      expect(registry.countByType('organization')).toBe(1);
      expect(registry.countByType('non-existent')).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all definitions', () => {
      registry.register({
        id: 'tenant-1',
        type: 'tenant',
        name: 'Tenant 1',
        enabled: true,
      });
      registry.register({
        id: 'tenant-2',
        type: 'tenant',
        name: 'Tenant 2',
        enabled: true,
      });

      expect(registry.count()).toBe(2);
      registry.clear();
      expect(registry.count()).toBe(0);
    });
  });
});
