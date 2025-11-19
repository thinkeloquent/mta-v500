# Swagger/OpenAPI Documentation Plugin

Multi-module Swagger documentation system for Fastify applications with support for monorepo architectures.

## Features

- ✅ **Single-Module Mode** - Simple setup for single applications
- ✅ **Multi-Module Mode** - Separate documentation for each module/microservice
- ✅ **OpenAPI 3.1.0** - Latest specification support
- ✅ **Interactive Swagger UI** - Test endpoints directly from the browser
- ✅ **Module Registry** - Centralized management of documentation
- ✅ **Workspace Support** - Perfect for monorepos (apps, capabilities, utilities)
- ✅ **TypeScript** - Full type safety and IntelliSense
- ✅ **Environment-Based Config** - Different settings for dev/prod

## Quick Start

### Single-Module Mode

For simple applications or when you don't need module separation:

```typescript
import { swaggerPlugin } from './plugins/swagger';

await fastify.register(swaggerPlugin, {
  routePrefix: '/documentation',
  openapi: {
    title: 'My API',
    version: '1.0.0',
    description: 'API documentation',
  },
});
```

**Access documentation at:** `http://localhost:3000/documentation`

### Multi-Module Mode

For monorepos or when you have multiple services/modules:

#### Step 1: Register Your Modules

```typescript
import { registerModule } from './plugins/swagger';

// Register app module
registerModule({
  module: {
    name: 'user-service',
    type: 'apps',
    version: '1.0.0',
    description: 'User management service',
    routePrefix: '/api/users',
    tags: ['users', 'authentication'],
  },
});

// Register capability module
registerModule({
  module: {
    name: 'analytics',
    type: 'capability',
    version: '2.0.0',
    description: 'Analytics capabilities',
    routePrefix: '/api/analytics',
  },
});
```

#### Step 2: Register the Multi-Module Plugin

```typescript
import { multiModuleSwagger } from './plugins/swagger';

await fastify.register(multiModuleSwagger, {
  enableCombinedDocs: true,
  combinedDocsRoute: '/documentation',
});
```

#### Step 3: Access Documentation

- **Combined view:** `http://localhost:3000/documentation`
- **User service:** `http://localhost:3000/documentation/apps/user-service`
- **Analytics:** `http://localhost:3000/documentation/capability/analytics`

## Module Types

The system supports organizing modules by type:

- `apps` - Application services (e.g., user-service, order-service)
- `capability` - Shared capabilities (e.g., analytics, notifications)
- `utilities` - Utility services (e.g., email, cache)
- `external` - External integrations (e.g., payment-gateway)
- `core` - Core framework functionality

## Module Structure Pattern

Create a module file following this pattern:

```typescript
// src/modules/my-service.ts
import { registerModule, registerModuleRoutes } from '../plugins/swagger';

export function registerMyServiceModule() {
  registerModule({
    module: {
      name: 'my-service',
      type: 'apps',
      version: '1.0.0',
      description: 'My service description',
      tags: ['tag1', 'tag2'],
    },
  });
}

export async function registerMyServiceRoutes(fastify: FastifyInstance) {
  await registerModuleRoutes(
    fastify,
    {
      name: 'my-service',
      type: 'apps',
      version: '1.0.0',
    },
    async (instance) => {
      instance.get('/api/my-service/endpoint', {
        schema: {
          description: 'Endpoint description',
          tags: ['my-tag'],
          response: {
            200: {
              type: 'object',
              properties: {
                message: { type: 'string' },
              },
            },
          },
        },
        handler: async () => ({ message: 'Hello!' }),
      });
    }
  );
}
```

## Utilities

### `registerModule(config)`

Register a module for documentation.

```typescript
registerModule({
  module: {
    name: 'service-name',
    type: 'apps',
    version: '1.0.0',
    description: 'Service description',
  },
});
```

### `registerModuleRoutes(fastify, module, registerFn)`

Register routes with automatic module tagging.

```typescript
await registerModuleRoutes(fastify, moduleMetadata, async (instance) => {
  // Define routes here
});
```

### `createModuleRouter(module)`

Create a router function that auto-tags routes.

```typescript
const router = createModuleRouter({
  name: 'users',
  type: 'apps',
  version: '1.0.0',
});

fastify.route(
  router({
    method: 'GET',
    url: '/users',
    handler: async () => [],
  })
);
```

### `generateDocIndex()`

Generate an index of all registered modules.

```typescript
fastify.get('/docs', async () => {
  return generateDocIndex();
});
```

Returns:

