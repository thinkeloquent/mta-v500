# @thinkeloquent/core-no-cache

Fastify plugin for setting no-cache headers on all HTTP responses.

## Features

- ✅ Sets no-cache headers on **all responses globally**
- ✅ **Overrides** any existing Cache-Control headers
- ✅ HTTP/1.0 compatibility with `Pragma: no-cache`
- ✅ Legacy client support with `Expires: 0`
- ✅ Configurable enable/disable option
- ✅ Type-safe with Zod validation
- ✅ Zero dependencies (except peer deps)
- ✅ Comprehensive test coverage

## Headers Set

This plugin sets the following HTTP headers on every response:

- `Cache-Control: no-cache, no-store, must-revalidate`
- `Pragma: no-cache`
- `Expires: 0`

These headers ensure that browsers and proxies do not cache responses, always loading fresh content.

## Installation

```bash
pnpm install @thinkeloquent/core-no-cache
```

## Usage

### Basic Usage

```typescript
import Fastify from 'fastify';
import noCache from '@thinkeloquent/core-no-cache';

const server = Fastify();

// Register no-cache plugin
await server.register(noCache);

// All responses will now have no-cache headers
server.get('/api/data', async (request, reply) => {
  return { data: 'fresh data' };
});

await server.listen({ port: 3000 });
```

### Configuration Options

```typescript
import noCache from '@thinkeloquent/core-no-cache';

// Enable no-cache headers (default)
await server.register(noCache, {
  enabled: true,
});

// Disable no-cache headers
await server.register(noCache, {
  enabled: false,
});
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable or disable no-cache headers |

## When to Use

### Development Mode
Perfect for development environments where you want to ensure:
- CSS and JavaScript changes are immediately visible
- No stale cached content
- Fresh API responses

### SPA / Frontend Applications
Ideal for single-page applications (SPAs) where:
- You want to prevent HTML caching
- Assets are handled separately with specific cache policies
- You need fresh content on every navigation

### API Servers
Great for API servers where:
- Data changes frequently
- Cache invalidation is complex
- You want guaranteed fresh responses

## When NOT to Use

### Production Static Assets
Don't use this plugin if you serve static assets (images, fonts, compiled JS/CSS) that should be cached for performance.

### High-Traffic Production APIs
For production APIs with high traffic, consider:
- Implementing proper cache strategies (ETags, conditional requests)
- Using this plugin selectively on specific routes
- Implementing CDN-level caching

## How It Works

The plugin uses Fastify's `onSend` hook to set headers on all responses:

1. Registers an `onSend` hook
2. For every response, sets the three no-cache headers
3. **Overrides** any existing `Cache-Control` headers set by routes

## TypeScript Support

This plugin is written in TypeScript and provides full type definitions:

```typescript
import type { NoCacheOptions, NoCacheResult } from '@thinkeloquent/core-no-cache';
```

## Testing

Run tests:

```bash
pnpm test
```

Run tests with coverage:

```bash
pnpm run test:coverage
```

## Development

Build the module:

```bash
pnpm run build
```

Type check:

```bash
pnpm run typecheck
```

## License

MIT

## Author

ThinkEloquent

## Related Modules

- `@thinkeloquent/core-route-logger` - Log all routes
- `@thinkeloquent/core-plugin-logger` - Log all plugins
- `@thinkeloquent/core-observability` - Logging, tracing, and metrics
