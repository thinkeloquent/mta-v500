"""Basic usage example for static_server package.

This example demonstrates how to configure and mount multiple
frontend dist directories in a FastAPI application, including
HTML route serving with automatic path rewriting.
"""

from fastapi import FastAPI
from static_server import create_static_mounts, create_html_routes

# Create FastAPI app
app = FastAPI(title="Static Server Example")


# Example 1: Basic configuration with HTML route
# -----------------------------------------------
# Mount a single frontend dist directory and serve HTML with rewritten paths
basic_config = [
    {
        "dist_path": "app/persona-editor/frontend/dist",
        "route_path": "/static/app/persona-editor",
        "name": "persona-editor-frontend",
        "html_route": "/apps/persona-editor"  # Serve HTML at this route
    }
]

create_static_mounts(app, basic_config, verbose=True)
create_html_routes(app, basic_config, verbose=True)

# Now accessible at:
# - HTML: http://localhost:8000/apps/persona-editor
# - Assets: http://localhost:8000/static/app/persona-editor/assets/*


# Example 2: Multiple directories with HTML routes
# -------------------------------------------------
# Mount multiple frontend dist directories, each with their own HTML route
multi_config = [
    {
        "dist_path": "app/persona-editor/frontend/dist",
        "route_path": "/static/app/persona-editor",
        "name": "persona-editor-frontend",
        "html_route": "/apps/persona-editor"
    },
    {
        "dist_path": "app/hello/frontend/dist",
        "route_path": "/static/app/hello",
        "name": "hello-frontend",
        "html_route": "/apps/hello"
    },
    {
        "dist_path": "app/dashboard/frontend/dist",
        "route_path": "/static/app/dashboard",
        "name": "dashboard-frontend",
        "html_route": "/apps/dashboard"
    }
]

# create_static_mounts(app, multi_config, verbose=True)
# create_html_routes(app, multi_config, verbose=True)


# Example 3: Custom route pattern (as per user requirement)
# ---------------------------------------------------------
# Route pattern: /static/app/app/persona-editor/frontend/*
# This creates a nested "app/app" pattern in the URL
custom_pattern_config = [
    {
        "dist_path": "app/persona-editor/frontend/dist",
        "route_path": "/static/app/app/persona-editor/frontend",  # Note: /app/app/
        "name": "persona-editor-custom"
    }
]

# create_static_mounts(app, custom_pattern_config, verbose=True)


# Example 4: Dynamic configuration
# --------------------------------
# Build configuration dynamically based on available directories
import os

apps = ["persona-editor", "hello", "dashboard"]
dynamic_configs = []

for app_name in apps:
    dist_path = f"app/{app_name}/frontend/dist"
    if os.path.exists(dist_path):
        dynamic_configs.append({
            "dist_path": dist_path,
            "route_path": f"/static/app/{app_name}/frontend",
            "name": f"{app_name}-frontend"
        })

# create_static_mounts(app, dynamic_configs, verbose=True)


# Example 5: With custom options
# ------------------------------
# Configure with custom HTML serving and existence checking options
custom_options_config = [
    {
        "dist_path": "app/persona-editor/frontend/dist",
        "route_path": "/static/app/persona-editor/frontend",
        "name": "persona-editor-frontend",
        "html": True,           # Serve index.html for directory requests
        "check_exists": True    # Check if directory exists before mounting
    }
]

# create_static_mounts(app, custom_options_config, verbose=True)


# Run the application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
