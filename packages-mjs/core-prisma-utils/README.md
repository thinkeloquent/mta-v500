# @thinkeloquent/core-prisma-utils

Shared Prisma utilities for multi-tenant framework providing standardized Prisma client initialization, validation, and connection management.

## Features

- **Database URL Validation**: Automatic detection and validation for PostgreSQL, MySQL, SQLite, MongoDB, and SQL Server
- **Flexible Configuration**: Support for environment variables and runtime options
- **Connection Lifecycle Management**: Built-in connection, disconnection, and reconnection helpers
- **Configurable Logging**: Granular control over query, error, warn, and info logging
- **Factory Pattern Support**: Create pre-configured client factories for different capabilities
- **Type-Safe**: Full TypeScript support with comprehensive type definitions

## Installation

```bash
npm install @thinkeloquent/core-prisma-utils
```

### Peer Dependencies

This package requires `@prisma/client` as a peer dependency:

```bash
npm install @prisma/client
```

## Quick Start

```typescript
import { PrismaClient } from '@prisma/client';
import { initializePrismaClient } from '@thinkeloquent/core-prisma-utils';

// Initialize with database URL
const { client, disconnect } = await initializePrismaClient(PrismaClient, {
  databaseUrl: 'postgresql://user:pass@localhost:5432/mydb',
  enableQueryLogging: true,
});

// Use the client
const users = await client.user.findMany();

// Clean up when done
await disconnect();
```

## API Reference

### `validateDatabaseConfig(databaseUrl?: string)`

Validates database connection URLs and detects database type.

**Parameters:**
- `databaseUrl` (optional): Database connection URL. Falls back to `process.env.DATABASE_URL` if not provided.

**Returns:** `DatabaseConfigValidation`
```typescript
{
  valid: boolean;
  errors: string[];
  databaseType?: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb' | 'sqlserver';
}
```

**Example:**
```typescript
import { validateDatabaseConfig } from '@thinkeloquent/core-prisma-utils';

const result = validateDatabaseConfig('postgresql://user:pass@localhost:5432/mydb');
if (!result.valid) {
  console.error('Validation errors:', result.errors);
} else {
  console.log('Database type:', result.databaseType);
}
```

### `initializePrismaClient<T>(clientConstructor, options?)`

Main initialization function that creates and configures a Prisma client instance.

**Parameters:**
- `clientConstructor`: Your Prisma client constructor (e.g., `PrismaClient`)
- `options` (optional): `PrismaClientOptions`

**Returns:** `Promise<PrismaInitResult<T>>`
```typescript
{
  client: T;                          // Prisma client instance
  disconnect: () => Promise<void>;    // Safely disconnect
  reconnect: () => Promise<void>;     // Disconnect and reconnect
  isConnected: () => boolean;         // Check connection status
}
```

**Example:**
```typescript
import { PrismaClient } from '@prisma/client';
import { initializePrismaClient } from '@thinkeloquent/core-prisma-utils';

const { client, disconnect, reconnect, isConnected } = await initializePrismaClient(
  PrismaClient,
  {
    databaseUrl: process.env.DATABASE_URL,
    enableQueryLogging: true,
    autoConnect: true,
  }
);

console.log('Connected:', isConnected()); // true

// Use client...
await client.user.findMany();

// Reconnect if needed
await reconnect();

// Cleanup
await disconnect();
```

### `createPrismaClientFactory<T>(clientConstructor, defaultOptions?)`

Creates a factory function for generating Prisma clients with default configuration.

**Parameters:**
- `clientConstructor`: Your Prisma client constructor
- `defaultOptions` (optional): Default `PrismaClientOptions` to merge with runtime options

**Returns:** Factory function `(options?) => Promise<PrismaInitResult<T>>`

**Example:**
```typescript
import { PrismaClient } from '@prisma/client';
import { createPrismaClientFactory } from '@thinkeloquent/core-prisma-utils';

// Create factory with defaults
const createAuthPrisma = createPrismaClientFactory(PrismaClient, {
  enableQueryLogging: true,
  enableInfoLogging: false,
});

// Create instances with merged options
const auth1 = await createAuthPrisma({
  databaseUrl: 'postgresql://user:pass@localhost:5432/auth_db',
});

const auth2 = await createAuthPrisma({
  databaseUrl: 'postgresql://user:pass@localhost:5432/auth_db_replica',
  enableInfoLogging: true, // Override default
});
```

