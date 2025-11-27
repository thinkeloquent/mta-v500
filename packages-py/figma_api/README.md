# Figma API - Unified Python SDK

A simplified, async-first Python SDK for the Figma API, optimized for FastAPI integration.

## Features

- **Unified Interface**: Single client for all Figma API endpoints
- **Async/Await**: Built for FastAPI and modern Python async frameworks
- **Rate Limiting**: Automatic rate limiting with token bucket algorithm
- **Retry Logic**: Exponential backoff for failed requests
- **Type Safety**: Full type hints and Pydantic models
- **Error Handling**: Comprehensive exception hierarchy
- **Production Ready**: Based on battle-tested patterns

## Installation

```bash
# Using pip
pip install -e /Users/Shared/autoload/mta-v500/packages/figma_api

# Using Poetry
poetry add /Users/Shared/autoload/mta-v500/packages/figma_api
```

## Quick Start

```python
import os
from figma_api import FigmaAPI

async with FigmaAPI(token=os.environ['FIGMA_TOKEN']) as api:
    # Get file content
    file = await api.files.get("your-file-key")
    print(f"File: {file.name}")

    # List comments
    comments = await api.comments.list("your-file-key")
    for comment in comments:
        print(f"{comment.user.handle}: {comment.message}")
```

## API Modules

The SDK provides 8 API modules:

### 1. Files API

```python
# Get complete file
file = await api.files.get("file_key")

# Get specific nodes
nodes = await api.files.get_nodes("file_key", ["1:2", "3:4"])

# Render images
images = await api.files.get_images(
    "file_key",
    ["1:2", "3:4"],
    scale=2.0,
    format="png"
)

# Get image fills
fills = await api.files.get_image_fills("file_key")

# Get version history
versions = await api.files.get_versions("file_key")
```

### 2. Comments API

```python
# List all comments
comments = await api.comments.list("file_key")

# Create comment at position
comment = await api.comments.create(
    "file_key",
    "This needs work",
    client_meta={"x": 100, "y": 200}
)

# Reply to comment
reply = await api.comments.create(
    "file_key",
    "Agreed",
    comment_id=comment.id
)

# Delete comment
await api.comments.delete("file_key", comment_id)

# Add reaction
await api.comments.add_reaction("file_key", comment_id, "👍")

# Get reactions
reactions = await api.comments.get_reactions("file_key", comment_id)
```

### 3. Components API

```python
# Get component metadata
component = await api.components.get("component_key")

# Get component set
comp_set = await api.components.get_set("component_set_key")

# Get team components
team_components = await api.components.get_team_components("team_id")
```

### 4. Projects API

```python
# List team projects
projects = await api.projects.list_team_projects("team_id")

# Get project files
files = await api.projects.get_files("project_id")
```

### 5. Variables API

```python
# Get local variables
local_vars = await api.variables.get_local("file_key")

# Get published variables
published_vars = await api.variables.get_published("file_key")
```

### 6. Webhooks API

```python
# Create webhook
webhook = await api.webhooks.create(
    event_type="FILE_UPDATE",
    team_id="team_id",
    endpoint="https://example.com/webhook",
    passcode="secret123",
    description="File update notifications"
)

# List webhooks
webhooks = await api.webhooks.list("team_id")

# Update webhook
await api.webhooks.update(webhook.id, status="PAUSED")

# Delete webhook
await api.webhooks.delete(webhook.id)
```

### 7. Dev Resources API

```python
# List dev resources
resources = await api.dev_resources.list("file_key")

# Create dev resource
resource = await api.dev_resources.create(
    "file_key",
    "1:2",
    "Implementation PR",
    "https://github.com/org/repo/pull/123"
)

# Update dev resource
await api.dev_resources.update("file_key", resource.id, name="Updated PR")

# Delete dev resource
await api.dev_resources.delete("file_key", resource.id)
```

### 8. Library Analytics API

```python
from datetime import datetime, timedelta

# Get component usage analytics
end = datetime.now()
start = end - timedelta(days=30)
usage = await api.library_analytics.get_component_usage(
    "file_key",
    start,
    end
)

for comp in usage:
    print(f"{comp.component_name}: {comp.instance_count} instances")
```

