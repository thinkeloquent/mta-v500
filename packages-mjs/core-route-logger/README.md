# @thinkeloquent/core-route-logger

A Fastify plugin that automatically logs all registered routes to console and/or file when the server is ready.

## Features

- 🚀 **Automatic Logging** - Logs routes when server is ready using `onReady` hook
- 📝 **Console & File Output** - Output to console, file, or both
- 🎨 **Pretty Formatting** - Optional formatted table output
- ⏱️ **Timestamps** - Optional timestamp in output
- 🔧 **Configurable** - Flexible options for different use cases
- ✅ **Type-Safe** - Full TypeScript support with Zod validation
- 🧪 **Well Tested** - Comprehensive unit tests
- 🚫 **Non-Breaking** - Won't prevent server startup on errors

## Installation

```bash
pnpm install @thinkeloquent/core-route-logger
```

## Usage

### Basic Usage

```typescript
import Fastify from 'fastify';
import routeLogger from '@thinkeloquent/core-route-logger';

const server = Fastify();

// Register the plugin with default options
await server.register(routeLogger);

// Register your routes
server.get('/api/users', async () => ({ users: [] }));
server.post('/api/users', async () => ({ created: true }));
server.get('/api/posts/:id', async () => ({ post: {} }));

// Start server - routes will be logged when ready
await server.listen({ port: 3000 });
```

**Output (console):**

```
================================================================================
Fastify Routes
================================================================================
Generated at: 2025-01-21T10:30:00.000Z

└── / (HEAD, GET)
    ├── api/
    │   ├── users (GET)
    │   │   └── / (POST)
    │   └── posts/
    │       └── :id (GET)
================================================================================
```

**Output (routes.log file):**

Routes are also written to `./routes.log` by default.

### Configuration Options

```typescript
await server.register(routeLogger, {
  enabled: true,                    // Enable/disable plugin (default: true)
  outputPath: './logs/routes.log',  // Path for log file (default: './routes.log')
  consoleOutput: true,              // Log to console (default: true)
  fileOutput: true,                 // Write to file (default: true)
  includeTimestamp: true,           // Include timestamp (default: true)
  prettyPrint: true,                // Pretty formatting (default: true)
  outputMode: 'pretty',             // Output mode: 'pretty', 'json', or 'both' (default: 'pretty')
  loggerOutput: false,              // Deprecated: Use outputMode instead (default: false)
});
```

### Output Modes

The plugin supports three output modes via the `outputMode` option:

#### `'pretty'` (Default)
Human-readable formatted output to console and/or file.

```typescript
await server.register(routeLogger, {
  outputMode: 'pretty',
  consoleOutput: true,
  fileOutput: true,
});
```

#### `'json'`
Structured JSON output to Fastify logger only. Perfect for log aggregation systems.

```typescript
await server.register(routeLogger, {
  outputMode: 'json',
});
```

**JSON Output Format:**
```json
{
  "event": "routes_registered",
  "timestamp": "2025-10-22T06:41:12.244Z",
  "count": 3,
  "routes": [
    "└── / (GET, HEAD)",
    "    ├── api/",
    "    │   └── users (GET)"
  ]
}
```

#### `'both'`
Combines pretty console/file output AND JSON logging. Best for development + monitoring.

```typescript
await server.register(routeLogger, {
  outputMode: 'both',
  consoleOutput: true,
  fileOutput: true,
  outputPath: './logs/routes.log',
});
```

### Examples

#### Console Only (No File)

```typescript
await server.register(routeLogger, {
  consoleOutput: true,
  fileOutput: false,
});
```

#### File Only (No Console)

```typescript
await server.register(routeLogger, {
  consoleOutput: false,
  fileOutput: true,
  outputPath: './logs/my-routes.log',
});
```

#### Minimal Output (No Formatting or Timestamp)

```typescript
await server.register(routeLogger, {
  prettyPrint: false,
  includeTimestamp: false,
});
```

#### Disable in Production

```typescript
await server.register(routeLogger, {
  enabled: process.env.NODE_ENV !== 'production',
});
```

## API

### Plugin Options

