# Create FastAPI App

Scaffolding tool for creating new FastAPI applications with the standard project structure.

## Usage

From the repository root:

```bash
# Using npm script (recommended)
npm run create:fastapi-app <app-name>

# Or directly
node tools/project-templates/fastapi-apps-simple/bin/create-fastapi-app.mjs <app-name>
```

### Example

```bash
npm run create:fastapi-app app_my_feature
# or without prefix (will be added automatically):
npm run create:fastapi-app my-feature
```

This creates:
```
fastapi-apps/app_my_feature/
├── app/
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # Pydantic Settings (env vars)
│   ├── database.py          # Async SQLAlchemy setup
│   ├── exceptions.py        # Custom exception classes
│   ├── middleware/
│   │   ├── __init__.py
│   │   ├── error_handler.py # Exception handlers
│   │   └── logging.py       # Request logging
│   ├── models/
│   │   └── __init__.py      # Import your models here
│   ├── schemas/
│   │   └── __init__.py      # Import your schemas here
│   ├── repositories/
│   │   ├── __init__.py
│   │   └── base.py          # Base CRUD repository
│   ├── routes/
│   │   ├── __init__.py
│   │   └── health.py        # Health check endpoint
│   ├── services/
│   │   ├── __init__.py
│   │   └── redis_service.py # Redis singleton
│   └── utils/
│       ├── __init__.py
│       ├── id_generator.py  # ID generation
│       ├── datetime_utils.py
│       └── json_utils.py
├── alembic/
│   ├── env.py               # Migration config
│   ├── script.py.mako       # Template
│   ├── README
│   └── versions/            # Migration files
├── tests/
│   ├── __init__.py
│   ├── unit/
│   └── integration/
├── requirements.txt         # Production deps
├── requirements-dev.txt     # Dev deps
├── Makefile                 # Dev commands
├── alembic.ini             # Alembic config
├── gunicorn.conf.py        # Production server
├── .gitignore
├── .env.example
└── README.md
```

## App Name Format

The app name must be in **kebab-case**:
- `app_my_feature` (with prefix)
- `my-feature` (prefix added automatically)
- `MyFeature` (no uppercase)
- `my_feature` (no underscores)

The `app-` prefix will be added automatically if not provided.

## After Creating

```bash
cd fastapi-apps/<app-name>
make venv
make install-dev
make run-dev
```

The API starts at `http://localhost:8080` with:
- Swagger UI: `/docs`
- ReDoc: `/redoc`
- Health check: `/health`

## Template Placeholders

The template uses these placeholders (automatically replaced):

| Placeholder | Example (for `app_my_feature`) |
|-------------|--------------------------------|
| `{{APP_NAME}}` | `app_my_feature` |
| `{{APP_NAME_SHORT}}` | `my-feature` |
| `{{APP_NAME_PASCAL}}` | `AppMyFeature` |
| `{{APP_NAME_CAMEL}}` | `appMyFeature` |
| `{{APP_NAME_SNAKE}}` | `app_my_feature` |
| `{{APP_NAME_TITLE}}` | `App My Feature` |
| `{{APP_NAME_UPPER_SNAKE}}` | `APP_MY_FEATURE` |

## Environment Variables

The template uses system environment variables (not .env files):

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_HOST` | `localhost` | Database host |
| `POSTGRES_PORT` | `5432` | Database port |
| `POSTGRES_USER` | `postgres` | Database user |
| `POSTGRES_PASSWORD` | `` | Database password |
| `POSTGRES_DB` | `app_my_feature` | Database name |
| `POSTGRES_SCHEMA` | `public` | Database schema |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_DB` | `0` | Redis database |
| `PORT` | `8080` | API port |
| `ENVIRONMENT` | `development` | Environment |

## Creating Frontend

After creating the backend, create the frontend:

```bash
npm run create:fastapi-frontend <app-name>
```

## Architecture

### Layered Architecture

```
Routes → Services → Repositories → Models (SQLAlchemy)
                ↓
            Database (PostgreSQL)
```

### Key Components

- **Routes**: API endpoint handlers
- **Services**: Business logic layer
- **Repositories**: Data access layer (CRUD operations)
- **Models**: SQLAlchemy ORM models
- **Schemas**: Pydantic validation models
- **Middleware**: Request/response processing
- **Utils**: Helper functions

### Database Migrations

Each app has its own Alembic version table (`alembic_version_<app_snake_name>`) to allow independent migrations.

```bash
# Create migration
make migrate-create MSG="Add new table"

# Apply migrations
make migrate-upgrade

# Show status
make migrate
```
