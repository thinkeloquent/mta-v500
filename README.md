# MTA-V500

Multi-Tenant/Multi-App orchestrator supporting both FastAPI (Python) and Fastify (Node.js) applications with shared configuration and type-safe schemas.

## Makefile

### Build specific Dockerfile

make -f Makefile.docker build DOCKERFILE=Dockerfile.fastapi

### Build with target stage

make -f Makefile.docker build DOCKERFILE=Dockerfile.database TARGET=postgres

### Build from subdirectory context

make -f Makefile.docker build DOCKERFILE=Dockerfile.fastify CONTEXT=./fastify-apps

### Use existing thin wrappers (backwards compatible)

make -f Makefile.fastify docker-build
make -f Makefile.static-apps build

### List available Dockerfiles

make -f Makefile.docker list-dockerfiles

## Project Structure

```
mta-v500/
├── common/                          # Shared configs, schemas, types
│   ├── config/                      # Configuration files
│   │   ├── app-registry.json        # App metadata
│   │   ├── database.yaml            # Database config
│   │   ├── redis.yaml               # Redis config
│   │   └── environments/            # Environment-specific configs
│   ├── schemas/                     # Data schemas (JSON, YAML, Proto)
│   ├── types/                       # Generated types (Python, TypeScript)
│   └── scripts/                     # Code generation scripts
│
├── fastapi-apps/                    # Python/FastAPI applications
│   ├── ask_ai/                      # AI chat application
│   ├── aws_s3_files/                # AWS S3 file manager
│   ├── chat_window/                 # Chat window
│   ├── figma-component-inspector/   # Figma inspector
│   ├── persona_editor/              # Persona editor
│   ├── react_component_esm/         # React component viewer
│   └── hello/                       # Demo app
│
├── fastify-apps/                    # Node.js/Fastify applications (empty - ready for future)
│
├── packages-py/                     # Python packages (for PyPI)
│   ├── auto_register_routes/        # Auto route registration
│   ├── figma-api/                   # Figma API SDK
│   ├── jira-api/                    # Jira API SDK
│   └── static_server/               # Static file server
│
├── packages-mjs/                    # JavaScript packages (for NPM)
│   ├── ui-components/               # Shared React components
│   ├── utils/                       # Shared utilities
│   └── config-loader/               # Config loader
│
├── static/                          # Built frontend artifacts
│   └── app/                         # Served by FastAPI/Fastify
│
├── .claude/agents/                  # Claude Code automation agents
│   ├── python-poetry-workspace.md
│   ├── frontend-workspace.md
│   ├── common-schema-manager.md
│   ├── docker-orchestrator.md
│   └── makefile-coordinator.md
│
├── Dockerfile.fastapi              # FastAPI applications
├── Dockerfile.fastify              # Fastify applications
├── Dockerfile.database             # Postgres + Redis
│
├── Makefile                        # Main CI orchestrator
├── Makefile.fastapi               # FastAPI development
├── Makefile.fastify               # Fastify development
├── Makefile.database              # Database management
│
├── docker-compose.yml             # Databases only (Postgres + Redis)
├── package.json                   # npm workspaces root
└── pyproject.toml                 # Poetry workspace root
```

## Prerequisites

- **Python 3.11+** - For FastAPI applications
- **Node.js 23+** - For frontend builds and Fastify apps
- **Poetry** - Python dependency management
- **Docker & Docker Compose** - For containerized development
- **Make** - For running build commands

## Quick Start (CI Commands)

**IMPORTANT:** Database commands require explicit execution. The standard CI targets (`make install`, `make build`, `make test`, `make run`, `make clean`) do NOT touch the database.

### 1. Install All Dependencies

```bash
# Install app dependencies (FastAPI + Fastify)
make install
```

This will:

- Install Python dependencies via Poetry
- Install JavaScript dependencies via npm

**Note:** Database setup requires explicit command (see step 2).

### 2. Setup Databases

```bash
# Start databases (Postgres + Redis)
make -f Makefile.database run
```

This will:

- Start PostgreSQL on port 5432
- Start Redis on port 6379
- Create Docker volumes for data persistence

**Optional:** Build database images first (if needed):

