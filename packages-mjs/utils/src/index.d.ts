/**
 * MTA Utilities Library
 * Shared utility functions for all MTA applications
 */
/**
 * Format date to ISO string
 */
export declare function formatDate(date: Date): string;
/**
 * Sleep/delay utility
 */
export declare function sleep(ms: number): Promise<void>;
/**
 * Deep clone an object
 */
export declare function deepClone<T>(obj: T): T;
declare const _default: {
    formatDate: typeof formatDate;
    sleep: typeof sleep;
    deepClone: typeof deepClone;
};
export default _default;
//# sourceMappingURL=index.d.ts.map