## FastAPI Integration

### Example 1: Simple File Endpoint

```python
from fastapi import FastAPI, Depends
from figma_api import FigmaAPI
import os

app = FastAPI()

# Dependency for Figma API client
async def get_figma_api():
    async with FigmaAPI(token=os.environ['FIGMA_TOKEN']) as api:
        yield api

@app.get("/files/{file_key}")
async def get_file(
    file_key: str,
    api: FigmaAPI = Depends(get_figma_api)
):
    """Get Figma file by key."""
    file = await api.files.get(file_key)
    return {
        "name": file.name,
        "version": file.version,
        "lastModified": file.last_modified,
        "thumbnailUrl": file.thumbnail_url,
    }
```

### Example 2: Comments Management

```python
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from figma_api import FigmaAPI, NotFoundError
import os

app = FastAPI()

class CreateCommentRequest(BaseModel):
    message: str
    comment_id: str | None = None
    x: float | None = None
    y: float | None = None

async def get_figma_api():
    async with FigmaAPI(token=os.environ['FIGMA_TOKEN']) as api:
        yield api

@app.get("/files/{file_key}/comments")
async def list_comments(
    file_key: str,
    api: FigmaAPI = Depends(get_figma_api)
):
    """List all comments on a file."""
    try:
        comments = await api.comments.list(file_key)
        return {"comments": [
            {
                "id": c.id,
                "user": c.user.handle,
                "message": c.message,
                "created_at": c.created_at,
            }
            for c in comments
        ]}
    except NotFoundError:
        raise HTTPException(status_code=404, detail="File not found")

@app.post("/files/{file_key}/comments")
async def create_comment(
    file_key: str,
    request: CreateCommentRequest,
    api: FigmaAPI = Depends(get_figma_api)
):
    """Create a new comment."""
    client_meta = None
    if request.x is not None and request.y is not None:
        client_meta = {"x": request.x, "y": request.y}

    comment = await api.comments.create(
        file_key,
        request.message,
        comment_id=request.comment_id,
        client_meta=client_meta,
    )
    return {
        "id": comment.id,
        "message": comment.message,
        "user": comment.user.handle,
    }
```

### Example 3: Project Browser

```python
from fastapi import FastAPI, Depends
from figma_api import FigmaAPI
import os

app = FastAPI()

async def get_figma_api():
    async with FigmaAPI(token=os.environ['FIGMA_TOKEN']) as api:
        yield api

@app.get("/teams/{team_id}/projects")
async def list_projects(
    team_id: str,
    api: FigmaAPI = Depends(get_figma_api)
):
    """List all projects in a team."""
    projects = await api.projects.list_team_projects(team_id)
    return {"projects": [
        {"id": p.id, "name": p.name}
        for p in projects
    ]}

@app.get("/projects/{project_id}/files")
async def list_project_files(
    project_id: str,
    api: FigmaAPI = Depends(get_figma_api)
):
    """List all files in a project."""
    files = await api.projects.get_files(project_id)
    return {"files": [
        {
            "key": f.key,
            "name": f.name,
            "thumbnailUrl": f.thumbnail_url,
            "lastModified": f.last_modified,
        }
        for f in files
    ]}
```

### Example 4: Webhook Management

