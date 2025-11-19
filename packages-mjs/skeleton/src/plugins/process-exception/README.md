# Process Exception Handlers Plugin

A comprehensive Fastify plugin that provides robust error handling, graceful shutdown capabilities, and process-level exception monitoring for production-ready applications.

## Features

This plugin provides 5 core capabilities:

### 1. Global Error Handler
- Automatic validation error handling (400 responses)
- Structured error responses
- Custom error handler support
- Proper error logging

### 2. Graceful Shutdown
- Uses `close-with-grace` library for clean server shutdown
- Configurable shutdown timeout
- Handles cleanup before process termination
- Prevents data loss during shutdown

### 3. Process Exception Handlers
- Monitors `unhandledRejection` events
- Catches `uncaughtException` errors
- Logs all process-level exceptions
- Prevents silent failures

### 4. Signal Handlers
- Handles `SIGINT` (Ctrl+C) for graceful termination
- Handles `SIGTERM` for process termination
- Ensures proper cleanup on exit
- Configurable per-signal handling

### 5. Graceful Shutdown Decorator
- Adds `fastify.gracefulShutdown()` method
- Programmatic shutdown trigger
- Promise-based API
- Integrates with close-with-grace

## Installation

The plugin dependencies are included in the skeleton app:

```bash
npm install
```

Required dependencies:
- `fastify` (^5.2.0)
- `close-with-grace` (^2.1.0)

## Usage

### Basic Usage

```typescript
import Fastify from 'fastify';
import { processExceptionHandlers } from './plugins/process-exception';

const fastify = Fastify({ logger: true });

// Register with default configuration
await fastify.register(processExceptionHandlers);

await fastify.listen({ port: 3000 });
```

### With Custom Configuration

```typescript
await fastify.register(processExceptionHandlers, {
  // Enable/disable main features
  enableErrorHandler: true,
  enableGracefulShutdown: true,
  enableProcessHandlers: true,
  exposeGracefulShutdown: true,

  // Configure shutdown timeout
  shutdownTimeout: 10000, // 10 seconds

  // Configure specific features
  features: {
    validationErrors: true,
    handleSigInt: true,
    handleSigTerm: true,
    handleUnhandledRejection: true,
    handleUncaughtException: true,
  },
});
```

### Using Preset Configurations

```typescript
import { devConfig, prodConfig, minimalConfig } from './plugins/process-exception/config';

// Development environment
const config = process.env.NODE_ENV === 'production'
  ? prodConfig
  : devConfig;

await fastify.register(processExceptionHandlers, config);
```

### Custom Error Handler

```typescript
await fastify.register(processExceptionHandlers, {
  customErrorHandler: async (error, request, reply) => {
    // Custom error handling logic
    request.log.error({ error, path: request.url }, 'Custom error occurred');

    // Send custom error response
    reply.code(error.statusCode || 500).send({
      success: false,
      message: 'Something went wrong',
      requestId: request.id,
    });
  },
});
```

### Programmatic Graceful Shutdown

```typescript
await fastify.register(processExceptionHandlers, {
  exposeGracefulShutdown: true,
});

// Later in your code...
try {
  await fastify.gracefulShutdown();
  console.log('Server shut down gracefully');
} catch (error) {
  console.error('Error during shutdown:', error);
}
```

## Configuration Options

```typescript
interface ProcessExceptionOptions {
  // Main feature toggles
  enableErrorHandler?: boolean;          // Default: true
  enableGracefulShutdown?: boolean;      // Default: true
  enableProcessHandlers?: boolean;       // Default: true
  exposeGracefulShutdown?: boolean;      // Default: true

  // Shutdown configuration
  shutdownTimeout?: number;              // Default: 10000 (10s)

  // Custom error handler
  customErrorHandler?: CustomErrorHandler;

  // Granular feature control
  features?: {
    validationErrors?: boolean;          // Default: true
    handleSigInt?: boolean;              // Default: true
    handleSigTerm?: boolean;             // Default: true
    handleUnhandledRejection?: boolean;  // Default: true
    handleUncaughtException?: boolean;   // Default: true
  };
}
```

## Preset Configurations

### Default Configuration
Balanced settings suitable for most applications:
- All features enabled
- 10-second shutdown timeout
- All feature flags enabled

```typescript
import { defaultConfig } from './plugins/process-exception/config';
await fastify.register(processExceptionHandlers, defaultConfig);
```

### Development Configuration
Optimized for fast iteration:
- All features enabled
- 5-second shutdown timeout (faster restarts)
- Verbose logging

```typescript
import { devConfig } from './plugins/process-exception/config';
await fastify.register(processExceptionHandlers, devConfig);
```

### Production Configuration
Maximum reliability and proper cleanup:
- All features enabled
- 30-second shutdown timeout (ensures cleanup)
- All safety features enabled

```typescript
import { prodConfig } from './plugins/process-exception/config';
await fastify.register(processExceptionHandlers, prodConfig);
```