```json
{
  "title": "API Documentation Index",
  "totalModules": 2,
  "modules": {
    "apps": [
      {
        "name": "user-service",
        "version": "1.0.0",
        "description": "User management",
        "docUrl": "/documentation/apps/user-service"
      }
    ],
    "capability": [...]
  },
  "combinedDocs": "/documentation"
}
```

## Configuration

### SwaggerPluginOptions

```typescript
interface SwaggerPluginOptions {
  enabled?: boolean; // Enable/disable plugin
  routePrefix?: string; // UI route (default: '/documentation')
  openapi?: {
    title?: string;
    description?: string;
    version?: string;
    servers?: Array<{ url: string; description?: string }>;
    tags?: Array<{ name: string; description?: string }>;
    contact?: { name?: string; email?: string; url?: string };
  };
  ui?: {
    displayOperationId?: boolean;
    displayRequestDuration?: boolean;
    defaultModelsExpandDepth?: number;
    defaultModelExpandDepth?: number;
    syntaxHighlight?: { theme?: string };
    deepLinking?: boolean;
  };
}
```

### MultiModuleSwaggerOptions

```typescript
interface MultiModuleSwaggerOptions {
  enableCombinedDocs?: boolean; // Show combined view (default: true)
  combinedDocsRoute?: string; // Route for combined docs (default: '/documentation')
  globalOptions?: SwaggerPluginOptions; // Applied to all modules
  autoRegisterModules?: boolean; // Auto-register all modules (default: true)
}
```

## Environment-Based Configuration

```typescript
// Development
await fastify.register(swaggerPlugin, {
  openapi: {
    title: 'API (Development)',
  },
  ui: {
    displayOperationId: true,
    defaultModelsExpandDepth: 3,
  },
});

// Production
await fastify.register(swaggerPlugin, {
  openapi: {
    title: 'API',
  },
  ui: {
    displayOperationId: false,
    defaultModelsExpandDepth: 1,
  },
});
```

## Adding to Existing Project

1. **Install dependencies:**
   ```bash
   npm install @fastify/swagger @fastify/swagger-ui
   ```

2. **Choose mode:**
   - For single app: Use `swaggerPlugin`
   - For monorepo: Use `multiModuleSwagger`

3. **Update `src/plugin.ts`:**
   - See examples in the file comments
   - Uncomment the pattern you want to use

4. **Create module files:**
   - Follow the pattern in `src/modules/example-*.ts`
   - Register modules before registering the plugin

5. **Add schemas to routes:**
   ```typescript
   fastify.get('/endpoint', {
     schema: {
       description: 'Endpoint description',
       tags: ['tag-name'],
       response: {
         200: { type: 'object', properties: { ... } }
       }
     },
     handler: async () => { ... }
   });
   ```

## Examples

See complete examples in:
- `src/modules/example-user-service.ts` - App module example
- `src/modules/example-analytics-capability.ts` - Capability module example

## API Endpoints

### Single-Module Mode
- `GET /documentation` - Swagger UI
- `GET /documentation/json` - OpenAPI JSON spec
- `GET /documentation/yaml` - OpenAPI YAML spec

### Multi-Module Mode
- `GET /documentation` - Combined view
- `GET /documentation/{type}/{moduleName}` - Module-specific view
- `GET /documentation/{type}/{moduleName}/json` - Module OpenAPI JSON
- `GET /documentation/{type}/{moduleName}/yaml` - Module OpenAPI YAML

## Migration Guide

### From Single to Multi-Module

1. Comment out the existing `swaggerPlugin` registration
2. Register your modules using `registerModule()`
3. Register `multiModuleSwagger` plugin
4. Organize routes into module files
5. Use `registerModuleRoutes()` for automatic tagging

### From No Docs to Swagger

1. Add `@fastify/swagger` and `@fastify/swagger-ui` dependencies
2. Register `swaggerPlugin` in `src/plugin.ts`
3. Add schemas to your existing routes
4. Access `/documentation` to see your API docs

## Best Practices

1. **Register modules before plugin** - Always call `registerModule()` before `multiModuleSwagger`
2. **Use consistent naming** - Follow kebab-case for module names
3. **Add descriptions** - Provide clear descriptions for modules and endpoints
4. **Tag appropriately** - Use tags to organize related endpoints
5. **Version your APIs** - Maintain version numbers for each module
6. **Schema everything** - Add schemas to all routes for complete documentation
7. **Separate by concern** - Use module types to organize by purpose

## Troubleshooting

**Module docs not showing?**
- Ensure `registerModule()` is called before `multiModuleSwagger`
- Check that routes have proper schemas with tags

**Combined docs empty?**
- Verify `enableCombinedDocs: true` is set
- Ensure `includeInCombined` is not false for modules

**Routes not documented?**
- Add `schema` property to route options
- Include at least one tag in the schema

## License

UNLICENSED
