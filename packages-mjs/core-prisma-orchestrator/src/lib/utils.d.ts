/**
 * Debounce function - delays execution until after wait milliseconds have elapsed
 * since the last time it was invoked
 */
export declare function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void;
/**
 * Format duration in milliseconds to human-readable string
 */
export declare function formatDuration(ms: number): string;
/**
 * Parse string to integer with fallback
 */
export declare function parseIntSafe(value: string | undefined, fallback: number): number;
/**
 * Check if running in CI environment
 */
export declare function isCI(): boolean;
//# sourceMappingURL=utils.d.ts.map