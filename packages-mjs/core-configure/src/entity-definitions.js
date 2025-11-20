import { Err, Ok } from '@thinkeloquent/core-exceptions';
import { EntityDefinitionSchema } from './types.js';
/**
 * Entity definition registry for managing entity metadata
 */
export class EntityDefinitionRegistry {
    definitions = new Map();
    /**
     * Register a new entity definition
     */
    register(definition) {
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
    get(id, type) {
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
    has(id, type) {
        const key = this.getKey(id, type);
        return this.definitions.has(key);
    }
    /**
     * Update entity definition
     */
    update(definition) {
        const key = this.getKey(definition.id, definition.type);
        const existing = this.definitions.get(key);
        if (!existing) {
            return new Err(new Error(`Entity definition not found: ${definition.id} (${definition.type})`));
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
    remove(id, type) {
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
    getAll() {
        return Array.from(this.definitions.values());
    }
    /**
     * Get all definitions by type
     */
    getByType(type) {
        return Array.from(this.definitions.values()).filter((def) => def.type === type);
    }
    /**
     * Get all enabled definitions
     */
    getEnabled() {
        return Array.from(this.definitions.values()).filter((def) => def.enabled);
    }
    /**
     * Clear all definitions
     */
    clear() {
        this.definitions.clear();
    }
    /**
     * Get count of definitions
     */
    count() {
        return this.definitions.size;
    }
    /**
     * Get count by type
     */
    countByType(type) {
        return this.getByType(type).length;
    }
    /**
     * Enable entity definition
     */
    enable(id, type) {
        return this.update({ id, type, enabled: true });
    }
    /**
     * Disable entity definition
     */
    disable(id, type) {
        return this.update({ id, type, enabled: false });
    }
    /**
     * Generate unique key for entity
     */
    getKey(id, type) {
        return `${type}:${id}`;
    }
}
//# sourceMappingURL=entity-definitions.js.map