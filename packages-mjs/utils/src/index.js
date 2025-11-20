/**
 * MTA Utilities Library
 * Shared utility functions for all MTA applications
 */
/**
 * Format date to ISO string
 */
export function formatDate(date) {
    return date.toISOString();
}
/**
 * Sleep/delay utility
 */
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Deep clone an object
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
export default { formatDate, sleep, deepClone };
//# sourceMappingURL=index.js.map