```typescript
type RouteOutputMode = 'pretty' | 'json' | 'both';

interface RouteLoggerOptions {
  enabled?: boolean;           // Default: true
  outputPath?: string;         // Default: './routes.log'
  consoleOutput?: boolean;     // Default: true
  fileOutput?: boolean;        // Default: true
  includeTimestamp?: boolean;  // Default: true
  prettyPrint?: boolean;       // Default: true
  outputMode?: RouteOutputMode; // Default: 'pretty'
  loggerOutput?: boolean;      // Default: false (deprecated, use outputMode)
}
```

### Route Log Result

After the server is ready, the plugin decorates the Fastify instance with `routeLogResult`:

```typescript
interface RouteLogResult {
  success: boolean;
  routeCount: number;
  consoleLogged: boolean;
  fileLogged: boolean;
  loggerLogged: boolean;
  outputPath?: string;
  error?: string;
}

// Access the result
server.routeLogResult?.routeCount;    // Number of routes
server.routeLogResult?.success;       // Whether logging succeeded
server.routeLogResult?.loggerLogged;  // Whether JSON was logged to fastify.log
```

## Use Cases

### Development Debugging

Quickly see all registered routes during development:

```typescript
await server.register(routeLogger, {
  enabled: process.env.NODE_ENV === 'development',
  consoleOutput: true,
  fileOutput: false,
});
```

### Documentation Generation

Generate a routes file for documentation:

```typescript
await server.register(routeLogger, {
  outputPath: './docs/routes.txt',
  consoleOutput: false,
  fileOutput: true,
});
```

### CI/CD Validation

Log routes during CI/CD to verify route registration:

```typescript
await server.register(routeLogger, {
  outputPath: './artifacts/routes.log',
  prettyPrint: true,
});
```

### Multi-Tenant Applications

Perfect for debugging route registration in multi-tenant applications with dynamic routing.

### Log Aggregation & Monitoring

Send structured JSON route data to log aggregation systems (ELK, Datadog, CloudWatch, etc.):

```typescript
await server.register(routeLogger, {
  outputMode: 'json',  // JSON only to fastify.log
});
```

Or combine both for local debugging + remote monitoring:

```typescript
await server.register(routeLogger, {
  outputMode: 'both',
  consoleOutput: true,
  fileOutput: true,
  outputPath: './logs/routes.log',
});
```

## How It Works

1. The plugin registers an `onReady` hook with Fastify
2. When `server.ready()` or `server.listen()` is called, the hook executes
3. The plugin calls `fastify.printRoutes()` to get all registered routes
4. Routes are formatted according to options
5. Output is written to console and/or file as configured

## Error Handling

The plugin is designed to never prevent server startup:

- If file writing fails, the error is logged but the server continues
- Invalid paths are caught and logged
- All errors are decorated on the server instance for inspection

```typescript
if (!server.routeLogResult?.success) {
  console.error('Route logging failed:', server.routeLogResult?.error);
}
```

## Migration Guide

### From custom-route-logger

If you're using a custom route logger that logs structured JSON to `fastify.log`, you can replace it with:

**Before:**
```typescript
// custom-route-logger.ts
fastify.log.info({
  event: 'routes_registered',
  timestamp: new Date().toISOString(),
  count: routeCount,
  routes: routesArray,
}, `Registered ${routeCount} routes`);
```

**After:**
```typescript
import routeLogger from '@thinkeloquent/core-route-logger';

await server.register(routeLogger, {
  outputMode: 'json',  // For JSON-only logging
  // OR
  outputMode: 'both',  // For pretty console/file + JSON
});
```

### Upgrading from v1.0.x

Version 1.1.0 adds new options but maintains full backwards compatibility:

- Existing configurations work unchanged
- New `outputMode` option available
- New `loggerOutput` option (deprecated, use `outputMode` instead)
- No breaking changes

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
  RouteLoggerOptions,
  RouteLogResult,
  RouteOutputMode
} from '@thinkeloquent/core-route-logger';
```

## Testing

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage
pnpm run test:coverage
```

## Building

```bash
# Build TypeScript
pnpm run build

# Type check
pnpm run typecheck
```

## License

MIT

## Contributing

Contributions are welcome! Please ensure tests pass before submitting PRs.

---

Part of the **Fastify Multi-Tenant Framework** by ThinkEloquent.
