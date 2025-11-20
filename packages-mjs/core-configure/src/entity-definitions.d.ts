import { type Result } from '@thinkeloquent/core-exceptions';
import { type EntityDefinition } from './types.js';
/**
 * Entity definition registry for managing entity metadata
 */
export declare class EntityDefinitionRegistry {
    private definitions;
    /**
     * Register a new entity definition
     */
    register(definition: EntityDefinition): Result<void, Error>;
    /**
     * Get entity definition by ID and type
     */
    get(id: string, type: string): Result<EntityDefinition, Error>;
    /**
     * Check if entity definition exists
     */
    has(id: string, type: string): boolean;
    /**
     * Update entity definition
     */
    update(definition: Partial<EntityDefinition> & {
        id: string;
        type: string;
    }): Result<void, Error>;
    /**
     * Remove entity definition
     */
    remove(id: string, type: string): Result<void, Error>;
    /**
     * Get all entity definitions
     */
    getAll(): EntityDefinition[];
    /**
     * Get all definitions by type
     */
    getByType(type: string): EntityDefinition[];
    /**
     * Get all enabled definitions
     */
    getEnabled(): EntityDefinition[];
    /**
     * Clear all definitions
     */
    clear(): void;
    /**
     * Get count of definitions
     */
    count(): number;
    /**
     * Get count by type
     */
    countByType(type: string): number;
    /**
     * Enable entity definition
     */
    enable(id: string, type: string): Result<void, Error>;
    /**
     * Disable entity definition
     */
    disable(id: string, type: string): Result<void, Error>;
    /**
     * Generate unique key for entity
     */
    private getKey;
}
//# sourceMappingURL=entity-definitions.d.ts.map