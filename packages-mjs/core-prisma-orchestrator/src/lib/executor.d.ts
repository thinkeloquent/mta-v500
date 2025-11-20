import type { AppConfig } from '../types/config.js';
export interface ExecuteOptions {
    /**
     * Working directory
     */
    cwd?: string;
    /**
     * Environment variables
     */
    env?: Record<string, string>;
    /**
     * Whether to show output
     */
    silent?: boolean;
    /**
     * Dry run mode (don't execute)
     */
    dryRun?: boolean;
}
/**
 * Execute Prisma command for an app
 */
export declare function executePrisma(app: AppConfig, command: string, args?: string[], options?: ExecuteOptions): Promise<{
    success: boolean;
    output?: string;
    error?: Error;
    duration: number;
}>;
/**
 * Execute Prisma command for multiple apps in parallel
 */
export declare function executePrismaParallel(apps: AppConfig[], command: string, args?: string[], options?: ExecuteOptions, concurrency?: number): Promise<Map<string, {
    success: boolean;
    error?: Error;
    duration: number;
}>>;
/**
 * Execute Prisma command for apps in sequence (dependency order)
 */
export declare function executePrismaSequential(apps: AppConfig[], command: string, args?: string[], options?: ExecuteOptions): Promise<Map<string, {
    success: boolean;
    error?: Error;
    duration: number;
}>>;
//# sourceMappingURL=executor.d.ts.map