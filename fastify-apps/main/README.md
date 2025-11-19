# Fastify Main - User-Auth Service

Simple user authentication service built with Fastify and the skeleton framework.

## Features

- **Auth Service** - Token-based authentication
- **User Service** - User management with auth protection
- **Modular Architecture** - Services loaded as plugins with dependency resolution

## Services

### Auth Service (`/api/auth`)

Provides authentication endpoints:

- `GET /api/auth/login` - Get authentication token
- `GET /api/auth/verify` - Verify authentication token

Also decorates Fastify with `verifyAuth(token)` function for other services to use.

### User Service (`/api/users`)

Provides user management endpoints (requires authentication):

- `GET /api/users` - Get list of users (requires Bearer token)

## Running the Service

```bash
# Development mode with hot-reload
make -f Makefile.fastify dev-app NAME=main

# Or directly with Node.js
cd fastify-apps/main
node --watch server.mjs

# Production mode
npm run start
```

## API Examples

### 1. Get Authentication Token

```bash
curl http://localhost:3000/api/auth/login
```

Response:
```json
{
  "token": "valid-token",
  "expiresIn": 3600
}
```

### 2. Verify Token

```bash
curl -H "Authorization: Bearer valid-token" \
  http://localhost:3000/api/auth/verify
```

Response:
```json
{
  "valid": true,
  "message": "Token is valid"
}
```

### 3. Get Users (Protected)

```bash
# Without token - returns 401
curl http://localhost:3000/api/users

# With valid token - returns users
curl -H "Authorization: Bearer valid-token" \
  http://localhost:3000/api/users
```

Response:
```json
{
  "users": [
    { "id": 1, "name": "Alice", "email": "alice@example.com" },
    { "id": 2, "name": "Bob", "email": "bob@example.com" }
  ]
}
```

## Architecture

Based on the skeleton example `03-loading-multiple-apps`:

```
fastify-apps/main/
├── server.mjs              # Main server entry point
├── modules/
│   ├── auth-service.mjs    # Authentication service
│   └── user-service.mjs    # User management service
├── package.json
└── mta-prisma.config.json  # App configuration
```

### Service Registration

Services are registered with dependency metadata:

```javascript
await fastify.apps.registerAll([
  {
    name: 'auth-service',
    plugin: authServiceApp,
    options: {},  // No prefix - routes define their own paths
    metadata: {
      dependencies: []  // No dependencies - loads first
    }
  },
  {
    name: 'user-service',
    plugin: userServiceApp,
    options: {},  // No prefix - routes define their own paths
    metadata: {
      dependencies: ['auth-service']  // Depends on auth
    }
  }
]);
```

**Note:** When using `fastify-plugin` (default), the `prefix` option in `options` is ignored. Instead, define the full route paths directly in your route handlers (e.g., `fastify.get('/api/auth/login', ...)`).

The App Registry automatically loads services in the correct order based on dependencies.

## Extending the Service

To add new services:

1. Create a new module in `modules/` (e.g., `billing-service.mjs`)
2. Export an async function that accepts `fastify` instance
3. Register it in `server.mjs` with appropriate dependencies

Example:

```javascript
// modules/billing-service.mjs
export async function billingServiceApp(fastify) {
  fastify.get('/billing/invoices', async (request, reply) => {
    const token = request.headers.authorization?.replace('Bearer ', '');
    const isAuth = await fastify.verifyAuth(token || '');

    if (!isAuth) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    return { invoices: [...] };
  });
}

// server.mjs - add to registerAll array
{
  name: 'billing-service',
  plugin: billingServiceApp,
  options: { prefix: '/api' },
  metadata: {
    dependencies: ['auth-service', 'user-service']
  }
}
```

## Environment Variables

Uses system environment variables (per CLAUDE.md):

```bash
# Database (optional for this service)
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_HOST
POSTGRES_PORT
POSTGRES_DB
POSTGRES_SCHEMA

# Server
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info
NODE_ENV=development
```

## Next Steps

- [ ] Replace hardcoded token with JWT
- [ ] Add user registration endpoint
- [ ] Connect to PostgreSQL for user storage
- [ ] Add refresh token support
- [ ] Add password hashing (bcrypt)
- [ ] Add rate limiting per user
- [ ] Add session management
