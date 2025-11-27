# postgres-db

PostgreSQL connection manager with namespace-based pooling for FastAPI applications.

## Features

- **Namespace-based connection management** - Isolate database connections by namespace
- **Integration with env-secrets** - Load configuration from environment namespaces
- **Dual mode support** - Both async (asyncpg) and sync (psycopg2) connections
- **Connection pooling** - Built on SQLAlchemy 2.0 with configurable pool settings
- **Eager and lazy loading** - Initialize connections at startup or on-demand
- **FastAPI lifespan integration** - Automatic startup and shutdown handling
- **Debug routes** - Built-in endpoints for connection testing and monitoring
- **Type-safe** - Full type hints and Pydantic models

## Installation

```bash
pip install -e ./packages/postgres_db
```

Or add to `pyproject.toml`:

```toml
[tool.poetry.dependencies]
postgres_db = {path = "packages/postgres_db", develop = true}
```

## Quick Start

### 1. Configure Environment Variables

Create your env secrets file with database configuration:

```bash
# /etc/secrets/MTA_DEV
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=myuser
POSTGRES_PASSWORD=mypassword
POSTGRES_DB=myapp
POSTGRES_SCHEMA=public

# Optional pool settings
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=0
DB_POOL_PRE_PING=true
DB_POOL_RECYCLE=3600
```

### 2. Initialize in FastAPI App

```python
from fastapi import FastAPI, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from postgres_db.fastapi import create_db_lifespan_handler, get_db_session

# Create lifespan handler that loads from env_secrets
lifespan = create_db_lifespan_handler(
    namespaces=["app_db"]  # Will load from env_secrets namespace "app_db"
)

app = FastAPI(lifespan=lifespan)

# Use in routes
@app.get("/items")
async def get_items(db: AsyncSession = Depends(get_db_session)):
    from sqlalchemy import select
    from .models import Item

    result = await db.execute(select(Item))
    return result.scalars().all()
```

## Usage Examples

### Example 1: Single Database (Default Namespace)

```python
from fastapi import FastAPI, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from postgres_db.fastapi import create_db_lifespan_handler, get_db_session

# Set default namespace via environment variable
# DB_DEFAULT_NAMESPACE=app_db

# Initialize with default namespace
lifespan = create_db_lifespan_handler(namespaces=["app_db"])
app = FastAPI(lifespan=lifespan)

# Use default namespace in dependencies
@app.get("/users")
async def get_users(db: AsyncSession = Depends(get_db_session)):
    # Uses default namespace "app_db"
    result = await db.execute(select(User))
    return result.scalars().all()
```

### Example 2: Multiple Databases (Multi-namespace)

```python
from fastapi import FastAPI, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from postgres_db.fastapi import create_db_lifespan_handler, get_db_namespace

# Load multiple namespaces at startup
lifespan = create_db_lifespan_handler(
    namespaces=["app_db", "analytics_db", "cache_db"]
)
app = FastAPI(lifespan=lifespan)

# Create namespace-specific dependencies
get_app_db = get_db_namespace("app_db")
get_analytics_db = get_db_namespace("analytics_db")

@app.get("/users")
async def get_users(db: AsyncSession = Depends(get_app_db)):
    # Uses app_db namespace
    result = await db.execute(select(User))
    return result.scalars().all()

@app.get("/analytics")
async def get_analytics(db: AsyncSession = Depends(get_analytics_db)):
    # Uses analytics_db namespace
    result = await db.execute(select(Analytics))
    return result.scalars().all()
```

### Example 3: Explicit Configuration (No env-secrets)

```python
from fastapi import FastAPI
from postgres_db import DatabaseConfig
from postgres_db.fastapi import create_db_lifespan_handler

# Define configs explicitly
configs = {
    "app_db": DatabaseConfig(
        host="localhost",
        port=5432,
        user="app_user",
        password="app_password",
        database="app_db",
        schema="public",
        pool_size=10,
    ),
    "analytics_db": DatabaseConfig(
        host="analytics-host",
        port=5432,
        user="analytics_user",
        password="analytics_password",
        database="analytics",
        schema="analytics_schema",
        pool_size=5,
    ),
}

# Pass configs directly
lifespan = create_db_lifespan_handler(configs=configs)
app = FastAPI(lifespan=lifespan)
```

### Example 4: Sync Database Sessions (for Alembic)

```python
from fastapi import Depends
from sqlalchemy.orm import Session
from postgres_db.fastapi import get_sync_db_session

@app.get("/users-sync")
def get_users_sync(db: Session = Depends(get_sync_db_session)):
    # Uses sync connection (psycopg2)
    result = db.execute(select(User))
    return result.scalars().all()
```

### Example 5: Lazy Loading Namespaces

```python
from postgres_db.fastapi import create_db_lifespan_handler

# Don't auto-initialize at startup
lifespan = create_db_lifespan_handler(
    namespaces=["app_db"],
    auto_initialize=False  # Connections created on first use
)
app = FastAPI(lifespan=lifespan)

# Connection will be created when first route is called
@app.get("/users")
async def get_users(db: AsyncSession = Depends(get_db_session)):
    # Connection initialized here on first call
    result = await db.execute(select(User))
    return result.scalars().all()
```

