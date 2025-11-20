import type { MtaPrismaConfig } from '../types/config.js';
export interface WatchOptions {
    app?: string;
    debounceMs?: number;
}
/**
 * Watch schema files and regenerate on changes
 */
export declare function watchCommand(config: MtaPrismaConfig, options?: WatchOptions): Promise<void>;
//# sourceMappingURL=watch.d.ts.map