```bash
make -f Makefile.database build
```

### 3. Build All Components

```bash
# Build apps (FastAPI + Fastify)
make build
```

This will:

- Build all FastAPI apps and frontends
- Build all Fastify apps (currently empty)
- Generate types from schemas
- Validate configurations

**Note:** Database image builds require explicit command: `make -f Makefile.database build`

### 4. Run Tests

```bash
# Run all tests (FastAPI + Fastify)
make test
```

This will:

- Run Python tests (pytest)
- Run JavaScript tests (npm test)

### 5. Start Services

```bash
# Show startup instructions
make run
```

Then start services in separate terminals:

```bash
# Terminal 1: Databases (if not already running)
make -f Makefile.database run

# Terminal 2: Start FastAPI (port 8080)
make -f Makefile.fastapi run

# Terminal 3: Start Fastify (port 3000) - when apps exist
make -f Makefile.fastify run
```

### 6. Clean Everything

```bash
# Clean app build artifacts (FastAPI + Fastify)
make clean
```

**Database cleanup requires explicit commands:**

```bash
# Stop databases (preserve data)
make -f Makefile.database clean

# Reset databases (DELETE ALL DATA)
make -f Makefile.database db-reset
```

## Detailed Setup Instructions

### Environment Variables

**IMPORTANT:** This project uses system environment variables (per `CLAUDE.md`). Never use `.env` files.

Required environment variables:

```bash
# Set these in your shell profile (.bashrc, .zshrc, etc.)
export POSTGRES_USER=myuser
export POSTGRES_PASSWORD=mypassword
export POSTGRES_DB=mta_db
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_SCHEMA=public
```

### Database Setup

```bash
# Start databases (Postgres + Redis)
make -f Makefile.database run

# View database logs
make -f Makefile.database db-logs

# Reset databases (DELETES ALL DATA)
make -f Makefile.database db-reset

# Run migrations
make -f Makefile.database db-migrate

# Open PostgreSQL shell
make -f Makefile.database db-shell-postgres

# Open Redis CLI
make -f Makefile.database db-shell-redis
```

### FastAPI Development

```bash
# Install dependencies
make -f Makefile.fastapi install

# Build apps and frontends
make -f Makefile.fastapi build

# Run main orchestrator with hot-reload (port 8080)
make -f Makefile.fastapi dev

# Run specific sub-app
make -f Makefile.fastapi dev-app NAME=hello

# Run all apps simultaneously
make -f Makefile.fastapi dev-all

# Run tests
make -f Makefile.fastapi test

# Run tests for specific sub-app
make -f Makefile.fastapi test-app NAME=hello

# Clean
make -f Makefile.fastapi clean
```

### Fastify Development

```bash
# Install dependencies
make -f Makefile.fastify install

# Build apps
make -f Makefile.fastify build

# Run with hot-reload (port 3000)
make -f Makefile.fastify dev

# Run specific app
make -f Makefile.fastify dev-app NAME=my-app

# Run all apps simultaneously
make -f Makefile.fastify dev-all

# Run tests
make -f Makefile.fastify test

# Generate types from schemas
make -f Makefile.fastify generate-types

# Validate schemas
make -f Makefile.fastify validate-schemas

# Clean
make -f Makefile.fastify clean
```

## Docker Deployment

### Build Docker Images

```bash
# Build FastAPI image
docker build -f Dockerfile.fastapi -t mta-fastapi:latest .

# Build Fastify image
docker build -f Dockerfile.fastify -t mta-fastify:latest .

# Build database images
docker compose build postgres redis
```

### Run with Docker

```bash
# Start databases
docker compose up postgres redis -d

# Run FastAPI app
docker run -p 8080:8080 \
  --network mta-network \
  --name mta-fastapi \
  -e POSTGRES_HOST=postgres \
  -e POSTGRES_PORT=5432 \
  -e POSTGRES_USER=${POSTGRES_USER} \
  -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD} \
  -e POSTGRES_DB=${POSTGRES_DB} \
  mta-fastapi:latest

# Run Fastify app (when apps exist)
docker run -p 3000:3000 \
  --network mta-network \
  --name mta-fastify \
  mta-fastify:latest
```

## API Endpoints

