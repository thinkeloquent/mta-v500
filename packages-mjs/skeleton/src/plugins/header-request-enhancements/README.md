# Header Request Enhancements Plugin

A comprehensive Fastify plugin that bundles essential HTTP request handling, security, and performance enhancements.

## Features

This plugin registers 8 Fastify plugins in a single convenient package:

### 1. HTTP Utilities (@fastify/sensible)
- Better error handling
- HTTP helpers (e.g., `reply.notFound()`, `reply.badRequest()`)
- Consistent error responses

### 2. ETag Support (@fastify/etag)
- Automatic ETag generation for responses
- Improves caching and reduces bandwidth

### 3. Security Headers (@fastify/helmet)
- XSS protection
- Content Security Policy (CSP)
- HSTS headers
- Other OWASP security headers

### 4. Rate Limiting (@fastify/rate-limit)
- Prevents API abuse
- Configurable limits per time window
- Default: 100 requests per minute

### 5. CORS (@fastify/cors)
- Advanced Cross-Origin Resource Sharing
- Three configuration modes:
  - **Custom Delegators**: Use custom logic for CORS decisions
  - **Use Origin**: Allow requests from any origin that sends an Origin header
  - **Any Host**: Permissive mode for development (wildcard)
  - **Default**: Allow origin with credentials

### 6. Response Compression (@fastify/compress)
- Automatic gzip/deflate/brotli compression
- Reduces response size
- Improves performance

### 7. Form Body Parser (@fastify/formbody)
- Parse `application/x-www-form-urlencoded` requests
- Essential for HTML form submissions

### 8. Multipart Support (@fastify/multipart)
- Handle file uploads
- Parse `multipart/form-data` requests

## Installation

The plugin is already included in the skeleton app. Dependencies are installed via:

```bash
npm install
```

## Usage

### Basic Usage

```typescript
import Fastify from 'fastify';
import { headerRequestEnhancements } from './plugins/header-request-enhancements';

const fastify = Fastify();

// Register with default configuration
await fastify.register(headerRequestEnhancements);
```

### With Custom Configuration

```typescript
await fastify.register(headerRequestEnhancements, {
  // CORS modes (only one should be true)
  corsUseAnyHost: true,        // Development: allow all origins
  corsUseOrigin: false,        // Use request origin header

  // Rate limiting
  rateLimitMax: 200,           // Max requests
  rateLimitTimeWindow: '1 minute',

  // Disable specific plugins if needed
  plugins: {
    sensible: true,
    etag: true,
    helmet: false,             // Disable for debugging
    rateLimit: false,          // Disable for development
    cors: true,
    compress: true,
    formbody: true,
    multipart: true,
  },
});
```

### Environment-Based Configuration

```typescript
await fastify.register(headerRequestEnhancements, {
  corsUseAnyHost: process.env.NODE_ENV === 'development',
  rateLimitMax: process.env.NODE_ENV === 'development' ? 1000 : 100,
});
```

### Using Preset Configurations

```typescript
import { devConfig, prodConfig } from './plugins/header-request-enhancements/config';

const config = process.env.NODE_ENV === 'production'
  ? prodConfig
  : devConfig;

await fastify.register(headerRequestEnhancements, config);
```

## Configuration Options

```typescript
interface RequestEnhancementOptions {
  // CORS modes
  corsDelegators?: CorsDelegator[];
  corsUseOrigin?: boolean;
  corsUseAnyHost?: boolean;

  // Rate limiting
  rateLimitMax?: number;           // Default: 100
  rateLimitTimeWindow?: string;    // Default: "1 minute"

  // Plugin toggles
  plugins?: {
    sensible?: boolean;
    etag?: boolean;
    helmet?: boolean;
    rateLimit?: boolean;
    cors?: boolean;
    compress?: boolean;
    formbody?: boolean;
    multipart?: boolean;
  };
}
```

## CORS Modes

### 1. Default Mode (Recommended for Production)
```typescript
// No special config needed
await fastify.register(headerRequestEnhancements);
```
Allows requests from the origin with credentials.

### 2. Use Origin Mode (Flexible Production)
```typescript
await fastify.register(headerRequestEnhancements, {
  corsUseOrigin: true,
});
```
Allows any origin that provides an Origin header.

### 3. Any Host Mode (Development Only)
```typescript
await fastify.register(headerRequestEnhancements, {
  corsUseAnyHost: true,
});
```
Permissive wildcard mode. **Do not use in production.**

### 4. Custom Delegator (Advanced)
```typescript
const customDelegator = (req, callback) => {
  // Custom logic based on request
  const allowedOrigins = ['https://example.com', 'https://app.example.com'];

  if (allowedOrigins.includes(req.headers.origin)) {
    callback(null, { origin: true, credentials: true });
  } else {
    callback(new Error('Origin not allowed'));
  }
};

await fastify.register(headerRequestEnhancements, {
  corsDelegators: [customDelegator],
});
```

## Testing

```bash
# Build the project
npm run build

# Start the dev server
npm run dev

# Test endpoints with the enhancements active
curl http://localhost:3000/health
```

## File Structure

```
src/plugins/header-request-enhancements/
├── index.ts      # Main plugin implementation
├── types.ts      # TypeScript type definitions
├── config.ts     # Preset configurations (dev, prod, default)
└── README.md     # This file
```

## Benefits

- **Security First**: Helmet provides OWASP-recommended security headers
- **Performance**: Compression and ETags reduce bandwidth and improve caching
- **Rate Limiting**: Prevents abuse and DoS attacks
- **Developer Experience**: Sensible provides better error handling
- **Flexibility**: Configurable CORS for different environments
- **Type Safety**: Full TypeScript support

## Troubleshooting

### CORS Issues
If you're getting CORS errors:
1. Check that `corsUseAnyHost: true` is set for development
2. Verify your origin is allowed in production mode
3. Check browser console for specific CORS error messages

### Rate Limiting
If you're being rate limited during development:
```typescript
plugins: {
  rateLimit: false,  // Disable for development
}
```

### File Upload Issues
Ensure `multipart` plugin is enabled:
```typescript
plugins: {
  multipart: true,
}
```

## License

UNLICENSED
