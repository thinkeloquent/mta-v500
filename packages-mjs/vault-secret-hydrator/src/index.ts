/**
 * @module @internal/vault-secret-hydrator
 * @description TypeScript library for parsing Vault secrets with file-backed secret support
 *
 * Features:
 * - Parse plaintext KEY=VALUE format secrets
 * - Automatic base64 decoding for FILE_ prefixed keys
 * - Recursive parsing of nested file contents
 * - Property flattening with FILE_KEY_nestedKey pattern
 * - Configurable strict/loose mode
 * - Duplicate key detection and handling
 * - Type-safe with TypeScript
 *
 * @example
 * ```typescript
 * import { createVaultSecretParser } from '@internal/vault-secret-hydrator';
 *
 * const parser = createVaultSecretParser();
 * const secret = `
 * API_KEY=abc123
 * DATABASE_HOST=localhost
 * FILE_CONFIG=REFUQUJBU0VfVVJMPXBvc3RncmVzOi8vbG9jYWxob3N0OjU0MzIKREFUQUJBU0VfTkFNRT10ZXN0ZGI=
 * `;
 *
 * const result = parser.parse(secret);
 * console.log(result.properties);
 * // {
 * //   API_KEY: 'abc123',
 * //   DATABASE_HOST: 'localhost',
 * //   FILE_CONFIG_DATABASE_URL: 'postgres://localhost:5432',
 * //   FILE_CONFIG_DATABASE_NAME: 'testdb'
 * // }
 * ```
 *
 * @example
 * ```typescript
 * // Configure parser options
 * const parser = createVaultSecretParser({
 *   strict: false,  // Don't throw on errors, log and skip
 *   duplicateKeyStrategy: 'override',  // Override duplicate keys
 *   ignoreNonUppercase: true  // Only process uppercase keys
 * });
 * ```
 */

// Export errors
export {
  Base64DecodingError,
  DuplicateKeyError,
  EmptyInputError,
  InvalidOptionsError,
  ParsingError,
  VaultSecretError,
} from './errors.js';
// Export main factory function
export { createVaultSecretParser } from './parser.js';
// Export types
export type {
  FileEntry,
  ParsedSecret,
  ParserOptions,
  VaultSecretParser,
} from './types.js';

// Export utility functions (for advanced usage)
export {
  decodeBase64,
  filterUppercaseKeys,
  isFileKey,
  isUppercaseKey,
  partitionKeys,
} from './utils.js';
