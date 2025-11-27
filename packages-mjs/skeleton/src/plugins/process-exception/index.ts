import closeWithGrace from 'close-with-grace';
import type { FastifyError, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { defaultConfig } from './config.js';
import type { GracefulShutdownContext, ProcessExceptionOptions } from './types.js';

/**
 * Declare the gracefulShutdown decorator on Fastify instance
 */
declare module 'fastify' {
  interface FastifyInstance {
    gracefulShutdown(): Promise<void>;
  }
}

/**
 * Process Exception Handlers Plugin
 *
 * Provides comprehensive error handling and graceful shutdown for Fastify applications:
 *
 * 1. Global Error Handler - Catches and formats validation and server errors
 * 2. Graceful Shutdown - Uses close-with-grace for clean server shutdown
 * 3. Process Exception Handlers - Monitors unhandledRejection, uncaughtException
 * 4. Signal Handlers - Handles SIGINT and SIGTERM for graceful process termination
 * 5. Graceful Shutdown Decorator - Adds fastify.gracefulShutdown() method
 *
 * @example
 * ```ts
 * import { processExceptionHandlers } from './plugins/process-exception';
 *
 * // Use with default config
 * await fastify.register(processExceptionHandlers);
 *
 * // Use with custom config
 * await fastify.register(processExceptionHandlers, {
 *   shutdownTimeout: 5000,
 *   enableProcessHandlers: true
 * });
 *
 * // Trigger graceful shutdown programmatically
 * await fastify.gracefulShutdown();
 * ```
 */
const processExceptionHandlersPlugin: FastifyPluginAsync<ProcessExceptionOptions> = async (
  fastify,
  options,
) => {
  // Merge options with defaults
  const config = { ...defaultConfig, ...options };
  const features = { ...defaultConfig.features, ...config.features };

  fastify.log.debug('Initializing process-exception plugin');

  // 1. Register Global Error Handler
  if (config.enableErrorHandler) {
    fastify.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
      // Use custom error handler if provided
      if (config.customErrorHandler) {
        return config.customErrorHandler(error, request, reply);
      }

      // Handle validation errors
      if (features.validationErrors && error.validation) {
        request.log.warn({ validation: error.validation }, 'Validation error occurred');
        return reply.code(400).send({
          success: false,
          error: 'Validation Error',
          details: error.validation,
        });
      }

      // Log the error
      request.log.error(error, 'Internal server error occurred');

      // Return generic error response
      return reply.code(error.statusCode || 500).send({
        success: false,
        error: error.message || 'Internal Server Error',
      });
    });

    fastify.log.debug('✓ Global error handler registered');
  }

  // 2. Setup Graceful Shutdown
  if (config.enableGracefulShutdown) {
    const closeServerListeners = closeWithGrace(
      { delay: config.shutdownTimeout || 10000 },
      async (context: GracefulShutdownContext) => {
        const { signal, err, manual } = context;

        if (err) {
          fastify.log.error({ err }, 'Server closing with error');
        } else if (signal) {
          fastify.log.info(`${signal} received, server closing`);
        } else if (manual) {
          fastify.log.info('Manual shutdown initiated');
        }

        await fastify.close();
      },
    );

    // Cleanup on close
    fastify.addHook('onClose', (_, done) => {
      closeServerListeners.uninstall();
      done();
    });

    // 3. Expose gracefulShutdown decorator
    if (config.exposeGracefulShutdown) {
      fastify.decorate('gracefulShutdown', async () => {
        fastify.log.info('Graceful shutdown initiated programmatically');
        // Trigger the close process
        await fastify.close();
      });

      fastify.log.debug('✓ gracefulShutdown decorator registered');
    }

    fastify.log.debug(`✓ Graceful shutdown enabled (timeout: ${config.shutdownTimeout}ms)`);
  }

  // 4. Register Process Exception Handlers
  if (config.enableProcessHandlers) {
    // Handle unhandled promise rejections
    if (features.handleUnhandledRejection) {
      const unhandledRejectionHandler = (reason: unknown, promise: Promise<unknown>) => {
        fastify.log.error({ reason, promise }, 'Unhandled Rejection detected');
      };

      process.on('unhandledRejection', unhandledRejectionHandler);

      // Clean up on server close
      fastify.addHook('onClose', (_, done) => {
        process.off('unhandledRejection', unhandledRejectionHandler);
        done();
      });

      fastify.log.debug('✓ unhandledRejection handler registered');
    }

    // Handle uncaught exceptions
    if (features.handleUncaughtException) {
      const uncaughtExceptionHandler = (error: Error) => {
        fastify.log.error({ error }, 'Uncaught Exception detected');
      };

      process.on('uncaughtException', uncaughtExceptionHandler);

      // Clean up on server close
      fastify.addHook('onClose', (_, done) => {
        process.off('uncaughtException', uncaughtExceptionHandler);
        done();
      });

      fastify.log.debug('✓ uncaughtException handler registered');
    }

    // Handle SIGINT (Ctrl+C)
    if (features.handleSigInt) {
      const sigIntHandler = async () => {
        fastify.log.info('SIGINT received, shutting down server...');
        await fastify.close();
        // Let close-with-grace handle process exit to avoid race conditions
      };

      process.on('SIGINT', sigIntHandler);

      // Clean up on server close
      fastify.addHook('onClose', (_, done) => {
        process.off('SIGINT', sigIntHandler);
        done();
      });

      fastify.log.debug('✓ SIGINT handler registered');
    }

    // Handle SIGTERM (process termination)
    if (features.handleSigTerm) {
      const sigTermHandler = async () => {
        fastify.log.info('SIGTERM received, shutting down server...');
        await fastify.close();
        // Let close-with-grace handle process exit to avoid race conditions
      };

      process.on('SIGTERM', sigTermHandler);

      // Clean up on server close
      fastify.addHook('onClose', (_, done) => {
        process.off('SIGTERM', sigTermHandler);
        done();
      });

      fastify.log.debug('✓ SIGTERM handler registered');
    }

    fastify.log.debug('✓ Process exception handlers registered');
  }

  fastify.log.info('Process Exception Handlers plugin loaded successfully');
};

// Export wrapped with fastify-plugin to escape encapsulation
export const processExceptionHandlers = fp(processExceptionHandlersPlugin, {
  fastify: '>=5.0.0',
  name: 'process-exception-handlers',
});

export default processExceptionHandlers;
