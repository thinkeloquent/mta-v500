# @thinkeloquent/core-configure

Entity configuration management with deep merging, validation, and entity definitions for the MTA Framework v2.0.

## Features

- **Layered Configuration**: Support for multiple configuration sources with priority-based merging
- **Merge Strategies**: Three strategies (override, merge, extend) for flexible configuration composition
- **Entity Definitions**: Registry for managing entity metadata and lifecycle
- **Schema Validation**: Zod-based runtime validation for all configurations
- **Type Safety**: Full TypeScript support with strict mode
- **Caching**: Optional configuration caching for performance
- **Result Pattern**: Functional error handling with `Result<T,E>`

## Installation

```bash
pnpm install @thinkeloquent/core-configure
```

## Quick Start

```typescript
import {
  EntityConfigurationManager,
  ConfigSource,
  MergeStrategy,
} from '@thinkeloquent/core-configure';

// Create manager
const manager = new EntityConfigurationManager({
  defaultMergeStrategy: MergeStrategy.MERGE,
  enableValidation: true,
  enableCaching: true,
});

// Set default configuration
manager.setConfig('tenant-1', 'tenant', {
  plugins: ['auth', 'logging'],
  settings: { theme: 'dark' }
}, ConfigSource.DEFAULT);

// Override with runtime configuration
manager.setConfig('tenant-1', 'tenant', {
  settings: { apiKey: 'secret-key' }
}, ConfigSource.RUNTIME);

// Get merged configuration
const result = manager.getConfig('tenant-1', 'tenant');
if (result.isOk()) {
  console.log(result.value);
  // {
  //   plugins: ['auth', 'logging'],
  //   settings: { theme: 'dark', apiKey: 'secret-key' }
  // }
}
```

## Configuration Sources

Configurations are layered with the following priority (highest to lowest):

1. **RUNTIME** - Runtime overrides (priority 4)
2. **CONTROL_PLANE** - Control plane configuration (priority 3)
3. **FILESYSTEM** - File-based configuration (priority 2)
4. **DEFAULT** - Default values (priority 1)

Higher priority sources override lower priority sources during merging.

## Merge Strategies

### OVERRIDE

Completely replaces the target configuration with the source.

```typescript
const target = { plugins: ['p1'], settings: { a: 1 } };
const source = { plugins: ['p2'], settings: { b: 2 } };

// Result: { plugins: ['p2'], settings: { b: 2 } }
```

### MERGE

Deep merges objects and concatenates arrays.

```typescript
const target = { plugins: ['p1'], settings: { a: 1 } };
const source = { plugins: ['p2'], settings: { b: 2 } };

// Result: { plugins: ['p1', 'p2'], settings: { a: 1, b: 2 } }
```

### EXTEND

Adds new keys without replacing existing ones.

```typescript
const target = { plugins: ['p1'], settings: { a: 1 } };
const source = { plugins: ['p2'], settings: { a: 999, b: 2 } };

// Result: { plugins: ['p1', 'p2'], settings: { a: 1, b: 2 } }
// Note: 'a' keeps its original value
```

## Entity Definitions

Manage entity metadata separately from configuration:

```typescript
const registry = manager.getDefinitionRegistry();

// Register entity definition
registry.register({
  id: 'tenant-acme',
  type: 'tenant',
  name: 'Acme Corporation',
  description: 'Production tenant',
  enabled: true,
  metadata: {
    region: 'us-east-1',
    tier: 'enterprise',
  },
});

// Get definition
const defResult = registry.get('tenant-acme', 'tenant');

// Update definition
registry.update({
  id: 'tenant-acme',
  type: 'tenant',
  description: 'Updated description',
});

// Enable/disable
registry.enable('tenant-acme', 'tenant');
registry.disable('tenant-acme', 'tenant');

// Query
const allTenants = registry.getByType('tenant');
const enabledOnly = registry.getEnabled();
```

## API Reference

### EntityConfigurationManager

#### Constructor

```typescript
new EntityConfigurationManager(options?: Partial<ConfigurationManagerOptions>)
```

Options:
- `defaultMergeStrategy`: Default merge strategy (default: `MERGE`)
- `enableValidation`: Enable Zod validation (default: `true`)
- `enableCaching`: Enable configuration caching (default: `true`)
- `persistenceEnabled`: Enable filesystem persistence (default: `false`)
- `persistencePath`: Path for persistence (optional)

#### Methods

**setConfig**
```typescript
setConfig(
  entityId: string,
  entityType: string,
  config: EntityConfig,
  source?: ConfigSource
): Result<void, Error>
```

**getConfig**
```typescript
getConfig(entityId: string, entityType: string): Result<EntityConfig, Error>
```

**getConfigBySource**
```typescript
getConfigBySource(
  entityId: string,
  entityType: string,
  source: ConfigSource
): Result<EntityConfig, Error>
```

**mergeConfig**
```typescript
mergeConfig(
  entityId: string,
  entityType: string,
  additionalConfig: EntityConfig,
  options?: MergeOptions
): Result<EntityConfig, Error>
```

**removeConfig**
```typescript
removeConfig(
  entityId: string,
  entityType: string,
  source?: ConfigSource
): Result<void, Error>
```

**hasConfig**
```typescript
hasConfig(entityId: string, entityType: string): boolean
```

**getMetadata**
```typescript
getMetadata(entityId: string, entityType: string): Result<ConfigMetadata, Error>
```

**validateConfig**
```typescript
validateConfig(config: EntityConfig): ValidationResult
```

**clearCache**
```typescript
clearCache(): void
```

**clear**
```typescript
clear(): void
```

### EntityDefinitionRegistry

**register**
```typescript
register(definition: EntityDefinition): Result<void, Error>
```

**get**
```typescript
get(id: string, type: string): Result<EntityDefinition, Error>
```

**update**
```typescript
update(definition: Partial<EntityDefinition> & { id: string; type: string }): Result<void, Error>
```

**remove**
```typescript
remove(id: string, type: string): Result<void, Error>
```

**getAll**
```typescript
getAll(): EntityDefinition[]
```

**getByType**
```typescript
getByType(type: string): EntityDefinition[]
```

**getEnabled**
```typescript
getEnabled(): EntityDefinition[]
```

**enable / disable**
```typescript
enable(id: string, type: string): Result<void, Error>
disable(id: string, type: string): Result<void, Error>
```

## TypeScript Types

```typescript
interface EntityConfig {
  plugins?: string[];
  routes?: string[];
  services?: string[];
  schemas?: string[];
  settings?: Record<string, unknown>;
  security?: {
    allowedOrigins?: string[];
    rateLimit?: {
      max?: number;
      timeWindow?: number;
    };
    jwtSecret?: string;
  };
  database?: {
    url?: string;
    pool?: {
      min?: number;
      max?: number;
    };
  };
}

interface EntityDefinition {
  id: string;
  type: string;
  name: string;
  description?: string;
  enabled: boolean;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}
```

## Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm run test:watch

# Coverage
pnpm run test:coverage
```

## Coverage

This module maintains >95% code coverage:

- Lines: >95%
- Functions: >95%
- Branches: >95%
- Statements: >95%

## License

MIT

## Author

ThinkEloquent
