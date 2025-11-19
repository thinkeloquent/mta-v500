# Examples

This directory contains usage examples for the `@thinkeloquent/core-route-logger` module.

## Running Examples

### 1. Build the module first

```bash
cd ..
pnpm run build
```

### 2. Run an example

```bash
npx tsx examples/basic-usage.ts
```

## Available Examples

### basic-usage.ts

Demonstrates basic usage with:
- Multiple route registration
- Console and file logging
- Pretty printing
- Route counting

## Example Output

When you run `basic-usage.ts`, you'll see:

**Console Output:**
```
================================================================================
Fastify Routes
================================================================================
Generated at: 2025-01-21T10:30:00.000Z

└── / (HEAD, GET)
    └── api/
        ├── health (HEAD, GET)
        ├── users (HEAD, GET)
        │   └── / (POST)
        │       └── :id (HEAD, GET)
        │           └── / (PUT, DELETE)
        └── posts (HEAD, GET)
            └── / (POST)
                └── :id (HEAD, GET)
================================================================================
```

**File Output:**

The same output is written to `examples/routes.log`.

**Server Log:**
```
✅ Server started on http://localhost:3000
📝 Routes logged to: ./examples/routes.log
📊 Total routes: 10

Press Ctrl+C to stop the server
```
