/**
 * Default configuration for process-exception plugin
 * All features enabled with balanced settings
 * Uses shorter timeout for development to work with tsx watch mode (5s kill timeout)
 */
export const defaultConfig = {
    enableErrorHandler: true,
    enableGracefulShutdown: true,
    enableProcessHandlers: true,
    shutdownTimeout: 10000, // 10 seconds - balanced default
    exposeGracefulShutdown: true,
    features: {
        validationErrors: true,
        handleSigInt: true,
        handleSigTerm: true,
        handleUnhandledRejection: true,
        handleUncaughtException: true,
    },
};
/**
 * Development configuration
 * More verbose logging, shorter timeout for faster iteration
 * 5 seconds allows tsx watch mode to cleanly restart (tsx uses 5s kill timeout)
 */
export const devConfig = {
    enableErrorHandler: true,
    enableGracefulShutdown: true,
    enableProcessHandlers: true,
    shutdownTimeout: 5000, // 5 seconds for tsx watch mode compatibility
    exposeGracefulShutdown: true,
    features: {
        validationErrors: true,
        handleSigInt: true,
        handleSigTerm: true,
        handleUnhandledRejection: true,
        handleUncaughtException: true,
    },
};
/**
 * Production configuration
 * Longer timeout to allow for proper cleanup
 * All features enabled for maximum reliability
 */
export const prodConfig = {
    enableErrorHandler: true,
    enableGracefulShutdown: true,
    enableProcessHandlers: true,
    shutdownTimeout: 30000, // 30 seconds for proper cleanup
    exposeGracefulShutdown: true,
    features: {
        validationErrors: true,
        handleSigInt: true,
        handleSigTerm: true,
        handleUnhandledRejection: true,
        handleUncaughtException: true,
    },
};
/**
 * Minimal configuration
 * Only essential error handling, no process handlers
 * Useful for environments where process handlers might conflict
 */
export const minimalConfig = {
    enableErrorHandler: true,
    enableGracefulShutdown: false,
    enableProcessHandlers: false,
    shutdownTimeout: 5000,
    exposeGracefulShutdown: false,
    features: {
        validationErrors: true,
        handleSigInt: false,
        handleSigTerm: false,
        handleUnhandledRejection: false,
        handleUncaughtException: false,
    },
};
//# sourceMappingURL=config.js.map