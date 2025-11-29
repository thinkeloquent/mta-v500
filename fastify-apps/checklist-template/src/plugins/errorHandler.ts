import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

import { ValidationError } from '../zod-schema-contract/common/index.js';

/**
 * Custom error classes for different error types
 */
export class NotFoundError extends Error {
  statusCode = 404;
  code = 'NOT_FOUND';

  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  statusCode = 409;
  code = 'CONFLICT';

  constructor(message = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401;
  code = 'UNAUTHORIZED';

  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  code = 'FORBIDDEN';

  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Global error handler for Fastify
 * Handles different error types and returns appropriate responses
 */
export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Log the error with full details
  request.log.error({
    err: error,
    url: request.url,
    method: request.method,
    body: request.body,
    query: request.query,
    params: request.params,
  });

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    void reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: isDevelopment
          ? error.errors.map((err) => ({
              path: err.path.join('.'),
              message: err.message,
              code: err.code,
            }))
          : undefined,
      },
    });
    return;
  }

  // Handle custom ValidationError
  if (error instanceof ValidationError) {
    void reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message,
        details: isDevelopment ? error.toJSON() : undefined,
      },
    });
    return;
  }

  // Handle NotFoundError
  if (error instanceof NotFoundError) {
    void reply.status(404).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  // Handle ConflictError
  if (error instanceof ConflictError) {
    void reply.status(409).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  // Handle UnauthorizedError
  if (error instanceof UnauthorizedError) {
    void reply.status(401).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  // Handle ForbiddenError
  if (error instanceof ForbiddenError) {
    void reply.status(403).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  // Handle Fastify errors
  if ('statusCode' in error) {
    void reply.status(error.statusCode || 500).send({
      success: false,
      error: {
        code: error.code || 'INTERNAL_SERVER_ERROR',
        message: error.message,
        details: isDevelopment ? { stack: error.stack } : undefined,
      },
    });
    return;
  }

  // Handle generic errors
  void reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: isDevelopment ? error.message : 'An unexpected error occurred',
      details: isDevelopment ? { stack: error.stack } : undefined,
    },
  });
}
