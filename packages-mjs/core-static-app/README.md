# @thinkeloquent/core-static-app

A Fastify plugin for serving static files with SPA (Single Page Application) support. Perfect for serving Vite-built applications.

## Features

- Serve static files from any directory
- SPA mode with automatic fallback to `index.html` for client-side routing
- Configurable URL prefix
- Cache control headers
- ETag support
- Pre-compressed file serving (.gz, .br)
- TypeScript support with full type definitions
- Zod schema validation for options

## Installation

```bash
npm install @thinkeloquent/core-static-app
```

## Usage

### Basic Usage

```typescript
import Fastify from 'fastify';
import coreStaticApp from '@thinkeloquent/core-static-app';

const fastify = Fastify();

await fastify.register(coreStaticApp, {
  root: '/path/to/static/files',
  prefix: '/',
});

await fastify.listen({ port: 3000 });
```

### Serving a Vite App with SPA Support

```typescript
import Fastify from 'fastify';
import coreStaticApp from '@thinkeloquent/core-static-app';
import { join } from 'path';

const fastify = Fastify();

await fastify.register(coreStaticApp, {
  root: join(__dirname, '../../frontend/dist'),
  prefix: '/',
  spa: true, // Enable SPA mode for React/Vue routing
  maxAge: 86400, // Cache for 1 day
});

await fastify.listen({ port: 3000 });
```

### Development Mode (No Caching)

For development, you can disable caching by setting `maxAge: 0`:

```typescript
await fastify.register(coreStaticApp, {
  root: join(__dirname, '../../frontend/dist'),
  prefix: '/',
  spa: true,
  maxAge: 0, // Disable caching for development
});
```

This will set the following headers:
- `Cache-Control: no-cache, no-store, must-revalidate`
- `Pragma: no-cache`
- `Expires: 0`

### Multiple Static Directories

```typescript
// Serve main app
await fastify.register(coreStaticApp, {
  root: '/path/to/app',
  prefix: '/app',
  spa: true,
});

// Serve admin panel
await fastify.register(coreStaticApp, {
  root: '/path/to/admin',
  prefix: '/admin',
  spa: true,
});

// Serve assets
await fastify.register(coreStaticApp, {
  root: '/path/to/assets',
  prefix: '/assets',
  maxAge: 604800, // Cache for 7 days
});
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `root` | `string` | **required** | Root directory to serve static files from |
| `prefix` | `string` | `'/'` | URL prefix for serving static files |
| `spa` | `boolean` | `false` | Enable SPA mode - fallback to `index.html` for 404s |
| `maxAge` | `number` | `86400` | Maximum age for cache-control header (in seconds). Set to `0` to disable caching with no-cache headers |
| `dotfiles` | `boolean` | `false` | Enable serving dotfiles |
| `index` | `string[]` | `['index.html']` | Index files to serve automatically |
| `etag` | `boolean` | `true` | Enable etag generation |
| `preCompressed` | `boolean` | `false` | Enable serving pre-compressed files (.gz, .br) |

## SPA Mode

When `spa: true` is enabled:

1. GET requests without file extensions or ending in `.html` will fallback to `index.html`
2. Routes starting with `/api` are excluded from fallback (preserved for API endpoints)
3. Static assets (files with extensions like `.js`, `.css`, `.png`) are served normally
4. This enables client-side routing for React, Vue, or other SPA frameworks

## TypeScript

The plugin is fully typed and exports all necessary types:

```typescript
import coreStaticApp, {
  type StaticAppOptions,
  type StaticAppResult,
  StaticAppOptionsSchema
} from '@thinkeloquent/core-static-app';

// Access plugin result
fastify.register(coreStaticApp, options);

// Later in your code
console.log(fastify.staticAppResult);
// {
//   success: true,
//   root: '/absolute/path/to/files',
//   prefix: '/',
//   spaMode: true
// }
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Watch mode
npm run test:watch

# Type check
npm run typecheck
```

## License

MIT