## Configuration Options

### `PrismaClientOptions`

```typescript
interface PrismaClientOptions {
  // Database connection URL
  databaseUrl?: string;

  // Auto-connect on initialization (default: true)
  autoConnect?: boolean;

  // Enable query logging (default: false)
  enableQueryLogging?: boolean;

  // Enable info logging (default: false)
  enableInfoLogging?: boolean;

  // Custom log levels (overrides enableQueryLogging and enableInfoLogging)
  logLevels?: Array<'query' | 'info' | 'warn' | 'error'>;
}
```

### Logging Configuration

**Default Logging:**
```typescript
// Default: logs only errors and warnings
const { client } = await initializePrismaClient(PrismaClient, {
  databaseUrl: 'postgresql://user:pass@localhost:5432/mydb',
});
// Log levels: ['error', 'warn']
```

**Enable Query Logging:**
```typescript
const { client } = await initializePrismaClient(PrismaClient, {
  databaseUrl: 'postgresql://user:pass@localhost:5432/mydb',
  enableQueryLogging: true,
});
// Log levels: ['error', 'warn', 'query']
```

**Enable Info Logging:**
```typescript
const { client } = await initializePrismaClient(PrismaClient, {
  databaseUrl: 'postgresql://user:pass@localhost:5432/mydb',
  enableInfoLogging: true,
});
// Log levels: ['error', 'warn', 'info']
```

**Custom Log Levels:**
```typescript
const { client } = await initializePrismaClient(PrismaClient, {
  databaseUrl: 'postgresql://user:pass@localhost:5432/mydb',
  logLevels: ['query', 'error'],
});
// Log levels: ['query', 'error']
```

## Supported Databases

### PostgreSQL

```typescript
const { client } = await initializePrismaClient(PrismaClient, {
  databaseUrl: 'postgresql://user:pass@localhost:5432/mydb',
});
// Also supports: postgres://user:pass@localhost:5432/mydb
```

**Validation Requirements:**
- Must include credentials (`user@host`)
- Must include database name

### MySQL

```typescript
const { client } = await initializePrismaClient(PrismaClient, {
  databaseUrl: 'mysql://user:pass@localhost:3306/mydb',
});
```

### SQLite

```typescript
// File protocol
const { client } = await initializePrismaClient(PrismaClient, {
  databaseUrl: 'file:./dev.db',
});

// Direct file path
const { client } = await initializePrismaClient(PrismaClient, {
  databaseUrl: './database.db',
});
```

**Validation Requirements:**
- Must include file path

### MongoDB

```typescript
// Standard connection
const { client } = await initializePrismaClient(PrismaClient, {
  databaseUrl: 'mongodb://localhost:27017/mydb',
});

// MongoDB Atlas (SRV)
const { client } = await initializePrismaClient(PrismaClient, {
  databaseUrl: 'mongodb+srv://cluster.mongodb.net/mydb',
});
```

### SQL Server

```typescript
const { client } = await initializePrismaClient(PrismaClient, {
  databaseUrl: 'sqlserver://localhost:1433;database=mydb',
});
```

## Connection Management

### Auto-Connect (Default)

By default, the client automatically connects on initialization:

```typescript
const { client, isConnected } = await initializePrismaClient(PrismaClient, {
  databaseUrl: 'postgresql://user:pass@localhost:5432/mydb',
});

console.log(isConnected()); // true
```

### Manual Connection

Disable auto-connect for manual control:

```typescript
const { client, reconnect, isConnected } = await initializePrismaClient(PrismaClient, {
  databaseUrl: 'postgresql://user:pass@localhost:5432/mydb',
  autoConnect: false,
});

console.log(isConnected()); // false

// Connect manually
await reconnect();
console.log(isConnected()); // true
```

### Disconnect

```typescript
const { client, disconnect, isConnected } = await initializePrismaClient(PrismaClient, {
  databaseUrl: 'postgresql://user:pass@localhost:5432/mydb',
});

await disconnect();
console.log(isConnected()); // false
```

