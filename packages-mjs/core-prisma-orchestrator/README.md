# @thinkeloquent/core-prisma-orchestrator

CLI orchestrator for managing multiple Prisma schemas in a monorepo. Coordinates Prisma operations (generate, migrate, format, etc.) across multiple apps with independent schemas.

## Features

- 🔄 **Multi-App Generation**: Generate Prisma clients for all apps in parallel
- 🔀 **Dependency-Aware Migrations**: Run migrations in correct order based on app dependencies
- ⚡ **Parallel Execution**: Fast operations with concurrent processing
- 📋 **Config-Driven**: JSON configuration or auto-discovery
- 🎯 **Selective Operations**: Target specific apps when needed
- 🔍 **Validation**: Built-in schema and config validation

## Installation

```bash
npm install @thinkeloquent/core-prisma-orchestrator --save-dev
```

## Configuration

Create `mta-prisma.config.json` in your project root:

```json
{
  "apps": [
    {
      "name": "auth",
      "schemaPath": "apps/auth/prisma/schema.prisma",
      "outputName": "client-auth",
      "dependencies": []
    },
    {
      "name": "billing",
      "schemaPath": "apps/billing/prisma/schema.prisma",
      "outputName": "client-billing",
      "dependencies": ["auth"]
    }
  ],
  "strategy": "orchestrated"
}
```

If no config file exists, the CLI will auto-discover apps from `apps/*/prisma/schema.prisma`.

## Usage

### Generate Clients

```bash
# Generate all apps
npx mta-prisma generate

# Generate specific app
npx mta-prisma generate --app auth

# Watch mode
npx mta-prisma watch

# Watch specific app
npx mta-prisma watch --app auth
```

### Migrations

```bash
# Development migrations (all apps)
npx mta-prisma migrate:dev

# Migrate specific app
npx mta-prisma migrate:dev --app auth

# Named migration
npx mta-prisma migrate:dev --name "add-user-roles"

# Production deployment
npx mta-prisma migrate:deploy

# Show status
npx mta-prisma migrate:status

# Show diff between schema and database
npx mta-prisma migrate:diff
npx mta-prisma migrate:diff --app auth

# Resolve migration issues
npx mta-prisma migrate:resolve 20231201_init --applied
npx mta-prisma migrate:resolve 20231201_init --rolled-back

# Create baseline for existing database
npx mta-prisma migrate:baseline initial_baseline

# Reset (DESTRUCTIVE)
npx mta-prisma migrate:reset --force
```

### Schema Utilities

```bash
# Format all schemas
npx mta-prisma format

# Validate all schemas
npx mta-prisma validate

# Open Prisma Studio
npx mta-prisma studio auth

# Show configuration info
npx mta-prisma info
```

## CLI Options

### Global Options

- `-c, --config <path>`: Path to config file (default: `mta-prisma.config.json`)
- `--verbose`: Enable verbose logging
- `--dry-run`: Show what would be done without executing

### Command-Specific Options

See `npx mta-prisma <command> --help` for detailed options.

## Configuration Schema

### AppConfig

```typescript
interface AppConfig {
  name: string;                    // App name
  schemaPath: string;              // Path to schema.prisma
  outputName: string;              // Generated client output name
  dependencies?: string[];         // Apps this depends on
  enabled?: boolean;               // Whether to include this app
  databaseUrlEnv?: string;         // Custom env var for DATABASE_URL
}
```

### MtaPrismaConfig

```typescript
interface MtaPrismaConfig {
  apps: AppConfig[];                        // List of apps
  strategy: 'orchestrated' | 'merged';      // Migration strategy
  mergedSchemaPath?: string;                // Path for merged schema
  databaseUrl?: string;                     // Default database URL
  prismaFlags?: {                           // Additional Prisma flags
    generate?: string[];
    migrate?: string[];
    studio?: string[];
  };
}
```

## Examples

### Multi-App Monorepo

```
monorepo/
├── apps/
│   ├── auth/
│   │   └── prisma/
│   │       └── schema.prisma
│   └── billing/
│       └── prisma/
│           └── schema.prisma
├── mta-prisma.config.json
└── package.json
```

### Per-App Schema

```prisma
// apps/auth/prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/client-auth"
}

model User {
  id    String @id
  email String @unique
}
```

## Integration with Prisma

This CLI wraps the official Prisma CLI and adds multi-schema orchestration. All standard Prisma commands work with `--schema` flag under the hood.

## License

MIT
