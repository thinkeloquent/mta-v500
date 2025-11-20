import type { MtaPrismaConfig } from '../types/config.js';
export interface GenerateOptions {
    app?: string;
    watch?: boolean;
    parallel?: boolean;
    concurrency?: number;
}
/**
 * Generate Prisma clients for apps
 */
export declare function generateCommand(config: MtaPrismaConfig, options?: GenerateOptions): Promise<void>;
//# sourceMappingURL=generate.d.ts.map