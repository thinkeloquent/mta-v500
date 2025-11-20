import type { MtaPrismaConfig } from '../types/config.js';
export interface MigrateOptions {
    app?: string;
    name?: string;
    createOnly?: boolean;
    skipGenerate?: boolean;
}
/**
 * Create and apply development migrations
 */
export declare function migrateDevCommand(config: MtaPrismaConfig, options?: MigrateOptions): Promise<void>;
/**
 * Deploy migrations to production
 */
export declare function migrateDeployCommand(config: MtaPrismaConfig, options?: {
    app?: string;
}): Promise<void>;
/**
 * Show migration status
 */
export declare function migrateStatusCommand(config: MtaPrismaConfig, options?: {
    app?: string;
}): Promise<void>;
/**
 * Reset database and migrations
 */
export declare function migrateResetCommand(config: MtaPrismaConfig, options?: {
    app?: string;
    force?: boolean;
}): Promise<void>;
//# sourceMappingURL=migrate.d.ts.map