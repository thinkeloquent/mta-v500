/**
 * Debounce function - delays execution until after wait milliseconds have elapsed
 * since the last time it was invoked
 */
export function debounce(func, wait) {
    let timeout = null;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            func(...args);
        };
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(later, wait);
    };
}
/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms) {
    if (ms < 1000) {
        return `${ms}ms`;
    }
    else if (ms < 60000) {
        return `${(ms / 1000).toFixed(1)}s`;
    }
    else {
        const minutes = Math.floor(ms / 60000);
        const seconds = ((ms % 60000) / 1000).toFixed(0);
        return `${minutes}m ${seconds}s`;
    }
}
/**
 * Parse string to integer with fallback
 */
export function parseIntSafe(value, fallback) {
    if (!value)
        return fallback;
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
}
/**
 * Check if running in CI environment
 */
export function isCI() {
    return !!(process.env.CI ||
        process.env.CONTINUOUS_INTEGRATION ||
        process.env.BUILD_NUMBER ||
        process.env.GITHUB_ACTIONS ||
        process.env.GITLAB_CI ||
        process.env.CIRCLECI ||
        process.env.TRAVIS);
}
//# sourceMappingURL=utils.js.map