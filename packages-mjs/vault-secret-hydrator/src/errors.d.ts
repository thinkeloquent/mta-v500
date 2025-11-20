/**
 * @file Error classes for vault secret parser
 * @module @thinkeloquent/vault-secret-hydrator/errors
 */
/**
 * Base error class for all vault secret parser errors
 */
export declare class VaultSecretError extends Error {
    constructor(message: string);
}
/**
 * Thrown when input is missing or empty
 */
export declare class EmptyInputError extends VaultSecretError {
    constructor(message?: string);
}
/**
 * Thrown when base64 decoding fails
 */
export declare class Base64DecodingError extends VaultSecretError {
    readonly key: string;
    readonly value: string;
    constructor(key: string, value: string, cause?: Error);
}
/**
 * Thrown when duplicate keys are detected after merging
 */
export declare class DuplicateKeyError extends VaultSecretError {
    readonly key: string;
    readonly existingValue: string;
    readonly newValue: string;
    constructor(key: string, existingValue: string, newValue: string);
}
/**
 * Thrown when properties parsing fails
 */
export declare class ParsingError extends VaultSecretError {
    constructor(message: string, cause?: Error);
}
/**
 * Thrown when invalid options are provided
 */
export declare class InvalidOptionsError extends VaultSecretError {
    constructor(message: string);
}
//# sourceMappingURL=errors.d.ts.map