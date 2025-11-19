/**
 * @module @thinkeloquent/core-exceptions
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
 * import { Result, Ok, Err, ValidationError } from '@thinkeloquent/core-exceptions';
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
export { Result, Ok, Err } from './result.js';
export {
  BaseException,
  ErrorCategory,
  ValidationError,
  InvalidInputError,
  SchemaValidationError,
  InvalidConfigurationError,
  BusinessRuleError,
  EntityNotFoundError,
  EntityNotFoundError as NotFoundError, // Alias for backward compatibility
  DuplicateEntityError,
  UnauthorizedError,
  ForbiddenError,
  OperationNotAllowedError,
  DatabaseError,
  ConnectionError,
  QueryError,
  TransactionError,
  ExternalServiceError,
  ServiceUnavailableError,
  ServiceTimeoutError,
  ApiError,
  SystemError,
  FileSystemError,
  PathTraversalError,
  ConfigurationError,
  InitializationError,
  NotImplementedError,
  ErrorFactory,
} from './errors.js';
//# sourceMappingURL=index.d.ts.map