```python
from fastapi import FastAPI, Depends
from pydantic import BaseModel
from figma_api import FigmaAPI
import os

app = FastAPI()

class CreateWebhookRequest(BaseModel):
    event_type: str
    team_id: str
    endpoint: str
    passcode: str
    description: str = ""

async def get_figma_api():
    async with FigmaAPI(token=os.environ['FIGMA_TOKEN']) as api:
        yield api

@app.post("/webhooks")
async def create_webhook(
    request: CreateWebhookRequest,
    api: FigmaAPI = Depends(get_figma_api)
):
    """Create a new webhook."""
    webhook = await api.webhooks.create(
        event_type=request.event_type,
        team_id=request.team_id,
        endpoint=request.endpoint,
        passcode=request.passcode,
        description=request.description,
    )
    return {
        "id": webhook.id,
        "event_type": webhook.event_type,
        "endpoint": webhook.endpoint,
        "status": webhook.status,
    }

@app.get("/teams/{team_id}/webhooks")
async def list_webhooks(
    team_id: str,
    api: FigmaAPI = Depends(get_figma_api)
):
    """List all webhooks for a team."""
    webhooks = await api.webhooks.list(team_id)
    return {"webhooks": [
        {
            "id": w.id,
            "event_type": w.event_type,
            "endpoint": w.endpoint,
            "status": w.status,
        }
        for w in webhooks
    ]}

@app.delete("/webhooks/{webhook_id}")
async def delete_webhook(
    webhook_id: str,
    api: FigmaAPI = Depends(get_figma_api)
):
    """Delete a webhook."""
    await api.webhooks.delete(webhook_id)
    return {"status": "deleted"}
```

## Error Handling

The SDK provides a comprehensive exception hierarchy:

```python
from figma_api import (
    FigmaAPIError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ValidationError,
)

try:
    file = await api.files.get("invalid-key")
except AuthenticationError:
    print("Invalid token")
except AuthorizationError:
    print("No permission to access this resource")
except NotFoundError:
    print("File not found")
except RateLimitError as e:
    print(f"Rate limited. Retry after {e.retry_after} seconds")
except ValidationError as e:
    print(f"Validation error: {e.errors}")
except FigmaAPIError as e:
    print(f"API error: {e}")
```

## Configuration

### Environment Variables

```bash
# Required
export FIGMA_TOKEN="your-figma-token"

# Optional (for applications using the global CLAUDE.md config)
export POSTGRES_USER="user"
export POSTGRES_PASSWORD="password"
export POSTGRES_DB="database"
export POSTGRES_HOST="localhost"
export POSTGRES_PORT="5432"
export POSTGRES_SCHEMA="public"
```

### Custom Configuration

```python
from figma_api import FigmaAPI

api = FigmaAPI(
    token="your-token",
    rate_limit=20.0,        # 20 requests per second
    rate_capacity=40.0,     # Burst capacity of 40 requests
    max_retries=5,          # Retry up to 5 times
    timeout=60.0,           # 60 second timeout
)
```

### Proxy Configuration

The SDK supports flexible proxy configuration through multiple methods:

#### 1. Simple Proxy (String Format)

```python
import os
from figma_api import FigmaAPI

# HTTP proxy
async with FigmaAPI(
    token=os.environ['FIGMA_TOKEN'],
    proxy="http://proxy.example.com:8080"
) as api:
    file = await api.files.get("file_key")
```

#### 2. Proxy with Authentication (Dict Format)

```python
# HTTPS proxy with username/password
async with FigmaAPI(
    token=os.environ['FIGMA_TOKEN'],
    proxy={
        "https://": "http://username:password@proxy.example.com:8080"
    }
) as api:
    file = await api.files.get("file_key")

# Separate HTTP and HTTPS proxies
async with FigmaAPI(
    token=os.environ['FIGMA_TOKEN'],
    proxy={
        "http://": "http://proxy.example.com:8080",
        "https://": "http://secure-proxy.example.com:8443"
    }
) as api:
    file = await api.files.get("file_key")
```

#### 3. Advanced Proxy with Custom Headers

```python
import httpx
from figma_api import FigmaAPI

# Using httpx.Proxy for advanced configuration
proxy_config = {
    "all://": httpx.Proxy(
        url="http://proxy.example.com:8080",
        headers={"Proxy-Authorization": "Basic dXNlcjpwYXNz"}
    )
}

async with FigmaAPI(
    token=os.environ['FIGMA_TOKEN'],
    proxy=proxy_config
) as api:
    file = await api.files.get("file_key")
```

#### 4. Corporate Proxy with Custom CA Bundle

