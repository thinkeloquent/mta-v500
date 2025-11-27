# Jira API - Unified Python SDK

A simplified, async-first Python SDK for the Jira API, optimized for modern Python applications.

## Features

- **Unified Interface**: Single client for all Jira API endpoints
- **Async/Await**: Built for modern Python async frameworks
- **Rate Limiting**: Automatic rate limiting with token bucket algorithm
- **Retry Logic**: Exponential backoff for failed requests
- **Type Safety**: Full type hints and Pydantic models
- **Proxy Support**: Built-in proxy configuration for corporate environments
- **Error Handling**: Comprehensive exception hierarchy
- **Production Ready**: Based on battle-tested patterns from Figma API

## Installation

```bash
# Using pip
pip install -e /Users/Shared/autoload/mta-v500/packages/jira_api

# Using Poetry
poetry add /Users/Shared/autoload/mta-v500/packages/jira_api
```

## Quick Start

```python
import os
from jira_api import JiraAPI
from jira_api.issues import IssueCreate

async with JiraAPI(
    base_url="https://company.atlassian.net",
    email="user@company.com",
    api_token=os.environ['JIRA_API_TOKEN']
) as jira:
    # Get issue
    issue = await jira.issues.get("PROJ-123")
    print(f"Issue: {issue.fields.summary}")

    # Create issue
    new_issue_data = IssueCreate(
        project_key="PROJ",
        summary="Bug in authentication system",
        issue_type="Bug",
        description="Users cannot log in",
        labels=["bug", "urgent"]
    )
    new_issue = await jira.issues.create(new_issue_data)
    print(f"Created: {new_issue.key}")

    # Search users
    users = await jira.users.search("developer")
    for user in users:
        print(f"{user.display_name} ({user.email})")
```

## API Modules

### 1. Issues API

```python
# Get issue
issue = await jira.issues.get("PROJ-123")

# Create issue
from jira_api.issues import IssueCreate
issue_data = IssueCreate(
    project_key="PROJ",
    summary="System crash on startup",
    issue_type="Bug",
    description="Application fails to start",
    priority="High",
    labels=["crash", "critical"]
)
issue = await jira.issues.create(issue_data)

# Update issue
from jira_api.issues import IssueUpdate
update_data = IssueUpdate(
    summary="Updated summary",
    description="Updated description",
    priority="Medium"
)
await jira.issues.update("PROJ-123", update_data)

# Get transitions
transitions = await jira.issues.get_transitions("PROJ-123")
for t in transitions:
    print(f"{t.name} -> {t.to.name}")

# Transition issue
await jira.issues.transition(
    "PROJ-123",
    "In Progress",
    comment="Starting work on this"
)

# Assign issue
await jira.issues.assign("PROJ-123", "account-id-here")

# Add comment
comment = await jira.issues.add_comment("PROJ-123", "This is a comment")

# Add/remove labels
await jira.issues.add_labels("PROJ-123", ["security", "performance"])
await jira.issues.remove_labels("PROJ-123", ["wontfix"])

# Delete issue
await jira.issues.delete("PROJ-123")
```

### 2. Projects API

```python
# Get project
project = await jira.projects.get("PROJ")
print(f"Project: {project.name}")

# List all projects
projects = await jira.projects.list()
for project in projects:
    print(f"{project.key}: {project.name}")

# Get versions
versions = await jira.projects.get_versions("PROJ")
for version in versions:
    print(f"{version.name} - Released: {version.released}")

# Create version
from jira_api.projects import ProjectVersionCreate
version_data = ProjectVersionCreate(
    name="v1.0.0",
    project_id="10000",
    description="First release",
    release_date="2024-12-31"
)
version = await jira.projects.create_version(version_data)

# Get components
components = await jira.projects.get_components("PROJ")

# Get issue types
issue_types = await jira.projects.get_issue_types("PROJ")
for it in issue_types:
    print(f"ID: {it.id}, Name: {it.name}")
```

### 3. Users API

```python
# Get user by account ID
user = await jira.users.get("account-id-here")
print(f"{user.display_name} ({user.email})")

# Search users
users = await jira.users.search("john")
for user in users:
    print(f"{user.display_name}")

# Get assignable users for project
assignable = await jira.users.get_assignable("PROJ")
for user in assignable:
    print(f"{user.display_name} ({user.account_id})")

# Find user by email
user = await jira.users.find_by_email("user@company.com")
if user:
    print(f"Found: {user.display_name}")
```

## Configuration

### Environment Variables

