# Auto-Loading Routes

This directory contains route modules that are automatically discovered and registered on application startup.

## File Naming Convention

Route files must follow the pattern: `*.routes.py`

**IMPORTANT:** File names must use **underscores (`_`)**, not hyphens (`-`), because hyphens are not valid in Python module names.

✅ **Correct:**
- `figma.routes.py`
- `user_profile.routes.py`
- `auth_token.routes.py`
- `debug_vault.routes.py`

❌ **Incorrect:**
- `user-profile.routes.py` (hyphen causes import error)
- `auth-token.routes.py` (hyphen causes import error)
- `debug-vault.routes.py` (hyphen causes import error)

## Route Module Structure

Each route module must export an `APIRouter` instance named `router`:

```python
from fastapi import APIRouter

router = APIRouter(prefix="/your-prefix", tags=["your-tag"])

@router.get("/endpoint")
async def your_endpoint():
    return {"message": "your response"}
```

## Example

See `figma.routes.py` for a complete example:

```python
from fastapi import APIRouter

router = APIRouter(prefix="/figma", tags=["figma"])

@router.get("/ping")
async def ping():
    return {"message": "pong from figma"}
```

## How It Works

1. On application startup, `auto_register_routes()` scans this directory
2. It finds all files matching `*.routes.py`
3. For each file, it imports the module and looks for a `router` variable
4. If found, the router is registered with the main FastAPI app using `app.include_router()`

## Adding New Routes

1. Create a new file with the pattern `yourname.routes.py`
2. Define your `router` using `APIRouter`
3. Add your endpoint handlers
4. Restart the application - routes will be auto-loaded!

## Console Output

During startup, you'll see:
```
✅ Auto-registered routes from: app.routes.figma.routes
✅ Auto-registered routes from: app.routes.example.routes
```

Or warnings if issues occur:
```
⚠️  Skipped app.routes.invalid.routes (no 'router' found)
❌ Error loading app.routes.broken.routes: <error message>
```
