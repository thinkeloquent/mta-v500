/**
 * @module @internal/core-exceptions
 * @description Result<T,E> pattern and custom exception classes for consistent error handling
 *
 * Features:
 * - Functional Result<T,E> pattern for error handling without throwing
 * - Structured error hierarchy with categorization
 * - Error codes for easy identification
 * - Type-safe error handling
 * - Zero thrown exceptions in business logic
 *
 * @example
 * ```typescript
 * import { Result, Ok, Err, ValidationError } from '@internal/core-exceptions';
 *
 * function divide(a: number, b: number): Result<number, ValidationError> {
 *   if (b === 0) {
 *     return Err(new ValidationError('Cannot divide by zero'));
 *   }
 *   return Ok(a / b);
 * }
 *
 * const result = divide(10, 2);
 * if (result.isOk()) {
 *   console.log(result.value); // 5
 * } else {
 *   console.error(result.error.message);
 * }
 * ```
 */

export {
  ApiError,
  BaseException,
  BusinessRuleError,
  ConfigurationError,
  ConnectionError,
  DatabaseConfigurationError,
  DatabaseError,
  DuplicateEntityError,
  EntityNotFoundError,
  EntityNotFoundError as NotFoundError, // Alias for backward compatibility
  ErrorCategory,
  ErrorFactory,
  ExternalServiceError,
  FileSystemError,
  ForbiddenError,
  InitializationError,
  InvalidConfigurationError,
  InvalidInputError,
  NotImplementedError,
  OperationNotAllowedError,
  PathTraversalError,
  PortInUseError,
  QueryError,
  SchemaValidationError,
  ServiceTimeoutError,
  ServiceUnavailableError,
  SystemError,
  TransactionError,
  UnauthorizedError,
  ValidationError,
} from './errors.js';
export { Err, Ok, Result } from './result.js';
export { err, ok } from './result-helpers.js';
