import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

/**
 * Custom error handler function type
 */
export type CustomErrorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
) => void | Promise<void> | FastifyReply | Promise<FastifyReply>;

/**
 * Graceful shutdown options from close-with-grace
 */
export interface GracefulShutdownContext {
  signal?: string;
  err?: Error;
  manual?: boolean;
}

/**
 * Configuration options for the process-exception plugin
 */
export interface ProcessExceptionOptions {
  /**
   * Enable the global error handler
   * Default: true
   */
  enableErrorHandler?: boolean;

  /**
   * Enable graceful shutdown handling
   * Uses close-with-grace to handle SIGINT, SIGTERM signals
   * Default: true
   */
  enableGracefulShutdown?: boolean;

  /**
   * Enable process-level exception handlers
   * Handles unhandledRejection and uncaughtException
   * Default: true
   */
  enableProcessHandlers?: boolean;

  /**
   * Timeout for graceful shutdown in milliseconds
   * Default: 10000 (10 seconds)
   */
  shutdownTimeout?: number;

  /**
   * Custom error handler function
   * If provided, this will be called instead of the default error handler
   */
  customErrorHandler?: CustomErrorHandler;

  /**
   * Enable/disable specific features
   */
  features?: {
    /**
     * Handle validation errors (400)
     * Default: true
     */
    validationErrors?: boolean;

    /**
     * Handle SIGINT signal
     * Default: true
     */
    handleSigInt?: boolean;

    /**
     * Handle SIGTERM signal
     * Default: true
     */
    handleSigTerm?: boolean;

    /**
     * Handle unhandledRejection
     * Default: true
     */
    handleUnhandledRejection?: boolean;

    /**
     * Handle uncaughtException
     * Default: true
     */
    handleUncaughtException?: boolean;
  };

  /**
   * Expose gracefulShutdown decorator on Fastify instance
   * Adds fastify.gracefulShutdown() method
   * Default: true
   */
  exposeGracefulShutdown?: boolean;
}