```python
# For corporate environments with custom SSL certificates
async with FigmaAPI(
    token=os.environ['FIGMA_TOKEN'],
    proxy="http://corporate-proxy.company.com:8080",
    verify="/path/to/corporate-ca-bundle.crt"
) as api:
    file = await api.files.get("file_key")

# Or using environment variable
# export REQUESTS_CA_BUNDLE=/path/to/corporate-ca.crt
async with FigmaAPI(
    token=os.environ['FIGMA_TOKEN'],
    proxy="http://corporate-proxy.company.com:8080",
    verify=os.environ.get('REQUESTS_CA_BUNDLE', True)
) as api:
    file = await api.files.get("file_key")
```

#### 5. Environment Variables (Automatic)

The SDK automatically respects standard proxy environment variables:

```bash
# Set proxy environment variables
export HTTP_PROXY="http://proxy.example.com:8080"
export HTTPS_PROXY="http://proxy.example.com:8080"
export NO_PROXY="localhost,127.0.0.1"

# SDK will automatically use these proxies
async with FigmaAPI(token=os.environ['FIGMA_TOKEN']) as api:
    file = await api.files.get("file_key")
```

#### 6. Disable Environment Variables

```python
# Ignore HTTP_PROXY/HTTPS_PROXY environment variables
async with FigmaAPI(
    token=os.environ['FIGMA_TOKEN'],
    trust_env=False  # Don't use environment proxy settings
) as api:
    file = await api.files.get("file_key")
```

#### 7. SOCKS Proxy Support

```python
# SOCKS5 proxy (requires httpx[socks] extra: pip install httpx[socks])
async with FigmaAPI(
    token=os.environ['FIGMA_TOKEN'],
    proxy="socks5://proxy.example.com:1080"
) as api:
    file = await api.files.get("file_key")

# SOCKS5 with authentication
async with FigmaAPI(
    token=os.environ['FIGMA_TOKEN'],
    proxy="socks5://username:password@proxy.example.com:1080"
) as api:
    file = await api.files.get("file_key")
```

#### Proxy Configuration Summary

| Parameter   | Type                        | Default | Description                         |
| ----------- | --------------------------- | ------- | ----------------------------------- |
| `proxy`     | `str \| dict \| None`       | `None`  | Proxy URL(s) or configuration dict  |
| `trust_env` | `bool`                      | `True`  | Use HTTP_PROXY/HTTPS_PROXY env vars |
| `verify`    | `str \| bool \| SSLContext` | `True`  | SSL certificate verification        |

**Common Use Cases:**

- **Development**: Use `trust_env=True` (default) to pick up system proxy settings
- **Production**: Explicitly set `proxies` for predictable behavior
- **Corporate**: Use custom `verify` path for internal CA bundles
- **Testing**: Set `verify=False` to disable SSL verification (not recommended for production)

## Request Statistics

```python
async with FigmaAPI(token=token) as api:
    # Make some requests
    await api.files.get("file_key")
    await api.comments.list("file_key")

    # Get statistics
    stats = api.get_stats()
    print(f"Total requests: {stats['requests']}")
    print(f"Errors: {stats['errors']}")
    print(f"Retries: {stats['retries']}")
    print(f"Rate limited: {stats['rate_limited']}")
```

## Development

### Setup

```bash
cd /Users/Shared/autoload/mta-v500/packages/figma_api

# Install dependencies
pip install -r requirements.txt

# Or with Poetry
poetry install
```

### Testing

```bash
# Run tests
pytest

# With coverage
pytest --cov=figma_api --cov-report=html
```

### Type Checking

```bash
# Run mypy
mypy src/figma_api
```

### Linting

```bash
# Run ruff
ruff check src/

# Format with black
black src/
```

## Architecture

The SDK follows a layered architecture:

1. **HTTP Client Layer** (`client.py`): Low-level HTTP client with rate limiting and retries
2. **Models Layer** (`models.py`): Pydantic models for request/response validation
3. **SDK Layer** (各模块的 `sdk.py`): High-level, developer-friendly APIs
4. **Main Interface** (`__init__.py`): Unified `FigmaAPI` class

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Use type hints for all functions
2. Add docstrings with examples
3. Include tests for new features
4. Run linters before committing

## License

MIT

## Support

For issues and questions:

- Check existing issues in the project
- Review Figma API documentation: https://www.figma.com/developers/api
- Refer to the original module code in `figma-api-module/py/`
