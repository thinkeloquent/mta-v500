import type { MtaPrismaConfig } from '../types/config.js';
/**
 * Show diff between schema and database
 */
export declare function migrateDiffCommand(config: MtaPrismaConfig, options?: {
    app?: string;
    fromEmpty?: boolean;
}): Promise<void>;
/**
 * Resolve migration issues (mark as applied or rolled back)
 */
export declare function migrateResolveCommand(config: MtaPrismaConfig, migration: string, options?: {
    app?: string;
    applied?: boolean;
    rolledBack?: boolean;
}): Promise<void>;
/**
 * Create a baseline migration (for existing databases)
 */
export declare function migrateBaselineCommand(config: MtaPrismaConfig, migration: string, options?: {
    app?: string;
}): Promise<void>;
//# sourceMappingURL=migrate-advanced.d.ts.map