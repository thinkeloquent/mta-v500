/**
 * Base exception class with error codes and categorization
 */
export class BaseException extends Error {
  code;
  category;
  details;
  constructor(message, code, category, details) {
    super(message);
    this.code = code;
    this.category = category;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      details: this.details,
      stack: this.stack,
    };
  }
}
/**
 * Error categories for classification
 */
export var ErrorCategory;
((ErrorCategory) => {
  ErrorCategory.VALIDATION = 'validation';
  ErrorCategory.BUSINESS_RULE = 'business_rule';
  ErrorCategory.DATABASE = 'database';
  ErrorCategory.EXTERNAL_SERVICE = 'external_service';
  ErrorCategory.SYSTEM = 'system';
})(ErrorCategory || (ErrorCategory = {}));
/**
 * Validation errors (1000-1999)
 */
export class ValidationError extends BaseException {
  constructor(message, code = 1000, details) {
    super(message, code, ErrorCategory.VALIDATION, details);
  }
}
export class InvalidInputError extends ValidationError {
  constructor(message, details) {
    super(message, 1001, details);
  }
}
export class SchemaValidationError extends ValidationError {
  constructor(message, details) {
    super(message, 1002, details);
  }
}
export class InvalidConfigurationError extends ValidationError {
  constructor(message, details) {
    super(message, 1003, details);
  }
}
/**
 * Business rule errors (2000-2999)
 */
export class BusinessRuleError extends BaseException {
  constructor(message, code = 2000, details) {
    super(message, code, ErrorCategory.BUSINESS_RULE, details);
  }
}
export class EntityNotFoundError extends BusinessRuleError {
  constructor(entityType, entityId, details) {
    super(`${entityType} not found: ${entityId}`, 2001, { entityType, entityId, ...details });
  }
}
export class DuplicateEntityError extends BusinessRuleError {
  constructor(entityType, entityId, details) {
    super(`${entityType} already exists: ${entityId}`, 2002, { entityType, entityId, ...details });
  }
}
export class UnauthorizedError extends BusinessRuleError {
  constructor(message, details) {
    super(message, 2003, details);
  }
}
export class ForbiddenError extends BusinessRuleError {
  constructor(message, details) {
    super(message, 2004, details);
  }
}
export class OperationNotAllowedError extends BusinessRuleError {
  constructor(message, details) {
    super(message, 2005, details);
  }
}
/**
 * Database errors (3000-3999)
 */
export class DatabaseError extends BaseException {
  constructor(message, code = 3000, details) {
    super(message, code, ErrorCategory.DATABASE, details);
  }
}
export class ConnectionError extends DatabaseError {
  constructor(message, details) {
    super(message, 3001, details);
  }
}
export class QueryError extends DatabaseError {
  constructor(message, details) {
    super(message, 3002, details);
  }
}
export class TransactionError extends DatabaseError {
  constructor(message, details) {
    super(message, 3003, details);
  }
}
/**
 * External service errors (4000-4999)
 */
export class ExternalServiceError extends BaseException {
  constructor(message, code = 4000, details) {
    super(message, code, ErrorCategory.EXTERNAL_SERVICE, details);
  }
}
export class ServiceUnavailableError extends ExternalServiceError {
  constructor(serviceName, details) {
    super(`Service unavailable: ${serviceName}`, 4001, { serviceName, ...details });
  }
}
export class ServiceTimeoutError extends ExternalServiceError {
  constructor(serviceName, timeout, details) {
    super(`Service timeout: ${serviceName} (${timeout}ms)`, 4002, {
      serviceName,
      timeout,
      ...details,
    });
  }
}
export class ApiError extends ExternalServiceError {
  constructor(message, statusCode, details) {
    super(message, 4003, { statusCode, ...details });
  }
}
/**
 * System errors (5000-5999)
 */
export class SystemError extends BaseException {
  constructor(message, code = 5000, details) {
    super(message, code, ErrorCategory.SYSTEM, details);
  }
}
export class FileSystemError extends SystemError {
  constructor(message, details) {
    super(message, 5001, details);
  }
}
export class PathTraversalError extends SystemError {
  constructor(path, details) {
    super(`Path traversal detected: ${path}`, 5002, { path, ...details });
  }
}
export class ConfigurationError extends SystemError {
  constructor(message, details) {
    super(message, 5003, details);
  }
}
export class InitializationError extends SystemError {
  constructor(message, details) {
    super(message, 5004, details);
  }
}
export class NotImplementedError extends SystemError {
  constructor(feature, details) {
    super(`Not implemented: ${feature}`, 5005, { feature, ...details });
  }
}
/**
 * Error factory for creating errors from unknown values
 */
export class ErrorFactory {
  static fromUnknown(error) {
    if (error instanceof BaseException) {
      return error;
    }
    if (error instanceof Error) {
      return new SystemError(error.message, 5000, {
        originalError: error.name,
        stack: error.stack,
      });
    }
    if (typeof error === 'string') {
      return new SystemError(error);
    }
    return new SystemError('Unknown error occurred', 5000, {
      error: String(error),
    });
  }
  static isRetryable(error) {
    return (
      error instanceof ServiceTimeoutError ||
      error instanceof ServiceUnavailableError ||
      error instanceof ConnectionError ||
      error.code === 4002 ||
      error.code === 4001 ||
      error.code === 3001
    );
  }
  static shouldLogStack(error) {
    return (
      error.category === ErrorCategory.SYSTEM ||
      error.category === ErrorCategory.DATABASE ||
      error.category === ErrorCategory.EXTERNAL_SERVICE
    );
  }
}
//# sourceMappingURL=errors.js.map
