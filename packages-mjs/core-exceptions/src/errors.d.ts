/**
 * Base exception class with error codes and categorization
 */
export declare abstract class BaseException extends Error {
    readonly code: number;
    readonly category: ErrorCategory;
    readonly details?: Record<string, unknown> | undefined;
    constructor(message: string, code: number, category: ErrorCategory, details?: Record<string, unknown> | undefined);
    toJSON(): Record<string, unknown>;
}
/**
 * Error categories for classification
 */
export declare enum ErrorCategory {
    VALIDATION = "validation",
    BUSINESS_RULE = "business_rule",
    DATABASE = "database",
    EXTERNAL_SERVICE = "external_service",
    SYSTEM = "system"
}
/**
 * Validation errors (1000-1999)
 */
export declare class ValidationError extends BaseException {
    constructor(message: string, code?: number, details?: Record<string, unknown>);
}
export declare class InvalidInputError extends ValidationError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class SchemaValidationError extends ValidationError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class InvalidConfigurationError extends ValidationError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * Business rule errors (2000-2999)
 */
export declare class BusinessRuleError extends BaseException {
    constructor(message: string, code?: number, details?: Record<string, unknown>);
}
export declare class EntityNotFoundError extends BusinessRuleError {
    constructor(entityType: string, entityId: string, details?: Record<string, unknown>);
}
export declare class DuplicateEntityError extends BusinessRuleError {
    constructor(entityType: string, entityId: string, details?: Record<string, unknown>);
}
export declare class UnauthorizedError extends BusinessRuleError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class ForbiddenError extends BusinessRuleError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class OperationNotAllowedError extends BusinessRuleError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * Database errors (3000-3999)
 */
export declare class DatabaseError extends BaseException {
    constructor(message: string, code?: number, details?: Record<string, unknown>);
}
export declare class ConnectionError extends DatabaseError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class QueryError extends DatabaseError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class TransactionError extends DatabaseError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class DatabaseConfigurationError extends DatabaseError {
    constructor(message: string, details?: Record<string, unknown>);
}
/**
 * External service errors (4000-4999)
 */
export declare class ExternalServiceError extends BaseException {
    constructor(message: string, code?: number, details?: Record<string, unknown>);
}
export declare class ServiceUnavailableError extends ExternalServiceError {
    constructor(serviceName: string, details?: Record<string, unknown>);
}
export declare class ServiceTimeoutError extends ExternalServiceError {
    constructor(serviceName: string, timeout: number, details?: Record<string, unknown>);
}
export declare class ApiError extends ExternalServiceError {
    constructor(message: string, statusCode?: number, details?: Record<string, unknown>);
}
/**
 * System errors (5000-5999)
 */
export declare class SystemError extends BaseException {
    constructor(message: string, code?: number, details?: Record<string, unknown>);
}
export declare class FileSystemError extends SystemError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class PathTraversalError extends SystemError {
    constructor(path: string, details?: Record<string, unknown>);
}
export declare class ConfigurationError extends SystemError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class InitializationError extends SystemError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class NotImplementedError extends SystemError {
    constructor(feature: string, details?: Record<string, unknown>);
}
export declare class PortInUseError extends SystemError {
    constructor(port: number, address?: string, details?: Record<string, unknown>);
    /**
     * Create from Node.js EADDRINUSE error
     */
    static fromNodeError(error: any): PortInUseError;
}
/**
 * Error factory for creating errors from unknown values
 */
export declare class ErrorFactory {
    static fromUnknown(error: unknown): BaseException;
    static isRetryable(error: BaseException): boolean;
    static shouldLogStack(error: BaseException): boolean;
}
//# sourceMappingURL=errors.d.ts.map