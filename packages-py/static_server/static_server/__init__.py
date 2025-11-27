"""Static file server package for FastAPI applications.

This package provides utilities to serve multiple frontend dist directories
as static files with configurable route mappings, and to serve HTML templates
with rewritten asset paths.

Example usage:
    from static_server import create_static_mounts, create_html_routes

    # Configure static file routes with HTML routes
    static_configs = [
        {
            "dist_path": "app/persona-editor/frontend/dist",
            "route_path": "/static/app/persona-editor",
            "name": "persona-editor-frontend",
            "html_route": "/apps/persona-editor"  # Optional: serve HTML with rewritten paths
        },
        {
            "dist_path": "app/hello/frontend/dist",
            "route_path": "/static/app/hello",
            "name": "hello-frontend"
        }
    ]

    # Mount static files to FastAPI app
    create_static_mounts(app, static_configs, verbose=True)

    # Create HTML routes (reads dist/index.html and rewrites asset paths at runtime)
    create_html_routes(app, static_configs, verbose=True)
"""

__version__ = "0.1.0"

from .fastapi import create_static_mounts, create_html_routes, JavaScriptStaticFiles

__all__ = ["create_static_mounts", "create_html_routes", "JavaScriptStaticFiles"]
