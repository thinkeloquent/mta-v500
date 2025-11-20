import type { ProcessExceptionOptions } from './types.js';
/**
 * Default configuration for process-exception plugin
 * All features enabled with balanced settings
 * Uses shorter timeout for development to work with tsx watch mode (5s kill timeout)
 */
export declare const defaultConfig: ProcessExceptionOptions;
/**
 * Development configuration
 * More verbose logging, shorter timeout for faster iteration
 * 5 seconds allows tsx watch mode to cleanly restart (tsx uses 5s kill timeout)
 */
export declare const devConfig: ProcessExceptionOptions;
/**
 * Production configuration
 * Longer timeout to allow for proper cleanup
 * All features enabled for maximum reliability
 */
export declare const prodConfig: ProcessExceptionOptions;
/**
 * Minimal configuration
 * Only essential error handling, no process handlers
 * Useful for environments where process handlers might conflict
 */
export declare const minimalConfig: ProcessExceptionOptions;
//# sourceMappingURL=config.d.ts.map