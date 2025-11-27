# Static Server Package

FastAPI utilities for serving multiple static file directories with proper MIME types for JavaScript modules.

## Features

- **Multiple Static Directories**: Mount multiple dist directories with different route paths
- **JavaScript Module Support**: Automatic `application/javascript` MIME type for `.js`, `.mjs`, `.cjs` files
- **HTML Path Rewriting**: Serve index.html with automatically rewritten asset paths
- **Easy Configuration**: Simple dict-based configuration
- **Production Ready**: Proper caching headers, ETags, and content types

## JavaScript Module MIME Types

All JavaScript files are served with the correct MIME type:

- `.js` → `application/javascript; charset=utf-8`
- `.mjs` → `application/javascript; charset=utf-8`
- `.cjs` → `application/javascript; charset=utf-8`

## Quick Start

```python
from fastapi import FastAPI
from static_server import create_static_mounts

app = FastAPI()

static_configs = [
    {
        "dist_path": "static/test-scenarios/javascript-esm",
        "route_path": "/test-scenarios/javascript-esm",
        "name": "esm-test-scenarios",
        "html": True
    }
]

create_static_mounts(app, static_configs, verbose=True)
```

## Verification

```bash
curl -I http://localhost:8000/test-scenarios/javascript-esm/math-utils.mjs
# Returns: Content-Type: application/javascript; charset=utf-8
```

See the full documentation in the package source files.
