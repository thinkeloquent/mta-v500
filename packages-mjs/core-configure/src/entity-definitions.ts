import { Err, Ok, type Result } from '@internal/core-exceptions';
import { type EntityDefinition, EntityDefinitionSchema } from './types.js';

/**
 * Entity definition registry for managing entity metadata
 */
export class EntityDefinitionRegistry {
  private definitions = new Map<string, EntityDefinition>();

  /**
   * Register a new entity definition
   */
  register(definition: EntityDefinition): Result<void, Error> {
    const validation = EntityDefinitionSchema.safeParse(definition);
    if (!validation.success) {
      return new Err(new Error(`Invalid entity definition: ${validation.error.message}`));
    }

    const key = this.getKey(definition.id, definition.type);
    this.definitions.set(key, validation.data);
    return new Ok(undefined);
  }

  /**
   * Get entity definition by ID and type
   */
  get(id: string, type: string): Result<EntityDefinition, Error> {
    const key = this.getKey(id, type);
    const definition = this.definitions.get(key);

    if (!definition) {
      return new Err(new Error(`Entity definition not found: ${id} (${type})`));
    }

    return new Ok(definition);
  }

  /**
   * Check if entity definition exists
   */
  has(id: string, type: string): boolean {
    const key = this.getKey(id, type);
    return this.definitions.has(key);
  }

  /**
   * Update entity definition
   */
  update(
    definition: Partial<EntityDefinition> & { id: string; type: string },
  ): Result<void, Error> {
    const key = this.getKey(definition.id, definition.type);
    const existing = this.definitions.get(key);

    if (!existing) {
      return new Err(
        new Error(`Entity definition not found: ${definition.id} (${definition.type})`),
      );
    }

    const updated = {
      ...existing,
      ...definition,
      updatedAt: new Date(),
    };

    const validation = EntityDefinitionSchema.safeParse(updated);
    if (!validation.success) {
      return new Err(new Error(`Invalid entity definition update: ${validation.error.message}`));
    }

    this.definitions.set(key, validation.data);
    return new Ok(undefined);
  }

  /**
   * Remove entity definition
   */
  remove(id: string, type: string): Result<void, Error> {
    const key = this.getKey(id, type);
    const deleted = this.definitions.delete(key);

    if (!deleted) {
      return new Err(new Error(`Entity definition not found: ${id} (${type})`));
    }

    return new Ok(undefined);
  }

  /**
   * Get all entity definitions
   */
  getAll(): EntityDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * Get all definitions by type
   */
  getByType(type: string): EntityDefinition[] {
    return Array.from(this.definitions.values()).filter((def) => def.type === type);
  }

  /**
   * Get all enabled definitions
   */
  getEnabled(): EntityDefinition[] {
    return Array.from(this.definitions.values()).filter((def) => def.enabled);
  }

  /**
   * Clear all definitions
   */
  clear(): void {
    this.definitions.clear();
  }

  /**
   * Get count of definitions
   */
  count(): number {
    return this.definitions.size;
  }

  /**
   * Get count by type
   */
  countByType(type: string): number {
    return this.getByType(type).length;
  }

  /**
   * Enable entity definition
   */
  enable(id: string, type: string): Result<void, Error> {
    return this.update({ id, type, enabled: true });
  }

  /**
   * Disable entity definition
   */
  disable(id: string, type: string): Result<void, Error> {
    return this.update({ id, type, enabled: false });
  }

  /**
   * Generate unique key for entity
   */
  private getKey(id: string, type: string): string {
    return `${type}:${id}`;
  }
}
