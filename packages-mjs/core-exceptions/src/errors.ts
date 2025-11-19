/**
 * Base exception class with error codes and categorization
 */
export abstract class BaseException extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly category: ErrorCategory,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
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
export enum ErrorCategory {
  VALIDATION = 'validation',
  BUSINESS_RULE = 'business_rule',
  DATABASE = 'database',
  EXTERNAL_SERVICE = 'external_service',
  SYSTEM = 'system',
}

/**
 * Validation errors (1000-1999)
 */
export class ValidationError extends BaseException {
  constructor(message: string, code = 1000, details?: Record<string, unknown>) {
    super(message, code, ErrorCategory.VALIDATION, details);
  }
}

export class InvalidInputError extends ValidationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 1001, details);
  }
}

export class SchemaValidationError extends ValidationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 1002, details);
  }
}

export class InvalidConfigurationError extends ValidationError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 1003, details);
  }
}

/**
 * Business rule errors (2000-2999)
 */
export class BusinessRuleError extends BaseException {
  constructor(message: string, code = 2000, details?: Record<string, unknown>) {
    super(message, code, ErrorCategory.BUSINESS_RULE, details);
  }
}

export class EntityNotFoundError extends BusinessRuleError {
  constructor(entityType: string, entityId: string, details?: Record<string, unknown>) {
    super(`${entityType} not found: ${entityId}`, 2001, { entityType, entityId, ...details });
  }
}

export class DuplicateEntityError extends BusinessRuleError {
  constructor(entityType: string, entityId: string, details?: Record<string, unknown>) {
    super(`${entityType} already exists: ${entityId}`, 2002, { entityType, entityId, ...details });
  }
}

export class UnauthorizedError extends BusinessRuleError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 2003, details);
  }
}

export class ForbiddenError extends BusinessRuleError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 2004, details);
  }
}

export class OperationNotAllowedError extends BusinessRuleError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 2005, details);
  }
}

/**
 * Database errors (3000-3999)
 */
export class DatabaseError extends BaseException {
  constructor(message: string, code = 3000, details?: Record<string, unknown>) {
    super(message, code, ErrorCategory.DATABASE, details);
  }
}

export class ConnectionError extends DatabaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 3001, details);
  }
}

export class QueryError extends DatabaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 3002, details);
  }
}

export class TransactionError extends DatabaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 3003, details);
  }
}

export class DatabaseConfigurationError extends DatabaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 3004, details);
  }
}

/**
 * External service errors (4000-4999)
 */
export class ExternalServiceError extends BaseException {
  constructor(message: string, code = 4000, details?: Record<string, unknown>) {
    super(message, code, ErrorCategory.EXTERNAL_SERVICE, details);
  }
}

export class ServiceUnavailableError extends ExternalServiceError {
  constructor(serviceName: string, details?: Record<string, unknown>) {
    super(`Service unavailable: ${serviceName}`, 4001, { serviceName, ...details });
  }
}

export class ServiceTimeoutError extends ExternalServiceError {
  constructor(serviceName: string, timeout: number, details?: Record<string, unknown>) {
    super(`Service timeout: ${serviceName} (${timeout}ms)`, 4002, {
      serviceName,
      timeout,
      ...details,
    });
  }
}

export class ApiError extends ExternalServiceError {
  constructor(message: string, statusCode?: number, details?: Record<string, unknown>) {
    super(message, 4003, { statusCode, ...details });
  }
}

/**
 * System errors (5000-5999)
 */
export class SystemError extends BaseException {
  constructor(message: string, code = 5000, details?: Record<string, unknown>) {
    super(message, code, ErrorCategory.SYSTEM, details);
  }
}

export class FileSystemError extends SystemError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 5001, details);
  }
}

export class PathTraversalError extends SystemError {
  constructor(path: string, details?: Record<string, unknown>) {
    super(`Path traversal detected: ${path}`, 5002, { path, ...details });
  }
}

export class ConfigurationError extends SystemError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 5003, details);
  }
}

export class InitializationError extends SystemError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 5004, details);
  }
}

export class NotImplementedError extends SystemError {
  constructor(feature: string, details?: Record<string, unknown>) {
    super(`Not implemented: ${feature}`, 5005, { feature, ...details });
  }
}

export class PortInUseError extends SystemError {
  constructor(port: number, address: string = '0.0.0.0', details?: Record<string, unknown>) {
    const userMessage = [
      `Port ${port} is already in use on ${address}.`,
      '',
      'Possible solutions:',
      `  1. Stop the process using port ${port}`,
      `     macOS/Linux: lsof -ti:${port} | xargs kill -9`,
      `     Windows: netstat -ano | findstr :${port} (then: taskkill /PID <PID> /F)`,
      '',
      '  2. Change the port in your configuration:',
      `     Set PORT environment variable: export PORT=${port + 1}`,
      `     Or update .env file: PORT=${port + 1}`,
      '',
      '  3. Check if another instance of the server is already running',
    ].join('\n');

    super(userMessage, 5006, {
      port,
      address,
      errno: details?.errno,
      syscall: details?.syscall,
      ...details,
    });
  }

  /**
   * Create from Node.js EADDRINUSE error
   */
  static fromNodeError(error: any): PortInUseError {
    const port = error.port || 3000;
    const address = error.address || '0.0.0.0';

    return new PortInUseError(port, address, {
      errno: error.errno,
      syscall: error.syscall,
      originalError: error.message,
    });
  }
}

/**
 * Error factory for creating errors from unknown values
 */
export class ErrorFactory {
  static fromUnknown(error: unknown): BaseException {
    if (error instanceof BaseException) {
      return error;
    }

    if (error instanceof Error) {
      // Check for specific Node.js error codes
      const nodeError = error as any;

      // Handle EADDRINUSE (port already in use)
      if (nodeError.code === 'EADDRINUSE') {
        return PortInUseError.fromNodeError(nodeError);
      }

      // Generic error fallback
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

  static isRetryable(error: BaseException): boolean {
    return (
      error instanceof ServiceTimeoutError ||
      error instanceof ServiceUnavailableError ||
      error instanceof ConnectionError ||
      error.code === 4002 ||
      error.code === 4001 ||
      error.code === 3001
    );
  }

  static shouldLogStack(error: BaseException): boolean {
    return (
      error.category === ErrorCategory.SYSTEM ||
      error.category === ErrorCategory.DATABASE ||
      error.category === ErrorCategory.EXTERNAL_SERVICE
    );
  }
}
