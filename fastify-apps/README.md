# Fastify Apps

This folder contains Node.js/Fastify server applications for MTA-V500.

## Structure

Each app should follow this pattern:

```
fastify-apps/
└── {app-name}/
    ├── server.mjs               # Entry point - serves frontend + API
    ├── package.json             # npm package configuration
    ├── vite.config.js           # Frontend build configuration
    └── src/                     # React source code
        ├── main.tsx             # React entry point
        ├── App.tsx              # Root component
        └── config.ts            # Loads from ../../common/config
```

## Frontend Build

- Vite builds `src/` to `../../static/app/{app-name}/`
- `server.mjs` serves the built static files
- Can also provide API routes if needed

## Server Pattern

Example `server.mjs`:

```javascript
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { loadConfig } from '@mta/config-loader';
import path from 'path';

const config = await loadConfig(process.env.MTA_ENV || 'dev');
const appConfig = config.apps['my-app'];
const fastify = Fastify({ logger: true });

// Serve static files
fastify.register(fastifyStatic, {
  root: path.join(process.cwd(), 'static/app/my-app'),
  prefix: '/'
});

// API routes
fastify.get('/api/config', async () => {
  return appConfig;
});

// Start server
fastify.listen({
  port: appConfig.port || 3000,
  host: '0.0.0.0'
});
```

## Config Loading

Use `@mta/config-loader` to load configuration from `../../common/config`:

```typescript
import { loadConfig } from '@mta/config-loader';

const config = await loadConfig(process.env.MTA_ENV || 'dev');
console.log(config.apps['my-app']);
```

## Building

From root directory:

```bash
# Build all Fastify apps
make -f Makefile.fastify build

# Run all Fastify apps
make -f Makefile.fastify run

# Or use npm workspaces
npm run build --workspace fastify-apps/{app-name}
npm run dev --workspace fastify-apps/{app-name}
```

## When to Use Fastify vs FastAPI

**Use Fastify when:**
- You need server-side rendering (SSR)
- You want a pure Node.js/JavaScript stack
- You need WebSocket or real-time features
- You want maximum frontend control

**Use FastAPI when:**
- You need Python for backend logic
- You have existing FastAPI routes in the orchestrator
- You want to leverage Python data science/ML libraries
- Frontend is static and doesn't need SSR

## Currently Empty

This folder is currently empty and ready for future Node.js applications. All existing apps are in `./fastapi-apps`.
