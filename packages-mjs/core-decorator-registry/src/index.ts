import type { DecoratorInfo, RegisterOptions, RegistrationResult } from './types.js';

export type { DecoratorInfo, RegistrationResult, RegisterOptions };

/**
 * Global registry for tracking Fastify decorator lifecycle
 *
 * This module tracks which plugin owns which decorator to prevent
 * duplicate registrations and provide better error messages.
 *
 * @example
 * ```typescript
 * import { DecoratorRegistry } from '@internal/core-decorator-registry';
 *
 * // Try to register a decorator
 * const result = DecoratorRegistry.register({
 *   name: 'sendFile',
 *   owner: 'core-static-app',
 *   prefix: '/static/auth'
 * });
 *
 * if (!result.success) {
 *   console.log(`Decorator already registered by ${result.existingDecorator?.owner}`);
 * }
 * ```
 */

// Module-level storage for decorators
const decorators = new Map<string, DecoratorInfo>();

/**
 * Register a new decorator in the global registry
 *
 * @param options - Registration options
 * @returns Registration result with success status
 */
function register(options: RegisterOptions): RegistrationResult {
  const { name, owner, prefix, metadata } = options;

  // Check if already registered
  if (decorators.has(name)) {
    const existing = decorators.get(name)!;
    return {
      success: false,
      existingDecorator: existing,
      message: `Decorator '${name}' already registered by '${existing.owner}' at ${existing.registeredAt.toISOString()}`,
    };
  }

  // Register new decorator
  const info: DecoratorInfo = {
    name,
    owner,
    registeredAt: new Date(),
    prefix,
    metadata,
  };

  decorators.set(name, info);

  return {
    success: true,
    message: `Decorator '${name}' successfully registered by '${owner}'`,
  };
}

/**
 * Check if a decorator is registered
 *
 * @param name - Decorator name
 * @returns True if decorator exists in registry
 */
function isRegistered(name: string): boolean {
  return decorators.has(name);
}

/**
 * Get information about a registered decorator
 *
 * @param name - Decorator name
 * @returns Decorator info or undefined if not registered
 */
function getInfo(name: string): DecoratorInfo | undefined {
  return decorators.get(name);
}

/**
 * Get the owner of a decorator
 *
 * @param name - Decorator name
 * @returns Owner plugin name or undefined if not registered
 */
function getOwner(name: string): string | undefined {
  return decorators.get(name)?.owner;
}

/**
 * Get all registered decorators
 *
 * @returns Array of all decorator info
 */
function getAll(): DecoratorInfo[] {
  return Array.from(decorators.values());
}

/**
 * Unregister a decorator (for testing purposes)
 *
 * @param name - Decorator name
 * @returns True if decorator was removed
 */
function unregister(name: string): boolean {
  return decorators.delete(name);
}

/**
 * Clear all registrations (for testing purposes)
 */
function clear(): void {
  decorators.clear();
}

// Export as a namespace object for backwards compatibility
export const DecoratorRegistry = {
  register,
  isRegistered,
  getInfo,
  getOwner,
  getAll,
  unregister,
  clear,
};