### Reconnect

```typescript
const { client, reconnect, disconnect, isConnected } = await initializePrismaClient(
  PrismaClient,
  {
    databaseUrl: 'postgresql://user:pass@localhost:5432/mydb',
  }
);

// Use client...
await client.user.findMany();

// Reconnect (automatically disconnects first if connected)
await reconnect();
console.log(isConnected()); // true
```

## Environment Variables

If `databaseUrl` is not provided in options, the module automatically uses `DATABASE_URL` from environment variables:

```typescript
// Set in environment
process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/mydb';

// Initialize without explicit URL
const { client } = await initializePrismaClient(PrismaClient);
```

## Advanced Usage

### Factory Pattern for Multi-Capability Applications

Create separate factories for different parts of your application:

```typescript
import { PrismaClient } from '@prisma/client';
import { createPrismaClientFactory } from '@thinkeloquent/core-prisma-utils';

// Auth capability with query logging
const createAuthPrisma = createPrismaClientFactory(PrismaClient, {
  enableQueryLogging: true,
  enableInfoLogging: false,
});

// Analytics capability with minimal logging
const createAnalyticsPrisma = createPrismaClientFactory(PrismaClient, {
  enableQueryLogging: false,
  logLevels: ['error'],
});

// Initialize at runtime
const auth = await createAuthPrisma({
  databaseUrl: process.env.AUTH_DATABASE_URL,
});

const analytics = await createAnalyticsPrisma({
  databaseUrl: process.env.ANALYTICS_DATABASE_URL,
});
```

### Error Handling

```typescript
import { initializePrismaClient } from '@thinkeloquent/core-prisma-utils';
import { PrismaClient } from '@prisma/client';

try {
  const { client } = await initializePrismaClient(PrismaClient, {
    databaseUrl: 'invalid://url',
  });
} catch (error) {
  console.error('Initialization failed:', error.message);
  // Error: Prisma client initialization failed: Unknown database type in URL: invalid
}
```

### App-Specific Factory Pattern

```typescript
import { createAppPrismaClientFactory } from '@thinkeloquent/core-prisma-utils';
import { PrismaClient } from '.prisma/client-auth';

// Create app-specific factory with enhanced logging
const createAuthPrisma = createAppPrismaClientFactory(
  'auth',
  PrismaClient,
  {
    enableQueryLogging: process.env.NODE_ENV === 'development',
  }
);

// In your Fastify plugin
export default async (fastify, opts) => {
  const { client, disconnect } = await createAuthPrisma({
    databaseUrl: opts.databaseUrl,
    logger: {
      info: (msg) => fastify.log.info(msg),
      warn: (msg) => fastify.log.warn(msg),
      error: (msg) => fastify.log.error(msg),
    },
  });

  fastify.decorate('authDb', client);
  fastify.addHook('onClose', disconnect);
};
```

### Multi-Tenant Pattern

```typescript
import {
  createAppPrismaClientFactory,
  createDynamicTenantContext,
  TenantExtractors,
  createTenantContextHook
} from '@thinkeloquent/core-prisma-utils';
import { PrismaClient } from '.prisma/client-auth';

// Create factory with tenant context
const createAuthPrisma = createAppPrismaClientFactory(
  'auth',
  PrismaClient,
  {
    enableQueryLogging: true,
  }
);

// In your Fastify plugin
export default async (fastify, opts) => {
  // Add tenant extraction hook
  fastify.addHook('preHandler', createTenantContextHook(
    TenantExtractors.fromHeader('x-tenant-id')
  ));

  // Initialize with tenant context
  const { client, disconnect } = await createAuthPrisma({
    databaseUrl: opts.databaseUrl,
    tenantContext: createDynamicTenantContext(() => fastify.request?.tenantId),
  });

  fastify.decorate('authDb', client);
  fastify.addHook('onClose', disconnect);
};

// In your routes, queries are automatically scoped by tenantId
fastify.get('/users', async (request, reply) => {
  // tenantId is available from request context
  const users = await fastify.authDb.user.findMany({
    where: { tenantId: request.tenantId }
  });
  return users;
});
```

## Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:coverage
```

## Development

Build the package:

```bash
npm run build
```

Watch mode for development:

```bash
npm run dev
```

Clean build artifacts:

```bash
npm run clean
```

## Multi-Tenancy Features

### Tenant Context

Create tenant contexts for multi-tenant applications:

```typescript
import {
  createFixedTenantContext,
  createDynamicTenantContext,
  createTenantContextWithUrl,
} from '@thinkeloquent/core-prisma-utils';

// Fixed tenant
const tenantContext = createFixedTenantContext('tenant-123');

// Dynamic tenant (from request/async storage)
const tenantContext = createDynamicTenantContext(() => getCurrentTenantId());

// With custom database URL per tenant
const tenantContext = createTenantContextWithUrl(
  () => getCurrentTenantId(),
  () => getTenantDatabaseUrl()
);
```

### Tenant Extractors

Extract tenant ID from various sources:

```typescript
import { TenantExtractors } from '@thinkeloquent/core-prisma-utils';

// From header
const extractor = TenantExtractors.fromHeader('x-tenant-id');

// From subdomain (e.g., tenant1.example.com)
const extractor = TenantExtractors.fromSubdomain();

// From URL path (e.g., /tenants/tenant1/...)
const extractor = TenantExtractors.fromPath('/tenants/');

// From JWT token claim
const extractor = TenantExtractors.fromJWT('tenantId');

// From query parameter
const extractor = TenantExtractors.fromQuery('tenant_id');
```

### Fastify Tenant Hook

Automatically extract and attach tenant ID to requests:

```typescript
import { createTenantContextHook, TenantExtractors } from '@thinkeloquent/core-prisma-utils';

// Add to your Fastify instance
fastify.addHook('preHandler', createTenantContextHook(
  TenantExtractors.fromHeader('x-tenant-id')
));

// Now request.tenantId is available in all routes
fastify.get('/users', async (request, reply) => {
  const tenantId = request.tenantId;
  // Use for filtering
});
```

### Prisma Client Extensions for Tenancy

Automatically filter all queries by tenant:

```typescript
import { createTenantQueryExtension } from '@thinkeloquent/core-prisma-utils';

// Extend Prisma Client
const prisma = new PrismaClient().$extends(
  createTenantQueryExtension(() => request.tenantId)
);

// All queries are automatically filtered
const users = await prisma.user.findMany(); // WHERE tenantId = ?
const user = await prisma.user.create({
  data: { email: 'user@example.com' } // tenantId automatically added
});
```

## API Reference

### `createAppPrismaClientFactory<T>(appName, clientConstructor, defaultOptions?)`

Create an app-specific Prisma client factory with enhanced logging and tenant support.

**Parameters:**
- `appName`: string - Name of the app for logging
- `clientConstructor`: new () => T - Prisma client constructor
- `defaultOptions`: AppPrismaClientOptions - Default configuration

**Returns:** Factory function `(options?) => Promise<PrismaInitResult<T>>`

**Extended Options:**
```typescript
interface AppPrismaClientOptions extends PrismaClientOptions {
  appName?: string;
  tenantContext?: TenantContext;
  logger?: {
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
  };
}
```

### Tenant Utilities

**`createFixedTenantContext(tenantId)`** - Create context with fixed tenant ID

**`createDynamicTenantContext(getTenantIdFn)`** - Create context with dynamic resolution

**`createTenantContextWithUrl(getTenantIdFn, getDatabaseUrlFn)`** - Context with custom DB URL

**`createEnvTenantContext(envKeyPrefix?)`** - Create from environment variables

**`TenantExtractors`** - Collection of tenant ID extractors:
- `fromHeader(headerName)`
- `fromSubdomain()`
- `fromPath(pathPrefix)`
- `fromJWT(claimName)`
- `fromQuery(paramName)`

**`createTenantContextHook(extractor)`** - Fastify preHandler hook for tenant extraction

**`createTenantQueryExtension(getTenantId)`** - Prisma Client extension for automatic filtering

## License

MIT

## Author

Thinkeloquent

## Keywords

- prisma
- database
- multi-tenant
- postgresql
- mysql
- sqlite
- mongodb
- sqlserver
- fastify
- app-context
- tenant-isolation