### Main Orchestrator (FastAPI)

- Base URL: `http://localhost:8080`
- Swagger UI: `http://localhost:8080/docs`
- ReDoc: `http://localhost:8080/redoc`

### Application Routes

- `/ask-ai` - AI chat application
- `/aws-s3-files` - AWS S3 file manager
- `/chat-window` - Chat window
- `/figma-component-inspector` - Figma inspector
- `/persona-editor` - Persona editor
- `/react-component-esm` - React component viewer

## Configuration

### App Registry

Apps are registered in `common/config/app-registry.json`:

```json
{
  "apps": {
    "my-app": {
      "name": "my-app",
      "displayName": "My App",
      "port": 3001,
      "type": "fastapi",
      "hasBackend": true,
      "hasFrontend": true,
      "routes": ["/my-app"]
    }
  }
}
```

### Environment-Specific Config

Located in `common/config/environments/`:

- `dev.json` - Development
- `staging.json` - Staging
- `prod.json` - Production

## Adding New Applications

### FastAPI Application

1. Create directory: `fastapi-apps/my-app/`
2. Add `app/` for backend code
3. Add `frontend/` for React frontend
4. Update `common/config/app-registry.json`
5. Run `make -f Makefile.fastapi dev-app NAME=my-app`

### Fastify Application

1. Create directory: `fastify-apps/my-app/`
2. Add `server.mjs` as entry point
3. Add `src/` for React frontend source
4. Configure Vite to build to `../../static/app/my-app/`
5. Update `common/config/app-registry.json`
6. Run `make -f Makefile.fastify run`

See `fastify-apps/README.md` for detailed instructions.

## Using Shared Packages

### Python (FastAPI)

```python
# Load configuration
from packages_py.common_loader import load_config
config = load_config('database.yaml')

# Use shared packages
from static_server import serve_static
from auto_register_routes import register_routes
```

### JavaScript (Frontend)

```typescript
// Load configuration
import { loadConfig } from "@mta/config-loader";
const config = loadConfig("dev");

// Use shared components
import { Button, Card } from "@mta/ui-components";
import { formatDate } from "@mta/utils";
```

## Schema Management

### Adding Schemas

1. Add schema to `common/schemas/json/my-schema.json`
2. Generate types: `./common/scripts/generate-types.sh`
3. Validate: `./common/scripts/validate-schemas.sh`
4. Import in code:

```python
# Python (Pydantic)
from common.types.python.my_schema import MyModel
```

```typescript
// TypeScript (Zod)
import { MyModelSchema } from "../../common/types/typescript";
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: make install

      - name: Build
        run: make build

      - name: Test
        run: make test
```

## Troubleshooting

### Virtual environment not found

```bash
# Run install first
make -f Makefile.fastapi install
```

### Database connection failed

```bash
# Check environment variables are set
echo $POSTGRES_USER
echo $POSTGRES_PASSWORD

# Check databases are running
docker compose ps postgres redis

# View database logs
make -f Makefile.database db-logs
```

### Frontend build errors

```bash
# Clean and rebuild
make -f Makefile.fastapi clean
npm install
make -f Makefile.fastapi build
```

### Docker network issues

```bash
# Ensure mta-network exists
docker network ls | grep mta-network

# Recreate if needed
docker network create mta-network
```

## Help Commands

```bash
# Main help
make help

# FastAPI help
make -f Makefile.fastapi help

# Fastify help
make -f Makefile.fastify help

# Database help
make -f Makefile.database help
```

## Development Tools

### Claude Code Agents

Located in `.claude/agents/`, these agents help manage:

- Python Poetry workspaces
- Frontend npm workspaces
- Schema management and type generation
- Docker orchestration
- Makefile coordination

Use with Claude Code CLI for automated maintenance tasks.

## License

UNLICENSED

## Contributing

1. Create a feature branch
2. Make changes
3. Run tests: `make test`
4. Build: `make build`
5. Create pull request

## Support

For issues and questions:

- Check existing documentation in `docs/`
- Review `.claude/agents/` for subsystem details
- Check Makefile help: `make help`

"optionalDependencies": {
"@rollup/rollup-darwin-arm64": "^4.53.1"
}
