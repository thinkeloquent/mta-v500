# Auto Register Routes

Automatic FastAPI route discovery and registration with comprehensive logging and defensive programming.

## Features

- 🔍 **Automatic Discovery**: Scans directories for `*.routes.py` files
- 📊 **Comprehensive Logging**: Color-coded, timestamped output with detailed progress tracking
- 🛡️ **Defensive Programming**: Extensive type and value validation to prevent runtime errors
- ⚡ **Performance Metrics**: Track load times for each route module
- 🔄 **Duplicate Detection**: Warns about duplicate route prefixes
- 📝 **Error Tracking**: Detailed error reporting with tracebacks
- ✅ **Backward Compatible**: Drop-in replacement for manual route registration

## Installation

```bash
pip install -e packages/auto_register_routes
```

## Quick Start

```python
from fastapi import FastAPI
from auto_register_routes import auto_register_routes

app = FastAPI()

# Auto-discover and register all routes from app.routes package
result = auto_register_routes(app, "app.routes")

print(f"Loaded {result.total_loaded} route modules")
print(f"Success rate: {result.success_rate:.1f}%")
```

## Usage

### Basic Usage

```python
from auto_register_routes import auto_register_routes

# Load routes with default settings (verbose logging enabled)
result = auto_register_routes(app, "app.routes")
```

### Custom Logger

```python
from auto_register_routes import auto_register_routes, get_logger

# Create custom logger with specific settings
logger = get_logger(verbose=True, use_colors=True)

# Use custom logger
result = auto_register_routes(app, "app.routes", logger=logger)
```

### Accessing Load Results

```python
from auto_register_routes import get_load_result

# Get the result from the last auto_register_routes call
result = get_load_result()

if result:
    print(f"Successfully loaded: {result.total_loaded}")
    print(f"Skipped: {len(result.skipped)}")
    print(f"Failed: {len(result.failed)}")

    # Access individual route info
    for route in result.success:
        print(f"  {route.filename}: {route.prefix} ({route.route_count} routes)")

    # Check for errors
    if result.has_errors:
        for failed in result.failed:
            print(f"  Failed: {failed.filename} - {failed.error}")
```

## Route File Conventions

Route files must follow these conventions:

1. **Naming Pattern**: Files must end with `.routes.py` (e.g., `users.routes.py`, `auth.routes.py`)
2. **No Hyphens**: Use underscores instead of hyphens (e.g., `user_auth.routes.py`, not `user-auth.routes.py`)
3. **Router Variable**: Each file must export a `router` variable containing a FastAPI `APIRouter` instance

### Example Route File

```python
# app/routes/users.routes.py
from fastapi import APIRouter

router = APIRouter(
    prefix="/users",
    tags=["users"]
)

@router.get("/")
async def list_users():
    return {"users": []}

@router.get("/{user_id}")
async def get_user(user_id: int):
    return {"user_id": user_id}
```

## API Reference

### `auto_register_routes()`

Main function for automatic route discovery and registration.

```python
def auto_register_routes(
    app: FastAPI,
    routes_package: str = "app.routes",
    logger: Optional[AutoRegisterLogger] = None,
    verbose: bool = True
) -> LoadResult
```

**Parameters:**
- `app` (FastAPI): FastAPI application instance
- `routes_package` (str): Python package path to scan (default: "app.routes")
- `logger` (AutoRegisterLogger, optional): Custom logger instance
- `verbose` (bool): Enable verbose DEBUG logging (default: True)

**Returns:**
- `LoadResult`: Detailed information about the loading process

**Raises:**
- `ValidationError`: If app or routes_package validation fails

### `get_load_result()`

Get the result from the last `auto_register_routes()` call.

```python
def get_load_result() -> Optional[LoadResult]
```

**Returns:**
- `LoadResult` from last call, or `None` if never called

### Data Models

#### `LoadResult`

Contains comprehensive information about the route loading process.

```python
@dataclass
class LoadResult:
    success: List[RouteInfo]          # Successfully loaded routes
    skipped: List[SkippedFile]        # Skipped files with reasons
    failed: List[FailedFile]          # Failed files with errors
    total_files: int                  # Total route files found
    total_loaded: int                 # Total successfully loaded
    total_time_ms: float              # Total processing time
    scan_directory: str               # Directory that was scanned

    @property
    def has_errors(self) -> bool:
        return len(self.failed) > 0

    @property
    def has_warnings(self) -> bool:
        return len(self.skipped) > 0

    @property
    def success_rate(self) -> float:
        return (self.total_loaded / self.total_files * 100) if self.total_files > 0 else 0.0
```

#### `RouteInfo`

Information about a successfully loaded route.

```python
@dataclass
class RouteInfo:
    filename: str           # Route filename
    module_path: str        # Python module path
    prefix: str             # Route prefix (e.g., "/users")
    tags: List[str]         # Route tags
    route_count: int        # Number of routes in router
    load_time_ms: float     # Time taken to load module
```

## Migration Guide

### Before (Manual Registration)

```python
from app.routes.users import router as users_router
from app.routes.auth import router as auth_router
from app.routes.products import router as products_router

app.include_router(users_router)
app.include_router(auth_router)
app.include_router(products_router)
```

### After (Auto Registration)

```python
from auto_register_routes import auto_register_routes

result = auto_register_routes(app, "app.routes")
```

## Error Handling

The package uses defensive programming with comprehensive validation:

### Common Validation Errors

1. **Invalid App Instance**
   ```
   ValidationError: app must be a FastAPI instance. Missing attributes: include_router
   ```

2. **Invalid Package Name**
   ```
   ValidationError: package_name cannot be empty
   ```

3. **Hyphenated Filenames**
   ```
   Skipped user-auth.routes.py: Hyphens not allowed. Use underscores: user_auth.routes.py
   ```

4. **Missing Router Variable**
   ```
   Skipped users.routes.py: No 'router' variable found in module
   ```

## Logging Output

### Example Output

```
[2025-01-07 10:30:45] INFO  Starting route auto-registration
[2025-01-07 10:30:45] INFO  Scanning directory: /path/to/app/routes
[2025-01-07 10:30:45] INFO  ✓ Found 3 matching route files
[2025-01-07 10:30:45] INFO  Loading: users.routes.py
[2025-01-07 10:30:45] INFO  ✓ Successfully loaded users.routes.py
[2025-01-07 10:30:45] INFO    Prefix: /users, Tags: ['users'], Routes: 5, Time: 12.3ms
[2025-01-07 10:30:45] WARN  ⚠ Skipped old-auth.routes.py: Hyphens not allowed
[2025-01-07 10:30:45] INFO  ✓ Successfully loaded products.routes.py
[2025-01-07 10:30:45] INFO    Prefix: /products, Tags: ['products'], Routes: 8, Time: 15.7ms

============================================================
[2025-01-07 10:30:45] INFO  Auto-registration Summary
============================================================
[2025-01-07 10:30:45] INFO  ✓ Successful: 2/3
[2025-01-07 10:30:45] WARN  ⚠ Skipped: 1
[2025-01-07 10:30:45] INFO  Total time: 28.0ms
[2025-01-07 10:30:45] INFO  Success rate: 66.7%
============================================================
```

## Development

### Running Tests

```bash
pytest packages/auto_register_routes/tests/
```

### Type Checking

```bash
mypy packages/auto_register_routes/
```

## Requirements

- Python >= 3.8
- FastAPI >= 0.100.0

## License

MIT

## Authors

Multi-App Orchestrator Team