## Debug Routes

The package includes built-in debug routes at `/debug/db/*`:

### Include Debug Routes in Your App

```python
from app.routes import debug_postgres

app.include_router(debug_postgres.router)
```

### Available Endpoints

- **GET /debug/db/namespaces** - List all registered namespaces
- **GET /debug/db/test/{namespace_key}** - Test connection (SELECT 1)
- **GET /debug/db/config/{namespace_key}** - Show configuration (masked password)
- **GET /debug/db/info** - Get all connection information
- **POST /debug/db/connect/{namespace_key}** - Lazy-load a namespace

All endpoints require Basic Authentication (DEBUG_AUTH_USERNAME, DEBUG_AUTH_PASSWORD).

### Example Usage

```bash
# List namespaces
curl -u admin:debug http://localhost:8000/debug/db/namespaces

# Test connection
curl -u admin:debug http://localhost:8000/debug/db/test/app_db

# Get config
curl -u admin:debug http://localhost:8000/debug/db/config/app_db

# Lazy-load namespace
curl -X POST -u admin:debug http://localhost:8000/debug/db/connect/new_db
```

## Configuration

### Environment Variables

**Database Connection:**
- `POSTGRES_HOST` - Database host (default: localhost)
- `POSTGRES_PORT` - Database port (default: 5432)
- `POSTGRES_USER` - Database user (required)
- `POSTGRES_PASSWORD` - Database password (required)
- `POSTGRES_DB` - Database name (required)
- `POSTGRES_SCHEMA` - Default schema (default: public)

**Connection Pool:**
- `DB_POOL_SIZE` - Pool size (default: 10)
- `DB_MAX_OVERFLOW` - Max overflow connections (default: 0)
- `DB_POOL_PRE_PING` - Enable health checks (default: true)
- `DB_POOL_RECYCLE` - Recycle time in seconds (default: 3600)
- `DB_ECHO` - Enable SQL echo (default: false)

**Package Settings:**
- `DB_DEFAULT_NAMESPACE` - Default namespace (default: app_db)

### DatabaseConfig Model

```python
from postgres_db import DatabaseConfig

config = DatabaseConfig(
    host="localhost",
    port=5432,
    user="myuser",
    password="mypassword",
    database="mydb",
    schema="public",
    pool_size=10,
    max_overflow=0,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=False,
)

# Get connection URLs
async_url = config.async_url  # postgresql+asyncpg://...
sync_url = config.sync_url    # postgresql+psycopg2://...

# Mask password for logging
masked = config.mask_password()  # password shows as "my...rd"
```

## API Reference

### Core Functions

```python
from postgres_db import (
    register_namespace,
    get_namespace_connection,
    list_namespaces,
    get_connection_info,
    test_connection,
    close_all_connections,
)

# Register a namespace
register_namespace("my_db", config)

# Get connection
conn = get_namespace_connection("my_db")

# List all namespaces
namespaces = list_namespaces()

# Get connection info
info = get_connection_info("my_db")

# Test connection
success, error = await test_connection("my_db")

# Close all connections
await close_all_connections()
```

### FastAPI Integration

```python
from postgres_db.fastapi import (
    create_db_lifespan_handler,
    get_db_session,
    get_sync_db_session,
    get_db_namespace,
)

# Create lifespan handler
lifespan = create_db_lifespan_handler(namespaces=["app_db"])

# Get async session (default namespace)
async def endpoint(db: AsyncSession = Depends(get_db_session)):
    pass

# Get sync session
def sync_endpoint(db: Session = Depends(get_sync_db_session)):
    pass

# Get namespace-specific session
get_analytics = get_db_namespace("analytics_db")
async def analytics_endpoint(db: AsyncSession = Depends(get_analytics)):
    pass
```

## Error Handling

```python
from postgres_db.errors import (
    PostgresDBError,
    NamespaceNotFoundError,
    ConnectionError,
    ConfigurationError,
)

try:
    conn = get_namespace_connection("missing_db")
except NamespaceNotFoundError as e:
    print(f"Namespace not found: {e.namespace}")
    print(f"Available: {e.available_namespaces}")

try:
    await conn.initialize_async()
except ConnectionError as e:
    print(f"Failed to connect: {e.reason}")
```

## Integration with Existing Apps

### For persona_editor or react_component_esm

Replace existing database.py with postgres_db:

**Before:**
```python
# app/database.py
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

engine = create_async_engine(settings.database_url, ...)
AsyncSessionLocal = async_sessionmaker(engine, ...)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
```

**After:**
```python
# app/main.py
from postgres_db.fastapi import create_db_lifespan_handler, get_db_session

lifespan = create_db_lifespan_handler(namespaces=["app_db"])
app = FastAPI(lifespan=lifespan)

# In routes, replace database.get_db with postgres_db get_db_session
from postgres_db.fastapi import get_db_session

@router.get("/items")
async def get_items(db: AsyncSession = Depends(get_db_session)):
    ...
```

## Development

### Running Tests

```bash
cd packages/postgres_db
pytest tests/
```

### Type Checking

```bash
mypy postgres_db/
```

### Code Formatting

```bash
black postgres_db/
ruff postgres_db/
```

## License

MIT
