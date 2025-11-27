# App Google Gemini Openai Chat Completions

FastAPI backend application.

## Quick Start

```bash
# Create virtual environment and install dependencies
make venv
make install-dev

# Run development server
make run-dev
```

The API will be available at `http://localhost:8080`

## Project Structure

```
app-google-gemini-openai-chat-completions/
├── app/                    # Application package
│   ├── main.py            # FastAPI entry point
│   ├── config.py          # Configuration (env vars)
│   ├── database.py        # SQLAlchemy async setup
│   ├── exceptions.py      # Custom exceptions
│   ├── middleware/        # Request/response middleware
│   ├── models/            # SQLAlchemy ORM models
│   ├── schemas/           # Pydantic validation schemas
│   ├── repositories/      # Data access layer
│   ├── routes/            # API endpoint handlers
│   ├── services/          # Business logic
│   └── utils/             # Helper functions
├── alembic/               # Database migrations
├── tests/                 # Test files
├── requirements.txt       # Production dependencies
├── requirements-dev.txt   # Development dependencies
└── Makefile              # Development commands
```

## Development Commands

```bash
# Setup
make venv              # Create virtual environment
make install           # Install production deps
make install-dev       # Install dev deps

# Running
make run-dev           # Run with hot reload
make run               # Run with Gunicorn

# Testing
make test              # Run tests
make test-cov          # Run with coverage

# Code Quality
make lint              # Run linting
make format            # Format code
make type-check        # Type checking
make quality           # All quality checks

# Migrations
make migrate           # Show status
make migrate-upgrade   # Apply migrations
make migrate-create MSG="message"  # Create migration

# Cleanup
make clean             # Remove cache
make clean-all         # Remove venv
```

## Configuration

Environment variables (from system, not .env file):

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | `` | Google Gemini API key (required) |
| `POSTGRES_HOST` | `localhost` | Database host |
| `POSTGRES_PORT` | `5432` | Database port |
| `POSTGRES_USER` | `postgres` | Database user |
| `POSTGRES_PASSWORD` | `` | Database password |
| `POSTGRES_DB` | `app_google_gemini_openai_chat_completions` | Database name |
| `POSTGRES_SCHEMA` | `public` | Database schema |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_DB` | `0` | Redis database |
| `PORT` | `8080` | API port |
| `ENVIRONMENT` | `development` | Environment |

### Proxy Configuration

This app uses `fetch_proxy_dispatcher` for environment-aware proxy configuration when making requests to the Gemini API.

#### Option 1: Server Entry Point (Recommended)

Configure proxy settings directly in `app/main.py` for centralized management:

```python
# app/main.py

PROXY_CONFIG = FactoryConfig(
    # Explicit proxy URLs per environment
    proxy_urls=ProxyUrlConfig(
        DEV=None,  # No proxy in dev
        STAGE=None,
        QA=None,
        PROD="http://proxy.company.com:8080",  # Production proxy
    ),
    # Agent proxy override (optional)
    agent_proxy=AgentProxyConfig(
        http_proxy=None,
        https_proxy=None,
    ),
    # SSL certificates (optional)
    cert="/path/to/client.crt",  # Client certificate
    ca_bundle="/path/to/ca-bundle.crt",  # CA bundle for verification
)
```

#### Option 2: Environment Variables (Fallback)

If no explicit config is set in `main.py`, environment variables are used as fallback:

```bash
# Set proxy via environment variables
export APP_ENV=PROD
export PROXY_PROD_URL=http://proxy.company.com:8080

# Or use agent proxy
export HTTPS_PROXY=http://agent-proxy.company.com:8080

# Run the application
make run-dev
```

#### Environment Variables Reference

| Variable | Description |
|----------|-------------|
| `APP_ENV` | Environment detection: `DEV`, `STAGE`, `QA`, `PROD` |
| `PROXY_DEV_URL` | Proxy URL for DEV environment |
| `PROXY_STAGE_URL` | Proxy URL for STAGE environment |
| `PROXY_QA_URL` | Proxy URL for QA environment |
| `PROXY_PROD_URL` | Proxy URL for PROD environment |
| `HTTP_PROXY` | Agent proxy override |
| `HTTPS_PROXY` | Agent proxy override (higher priority) |

#### Proxy Resolution Priority

1. **Explicit config** in `app/main.py` (highest priority)
2. **Agent proxy** (`HTTPS_PROXY` > `HTTP_PROXY`)
3. **Environment-specific proxy** (`PROXY_{APP_ENV}_URL`)
4. **No proxy** - direct connection

#### TLS Verification

- **DEV**: TLS verification disabled by default (for self-signed certs)
- **STAGE/QA/PROD**: TLS verification enabled (unless ca_bundle is set)

## API Documentation

- Swagger UI: `http://localhost:8080/docs`
- ReDoc: `http://localhost:8080/redoc`

## Adding New Features

### 1. Create a Model

```python
# app/models/item.py
from sqlalchemy import Column, String, DateTime
from app.database import Base
from app.utils import get_current_timestamp

class Item(Base):
    __tablename__ = "app_google_gemini_openai_chat_completions_items"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=get_current_timestamp)
```

### 2. Create Schemas

```python
# app/schemas/item.py
from pydantic import BaseModel
from datetime import datetime

class ItemCreate(BaseModel):
    name: str

class ItemResponse(BaseModel):
    id: str
    name: str
    created_at: datetime

    class Config:
        from_attributes = True
```

### 3. Create Repository

```python
# app/repositories/item_repository.py
from app.repositories.base import BaseRepository
from app.models.item import Item

class ItemRepository(BaseRepository[Item]):
    def __init__(self, db):
        super().__init__(Item, db)
```

### 4. Create Routes

```python
# app/routes/items.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.repositories.item_repository import ItemRepository
from app.schemas.item import ItemCreate, ItemResponse
from app.utils import generate_id

router = APIRouter()

@router.post("", response_model=ItemResponse)
async def create_item(data: ItemCreate, db: AsyncSession = Depends(get_db)):
    repo = ItemRepository(db)
    item = Item(id=generate_id("item"), name=data.name)
    return await repo.create(item)
```

### 5. Register Router

```python
# app/main.py
from app.routes import items
app.include_router(items.router, prefix="/items", tags=["items"])
```

### 6. Create Migration

```bash
make migrate-create MSG="Add items table"
make migrate-upgrade
```

## Frontend

To create a frontend for this app:

```bash
npm run create:fastapi-frontend app-google-gemini-openai-chat-completions
```
