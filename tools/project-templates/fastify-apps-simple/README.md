# Create Fastify App

Scaffolding tool for creating new Fastify applications in the monorepo.

## Usage

From the repository root:

```bash
# Using npm script (recommended)
npm run create:fastify-app <app-name>

# Or directly
node tools/project-templates/fastify-apps-simple/bin/create-fastify-app.mjs <app-name>
```

### Example

```bash
npm run create:fastify-app my-api
```

This creates:
```
fastify-apps/my-api/
├── .gitignore
├── .env.example
├── package.json
├── project.json          # Nx configuration
├── server.test.mjs       # Standalone dev server
├── src/
│   └── index.mjs         # Plugin entry point
└── frontend/
    ├── package.json
    ├── project.json
    ├── vite.config.ts
    ├── index.html
    ├── tsconfig.json
    ├── tsconfig.node.json
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── main.tsx
        ├── App.tsx
        └── index.css
```

## App Name Format

The app name must be in **kebab-case**:
- ✅ `my-api`
- ✅ `user-service`
- ✅ `data-processor`
- ❌ `MyAPI` (no uppercase)
- ❌ `my_api` (no underscores)
- ❌ `my--api` (no consecutive hyphens)

## After Creating

```bash
cd fastify-apps/<app-name>
pnpm install
npm run app:dev
```

The server starts at `http://localhost:3000` with:
- `GET /` - Frontend UI
- `GET /health` - Health check
- `GET /api/<app-name>` - API health check
- `GET /api/<app-name>/hello` - Hello endpoint
- `POST /api/<app-name>/echo` - Echo endpoint

## Customization

### Adding Dependencies

Edit `fastify-apps/<app-name>/package.json` and run `pnpm install`.

### Frontend Development

```bash
cd fastify-apps/<app-name>/frontend
npm run dev
```

Frontend dev server runs at `http://localhost:5174` with API proxy to backend.

### Building Frontend

```bash
cd fastify-apps/<app-name>/frontend
npm run build
```

Output goes to `frontend/dist/` which is served by the Fastify backend.

## Template Placeholders

The template uses these placeholders (automatically replaced):

| Placeholder | Example (for `my-api`) |
|-------------|------------------------|
| `{{APP_NAME}}` | `my-api` |
| `{{APP_NAME_PASCAL}}` | `MyApi` |
| `{{APP_NAME_CAMEL}}` | `myApi` |
| `{{APP_NAME_TITLE}}` | `My Api` |
| `{{APP_NAME_UPPER_SNAKE}}` | `MY_API` |

## File Structure

```
tools/project-templates/fastify-apps-simple/
├── bin/
│   └── create-fastify-app.mjs  # CLI entry point
├── template/                    # Template files
│   ├── package.json.tmpl
│   ├── project.json.tmpl
│   ├── server.test.mjs
│   ├── src/
│   │   └── index.mjs
│   └── frontend/
│       └── ...
├── package.json
└── README.md
```

Files ending in `.tmpl` have their extension removed in the output.