### Minimal Configuration
Only essential error handling:
- Error handler enabled
- No process handlers (useful for testing or special environments)
- 5-second timeout

```typescript
import { minimalConfig } from './plugins/process-exception/config';
await fastify.register(processExceptionHandlers, minimalConfig);
```

## Error Response Format

### Validation Errors (400)
```json
{
  "success": false,
  "error": "Validation Error",
  "details": [
    {
      "message": "must have required property 'id'",
      "instancePath": "",
      "schemaPath": "#/required"
    }
  ]
}
```

### Server Errors (500)
```json
{
  "success": false,
  "error": "Internal Server Error"
}
```

## Graceful Shutdown Flow

1. **Signal Received** (SIGINT/SIGTERM) or `gracefulShutdown()` called
2. **Stop accepting new connections**
3. **Wait for active requests** to complete (up to `shutdownTimeout`)
4. **Close server** and cleanup resources
5. **Exit process** (if signal-triggered)

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

## File Structure

```
src/plugins/process-exception/
├── index.ts              # Main plugin implementation
├── types.ts              # TypeScript type definitions
├── config.ts             # Preset configurations
├── index.spec.vite.ts    # Plugin tests
├── config.spec.vite.ts   # Configuration tests
└── README.md             # This file
```

## Examples

### Basic Server with Exception Handling

```typescript
import Fastify from 'fastify';
import { processExceptionHandlers } from './plugins/process-exception';

const fastify = Fastify({ logger: true });

await fastify.register(processExceptionHandlers);

fastify.get('/health', async () => {
  return { status: 'ok' };
});

fastify.get('/error', async () => {
  throw new Error('Intentional error for testing');
});

await fastify.listen({ port: 3000 });
console.log('Server running on http://localhost:3000');
```

### Environment-Based Configuration

```typescript
import { devConfig, prodConfig } from './plugins/process-exception/config';

const config = process.env.NODE_ENV === 'production'
  ? prodConfig
  : devConfig;

await fastify.register(processExceptionHandlers, config);
```

### Kubernetes/Docker Deployment

For containerized environments, ensure proper signal handling:

```typescript
await fastify.register(processExceptionHandlers, {
  shutdownTimeout: 30000, // Match Kubernetes terminationGracePeriodSeconds
  features: {
    handleSigTerm: true,   // Essential for Kubernetes
    handleSigInt: true,
  },
});
```

## Benefits

- **Reliability**: Catches errors at multiple levels (route, process, system)
- **Observability**: Comprehensive error logging for debugging
- **Graceful Degradation**: Proper shutdown prevents data loss
- **Production Ready**: Battle-tested patterns from real-world applications
- **Flexible**: Highly configurable for different environments
- **Type Safe**: Full TypeScript support with detailed types

## Troubleshooting

### Server Not Shutting Down Gracefully

If your server hangs during shutdown:
1. Check that all async operations complete within `shutdownTimeout`
2. Increase `shutdownTimeout` if needed
3. Ensure database connections and other resources cleanup properly

```typescript
await fastify.register(processExceptionHandlers, {
  shutdownTimeout: 30000, // Increase timeout
});
```

### Process Handlers Not Working

If process handlers aren't catching exceptions:
1. Ensure `enableProcessHandlers` is true
2. Check that specific feature flags are enabled
3. Verify no other process handlers are registered

```typescript
await fastify.register(processExceptionHandlers, {
  enableProcessHandlers: true,
  features: {
    handleUnhandledRejection: true,
    handleUncaughtException: true,
  },
});
```

### Custom Error Handler Not Called

If your custom error handler isn't invoked:
1. Ensure `enableErrorHandler` is true
2. Verify the custom handler is async or returns Promise
3. Check that the handler is provided correctly

```typescript
await fastify.register(processExceptionHandlers, {
  enableErrorHandler: true,
  customErrorHandler: async (error, request, reply) => {
    // Your logic here
  },
});
```

### Testing Issues

For testing environments, you may want minimal configuration:

```typescript
import { minimalConfig } from './plugins/process-exception/config';

// In tests, disable process handlers to avoid interference
await fastify.register(processExceptionHandlers, {
  ...minimalConfig,
  enableProcessHandlers: false,
});
```

## Best Practices

1. **Use environment-specific configs**: Different settings for dev/prod
2. **Monitor shutdown time**: Ensure `shutdownTimeout` is adequate
3. **Log all exceptions**: Keep error logging enabled in production
4. **Test graceful shutdown**: Verify your app shuts down cleanly
5. **Custom error handlers**: Implement for sensitive data handling
6. **Container deployment**: Match timeout with orchestrator settings

## Related Plugins

- `header-request-enhancements` - HTTP utilities and security
- `@fastify/sensible` - Additional HTTP helpers
- `@fastify/helmet` - Security headers

## License

UNLICENSED
