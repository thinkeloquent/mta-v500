import type { DecoratorInfo, RegisterOptions, RegistrationResult } from './types.js';
export type { DecoratorInfo, RegistrationResult, RegisterOptions };
/**
 * Register a new decorator in the global registry
 *
 * @param options - Registration options
 * @returns Registration result with success status
 */
declare function register(options: RegisterOptions): RegistrationResult;
/**
 * Check if a decorator is registered
 *
 * @param name - Decorator name
 * @returns True if decorator exists in registry
 */
declare function isRegistered(name: string): boolean;
/**
 * Get information about a registered decorator
 *
 * @param name - Decorator name
 * @returns Decorator info or undefined if not registered
 */
declare function getInfo(name: string): DecoratorInfo | undefined;
/**
 * Get the owner of a decorator
 *
 * @param name - Decorator name
 * @returns Owner plugin name or undefined if not registered
 */
declare function getOwner(name: string): string | undefined;
/**
 * Get all registered decorators
 *
 * @returns Array of all decorator info
 */
declare function getAll(): DecoratorInfo[];
/**
 * Unregister a decorator (for testing purposes)
 *
 * @param name - Decorator name
 * @returns True if decorator was removed
 */
declare function unregister(name: string): boolean;
/**
 * Clear all registrations (for testing purposes)
 */
declare function clear(): void;
export declare const DecoratorRegistry: {
    register: typeof register;
    isRegistered: typeof isRegistered;
    getInfo: typeof getInfo;
    getOwner: typeof getOwner;
    getAll: typeof getAll;
    unregister: typeof unregister;
    clear: typeof clear;
};
//# sourceMappingURL=index.d.ts.map