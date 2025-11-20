/**
 * Information about a registered decorator
 */
export interface DecoratorInfo {
    /** Name of the decorator (e.g., 'sendFile') */
    name: string;
    /** Plugin that registered the decorator (e.g., 'core-static-app') */
    owner: string;
    /** When the decorator was registered */
    registeredAt: Date;
    /** Optional prefix for the plugin instance */
    prefix?: string;
    /** Optional additional metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Result of an attempted registration
 */
export interface RegistrationResult {
    /** Whether registration was successful */
    success: boolean;
    /** Existing decorator info if registration failed */
    existingDecorator?: DecoratorInfo;
    /** Error message if registration failed */
    message?: string;
}
/**
 * Options for registering a decorator
 */
export interface RegisterOptions {
    /** Name of the decorator */
    name: string;
    /** Plugin that owns the decorator */
    owner: string;
    /** Optional prefix */
    prefix?: string;
    /** Optional metadata */
    metadata?: Record<string, unknown>;
}
//# sourceMappingURL=types.d.ts.map