```bash
# Required
export JIRA_API_TOKEN="your-api-token"

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
from jira_api import JiraAPI

jira = JiraAPI(
    base_url="https://company.atlassian.net",
    email="user@company.com",
    api_token="your-token",
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
# HTTP proxy
async with JiraAPI(
    base_url="https://company.atlassian.net",
    email="user@company.com",
    api_token=os.environ['JIRA_API_TOKEN'],
    proxy="http://proxy.example.com:8080"
) as jira:
    issue = await jira.issues.get("PROJ-123")
```

#### 2. Proxy with Authentication (Dict Format)

```python
# HTTPS proxy with username/password
async with JiraAPI(
    base_url="https://company.atlassian.net",
    email="user@company.com",
    api_token=os.environ['JIRA_API_TOKEN'],
    proxy={
        "https://": "http://username:password@proxy.example.com:8080"
    }
) as jira:
    issue = await jira.issues.get("PROJ-123")
```

#### 3. Advanced Proxy with Custom Headers

```python
import httpx

proxy_config = {
    "all://": httpx.Proxy(
        url="http://proxy.example.com:8080",
        headers={"Proxy-Authorization": "Basic dXNlcjpwYXNz"}
    )
}

async with JiraAPI(
    base_url="https://company.atlassian.net",
    email="user@company.com",
    api_token=os.environ['JIRA_API_TOKEN'],
    proxy=proxy_config
) as jira:
    issue = await jira.issues.get("PROJ-123")
```

#### 4. Corporate Proxy with Custom CA Bundle

```python
# For corporate environments with custom SSL certificates
async with JiraAPI(
    base_url="https://company.atlassian.net",
    email="user@company.com",
    api_token=os.environ['JIRA_API_TOKEN'],
    proxy="http://corporate-proxy.company.com:8080",
    verify="/path/to/corporate-ca-bundle.crt"
) as jira:
    issue = await jira.issues.get("PROJ-123")
```

#### 5. Environment Variables (Automatic)

```bash
# Set proxy environment variables
export HTTP_PROXY="http://proxy.example.com:8080"
export HTTPS_PROXY="http://proxy.example.com:8080"
export NO_PROXY="localhost,127.0.0.1"

# SDK will automatically use these proxies
```

```python
async with JiraAPI(
    base_url="https://company.atlassian.net",
    email="user@company.com",
    api_token=os.environ['JIRA_API_TOKEN']
) as jira:
    issue = await jira.issues.get("PROJ-123")
```

#### 6. Disable Environment Variables

```python
# Ignore HTTP_PROXY/HTTPS_PROXY environment variables
async with JiraAPI(
    base_url="https://company.atlassian.net",
    email="user@company.com",
    api_token=os.environ['JIRA_API_TOKEN'],
    trust_env=False
) as jira:
    issue = await jira.issues.get("PROJ-123")
```

## Error Handling

The SDK provides a comprehensive exception hierarchy:

```python
from jira_api import (
    JiraAPIError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ValidationError,
)

try:
    issue = await jira.issues.get("INVALID-KEY")
except AuthenticationError:
    print("Invalid credentials")
except AuthorizationError:
    print("No permission to access this resource")
except NotFoundError:
    print("Issue not found")
except RateLimitError as e:
    print(f"Rate limited. Retry after {e.retry_after} seconds")
except ValidationError as e:
    print(f"Validation error: {e.errors}")
except JiraAPIError as e:
    print(f"API error: {e}")
```

## Request Statistics

```python
async with JiraAPI(
    base_url="https://company.atlassian.net",
    email="user@company.com",
    api_token=token
) as jira:
    # Make some requests
    await jira.issues.get("PROJ-123")
    await jira.projects.list()

    # Get statistics
    stats = jira.get_stats()
    print(f"Total requests: {stats['requests']}")
    print(f"Errors: {stats['errors']}")
    print(f"Retries: {stats['retries']}")
    print(f"Rate limited: {stats['rate_limited']}")
```

## Architecture

The SDK follows a layered architecture:

1. **HTTP Client Layer** (`client.py`): Low-level HTTP client with rate limiting and retries
2. **Models Layer** (`models.py`, `*/models.py`): Pydantic models for request/response validation
3. **SDK Layer** (`*/sdk.py`): High-level, developer-friendly APIs
4. **Main Interface** (`__init__.py`): Unified `JiraAPI` class

## Dependencies

### Core Dependencies

- **httpx**: Modern HTTP client with async support
- **pydantic**: Data validation and serialization
- **tenacity**: Retry logic with exponential backoff

## License

MIT

## Related Projects

- **[Figma API](../figma_api/)**: Similar async-first SDK for Figma API
- **[Original Jira API Module](../../jira_api-module/)**: Full-featured package with CLI and server

---

**Ready to get started?** Check out the [EXAMPLES.md](EXAMPLES.md) for more detailed examples!
