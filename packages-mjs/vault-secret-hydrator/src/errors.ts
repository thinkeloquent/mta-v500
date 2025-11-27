/**
 * @file Error classes for vault secret parser
 * @module @internal/vault-secret-hydrator/errors
 */

/**
 * Base error class for all vault secret parser errors
 */
export class VaultSecretError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VaultSecretError';
    Object.setPrototypeOf(this, VaultSecretError.prototype);
  }
}

/**
 * Thrown when input is missing or empty
 */
export class EmptyInputError extends VaultSecretError {
  constructor(message: string = 'Input cannot be empty or null') {
    super(message);
    this.name = 'EmptyInputError';
    Object.setPrototypeOf(this, EmptyInputError.prototype);
  }
}

/**
 * Thrown when base64 decoding fails
 */
export class Base64DecodingError extends VaultSecretError {
  public readonly key: string;
  public readonly value: string;

  constructor(key: string, value: string, cause?: Error) {
    super(
      `Failed to decode base64 value for key "${key}": ${cause?.message || 'Invalid base64 format'}`,
    );
    this.name = 'Base64DecodingError';
    this.key = key;
    this.value = value;
    Object.setPrototypeOf(this, Base64DecodingError.prototype);
  }
}

/**
 * Thrown when duplicate keys are detected after merging
 */
export class DuplicateKeyError extends VaultSecretError {
  public readonly key: string;
  public readonly existingValue: string;
  public readonly newValue: string;

  constructor(key: string, existingValue: string, newValue: string) {
    super(
      `Duplicate key "${key}" detected after merging nested properties. ` +
        `Existing value: "${existingValue}", New value: "${newValue}"`,
    );
    this.name = 'DuplicateKeyError';
    this.key = key;
    this.existingValue = existingValue;
    this.newValue = newValue;
    Object.setPrototypeOf(this, DuplicateKeyError.prototype);
  }
}

/**
 * Thrown when properties parsing fails
 */
export class ParsingError extends VaultSecretError {
  constructor(message: string, cause?: Error) {
    super(`Failed to parse properties: ${message}${cause ? ` (${cause.message})` : ''}`);
    this.name = 'ParsingError';
    Object.setPrototypeOf(this, ParsingError.prototype);
  }
}

/**
 * Thrown when invalid options are provided
 */
export class InvalidOptionsError extends VaultSecretError {
  constructor(message: string) {
    super(`Invalid parser options: ${message}`);
    this.name = 'InvalidOptionsError';
    Object.setPrototypeOf(this, InvalidOptionsError.prototype);
  }
}
