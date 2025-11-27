# Create FastAPI Frontend

Scaffolding tool for creating new React + Vite + Tailwind frontends for FastAPI applications.

## Usage

From the repository root:

```bash
# Using npm script (recommended)
npm run create:fastapi-frontend <app-name>

# Or directly
node tools/project-templates/fastapi-apps-frontend-simple/bin/create-fastapi-frontend.mjs <app-name>
```

### Example

```bash
npm run create:fastapi-frontend app_my_feature
# or without prefix (will be added automatically):
npm run create:fastapi-frontend my-feature
```

This creates:
```
fastapi-apps/app_my_feature/frontend/
├── src/
│   ├── main.tsx           # Entry point
│   ├── App.tsx            # Root component with API status check
│   ├── index.css          # Global styles (Tailwind)
│   ├── api.ts             # API client functions
│   ├── vite-env.d.ts      # Vite type definitions
│   ├── types/
│   │   └── index.ts       # TypeScript type definitions
│   ├── components/        # React components
│   ├── services/          # Business logic
│   └── utils/             # Utility functions
├── public/
│   └── vite.svg
├── index.html
├── vite.config.ts         # Vite configuration with API proxy
├── tsconfig.json          # TypeScript config (references)
├── tsconfig.app.json      # App TypeScript config
├── tsconfig.node.json     # Node TypeScript config
├── tailwind.config.js     # Tailwind CSS config
├── postcss.config.js      # PostCSS config
├── package.json
├── project.json           # Nx configuration
├── .env.example           # Environment variables template
└── .gitignore
```

## App Name Format

The app name must be in **kebab-case**:
- ✅ `app_my_feature` (with prefix)
- ✅ `my-feature` (prefix added automatically)
- ❌ `MyFeature` (no uppercase)
- ❌ `my_feature` (no underscores)

The `app-` prefix will be added automatically if not provided.

## After Creating

```bash
cd fastapi-apps/<app-name>/frontend
pnpm install
npm run dev
```

The frontend dev server starts at `http://localhost:5173` with:
- API proxy to `http://localhost:8080` (configurable via `.env`)
- Hot module replacement
- TypeScript support

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# API Configuration
VITE_API_URL=http://localhost:8080

# Debug mode
VITE_APP_DEBUG=false
```

### Vite Configuration

Key settings in `vite.config.ts`:

| Setting | Default | Description |
|---------|---------|-------------|
| `base` | `/static/app/<name>/frontend/dist/` | Production build base path |
| `server.port` | `5173` | Development server port |
| `server.proxy` | `/api` → `localhost:8080` | API proxy for development |

### Path Aliases

The template includes path alias support:

```typescript
// Instead of:
import { Button } from '../../../components/Button';

// Use:
import { Button } from '@/components/Button';
```

## Project Structure

### Components (`src/components/`)

Add your React components here:

```tsx
// src/components/Button.tsx
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ children, onClick }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
    >
      {children}
    </button>
  );
}
```

### API Functions (`src/api.ts`)

Add your API functions:

```typescript
export interface Item {
  id: string;
  name: string;
}

export async function fetchItems(): Promise<Item[]> {
  return fetchApi<Item[]>('/api/items');
}

export async function createItem(name: string): Promise<Item> {
  return fetchApi<Item>('/api/items', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}
```

### Types (`src/types/`)

Define your TypeScript types:

```typescript
// src/types/index.ts
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}
```

## Building for Production

```bash
npm run build
```

Output goes to `dist/` which can be served by:
1. FastAPI's static file middleware
2. Nginx (see deployment section)

## Template Placeholders

The template uses these placeholders (automatically replaced):

| Placeholder | Example (for `app_my_feature`) |
|-------------|--------------------------------|
| `{{APP_NAME}}` | `app_my_feature` |
| `{{APP_NAME_SHORT}}` | `my-feature` |
| `{{APP_NAME_PASCAL}}` | `AppMyFeature` |
| `{{APP_NAME_CAMEL}}` | `appMyFeature` |
| `{{APP_NAME_TITLE}}` | `App My Feature` |
| `{{APP_NAME_UPPER_SNAKE}}` | `APP_MY_FEATURE` |

## Integration with FastAPI

Your FastAPI backend should serve the frontend at:
- Development: Vite dev server proxies to FastAPI
- Production: FastAPI serves static files from `frontend/dist/`

Example FastAPI static file setup:

```python
from fastapi.staticfiles import StaticFiles

app.mount(
    "/static/app/my-feature/frontend/dist",
    StaticFiles(directory="frontend/dist"),
    name="frontend"
)
```

## Nx Integration

The generated `project.json` integrates with Nx:

```bash
# Build
nx build @internal/app_my_feature-frontend

# Development
nx dev @internal/app_my_feature-frontend

# Test
nx test @internal/app_my_feature-frontend
```
