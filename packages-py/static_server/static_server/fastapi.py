"""FastAPI integration for serving multiple static file directories.

This module provides utilities to mount multiple frontend dist directories
as static file routes in a FastAPI application, with support for serving
HTML templates with rewritten asset paths.
"""

import os
import re
import mimetypes
from pathlib import Path
from typing import List, Dict, Optional
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse


# Register proper MIME types for JavaScript modules
# Python's mimetypes module doesn't know about .mjs by default
mimetypes.init()
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/javascript', '.mjs')
mimetypes.add_type('application/javascript', '.cjs')


class JavaScriptStaticFiles(StaticFiles):
    """Custom StaticFiles that ensures proper MIME types for JavaScript modules.

    This class extends FastAPI's StaticFiles to explicitly set Content-Type
    headers for JavaScript files (.js, .mjs, .cjs) to application/javascript.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def file_response(self, *args, **kwargs):
        """Override file_response to set correct Content-Type for JS files."""
        response = super().file_response(*args, **kwargs)

        # Get the file path from the response
        if hasattr(response, 'path'):
            file_path = str(response.path)

            # Check if it's a JavaScript file
            if file_path.endswith(('.js', '.mjs', '.cjs')):
                response.headers['Content-Type'] = 'application/javascript; charset=utf-8'

        return response


class StaticConfig:
    """Configuration for a single static file mount."""

    def __init__(
        self,
        dist_path: str,
        route_path: str,
        name: Optional[str] = None,
        html: bool = True,
        check_exists: bool = True,
        html_route: Optional[str] = None,
        isApp: bool = False
    ):
        """Initialize static file configuration.

        Args:
            dist_path: Path to the dist directory (relative or absolute)
            route_path: URL path where static files will be served (e.g., "/static/app/frontend")
            name: Optional name for the mount (used for FastAPI routing)
            html: Whether to serve index.html for directory requests
            check_exists: Whether to check if dist_path exists before mounting
            html_route: Optional route to serve the index.html with rewritten asset paths (e.g., "/apps/persona-editor")
            isApp: Whether this is an SPA that needs catch-all routing for client-side navigation (default: False)
        """
        self.dist_path = Path(dist_path).resolve()
        self.route_path = route_path
        self.name = name or self._generate_name(dist_path)
        self.html = html
        self.check_exists = check_exists
        self.html_route = html_route
        self.isApp = isApp
        self.html_content: Optional[str] = None  # Cached HTML content with rewritten paths

    def _generate_name(self, dist_path: str) -> str:
        """Generate a unique name from the dist path."""
        # Convert path to a valid name (replace / and - with _)
        return dist_path.replace("/", "_").replace("-", "_").replace(".", "_")

    def exists(self) -> bool:
        """Check if the dist directory exists."""
        return self.dist_path.exists() and self.dist_path.is_dir()

    def __repr__(self) -> str:
        return f"StaticConfig(name={self.name}, dist_path={self.dist_path}, route_path={self.route_path})"


def create_static_mounts(
    app: FastAPI,
    configs: List[Dict[str, any]],
    verbose: bool = False
) -> List[StaticConfig]:
    """Mount multiple static file directories to a FastAPI app.

    Args:
        app: FastAPI application instance
        configs: List of configuration dictionaries for each static mount
                Each config should have:
                - dist_path: Path to the dist directory
                - route_path: URL path for serving static files
                - name (optional): Name for the mount
                - html (optional): Whether to serve index.html (default: True)
                - check_exists (optional): Check if path exists (default: True)
        verbose: Print information about mounted static files

    Returns:
        List of StaticConfig objects that were successfully mounted

    Example:
        configs = [
            {
                "dist_path": "app/persona-editor/frontend/dist",
                "route_path": "/static/app/persona-editor/frontend",
                "name": "persona-editor"
            },
            {
                "dist_path": "app/hello/frontend/dist",
                "route_path": "/static/app/hello/frontend",
            }
        ]
        mounted = create_static_mounts(app, configs, verbose=True)
    """
    mounted_configs = []

    for config_dict in configs:
        # Create StaticConfig from dict
        static_config = StaticConfig(
            dist_path=config_dict["dist_path"],
            route_path=config_dict["route_path"],
            name=config_dict.get("name"),
            html=config_dict.get("html", True),
            check_exists=config_dict.get("check_exists", True),
            html_route=config_dict.get("html_route"),
            isApp=config_dict.get("isApp", False)
        )

        # Check if directory exists (if check is enabled)
        if static_config.check_exists and not static_config.exists():
            if verbose:
                print(f"⚠️  Skipping {static_config.name}: Directory not found at {static_config.dist_path}")
            continue

        try:
            # Mount the static files with custom JavaScript MIME type handler
            app.mount(
                static_config.route_path,
                JavaScriptStaticFiles(
                    directory=str(static_config.dist_path),
                    html=static_config.html
                ),
                name=static_config.name
            )

            mounted_configs.append(static_config)

            if verbose:
                print(f"✓ Mounted {static_config.name}")
                print(f"  Route: {static_config.route_path}")
                print(f"  Path:  {static_config.dist_path}")

        except Exception as e:
            if verbose:
                print(f"✗ Failed to mount {static_config.name}: {e}")

    return mounted_configs


def create_static_mount(
    app: FastAPI,
    dist_path: str,
    route_path: str,
    name: Optional[str] = None,
    html: bool = True,
    check_exists: bool = True,
    verbose: bool = False
) -> Optional[StaticConfig]:
    """Mount a single static file directory to a FastAPI app.

    Convenience function for mounting a single static directory.

    Args:
        app: FastAPI application instance
        dist_path: Path to the dist directory
        route_path: URL path for serving static files
        name: Optional name for the mount
        html: Whether to serve index.html for directory requests
        check_exists: Whether to check if dist_path exists before mounting
        verbose: Print information about the mount

    Returns:
        StaticConfig object if successfully mounted, None otherwise

    Example:
        config = create_static_mount(
            app,
            dist_path="app/persona-editor/frontend/dist",
            route_path="/static/app/persona-editor/frontend",
            verbose=True
        )
    """
    mounted = create_static_mounts(
        app,
        [{
            "dist_path": dist_path,
            "route_path": route_path,
            "name": name,
            "html": html,
            "check_exists": check_exists
        }],
        verbose=verbose
    )

    return mounted[0] if mounted else None


def rewrite_html_paths(html_content: str, route_path: str) -> str:
    """Rewrite asset paths in HTML to use the configured static route.

    This function finds all asset references (src, href attributes) in the HTML
    and rewrites relative paths to use the full static route path.

    Args:
        html_content: Original HTML content
        route_path: The static route path (e.g., "/static/app/persona-editor")

    Returns:
        HTML content with rewritten asset paths

    Example:
        Input:  <script src="/assets/index.js"></script>
        Output: <script src="/static/app/persona-editor/assets/index.js"></script>
    """
    # Patterns to match:
    # - src="/assets/..." or src='/assets/...'
    # - href="/assets/..." or href='/assets/...'
    # - src="./assets/..." or src='./assets/...'
    # - src="assets/..." or src='assets/...'

    # Remove trailing slash from route_path if present
    route_path = route_path.rstrip('/')

    # Pattern 1: Absolute paths starting with /assets/
    html_content = re.sub(
        r'((?:src|href)=")(/assets/[^"]*)',
        rf'\1{route_path}\2',
        html_content
    )
    html_content = re.sub(
        r"((?:src|href)=')(/assets/[^']*)",
        rf"\1{route_path}\2",
        html_content
    )

    # Pattern 2: Relative paths starting with ./assets/
    html_content = re.sub(
        r'((?:src|href)=")(\.\/assets/[^"]*)',
        rf'\1{route_path}/assets/\2'.replace('./assets/', ''),
        html_content
    )
    html_content = re.sub(
        r"((?:src|href)=')(\.\/assets/[^']*)",
        rf"\1{route_path}/assets/\2".replace('./assets/', ''),
        html_content
    )

    # Pattern 3: Relative paths without leading slash (assets/)
    html_content = re.sub(
        r'((?:src|href)=")(assets/[^"]*)',
        rf'\1{route_path}/\2',
        html_content
    )
    html_content = re.sub(
        r"((?:src|href)=')(assets/[^']*)",
        rf"\1{route_path}/\2",
        html_content
    )

    return html_content


def load_and_rewrite_html(config: StaticConfig) -> Optional[str]:
    """Load index.html from dist directory and rewrite asset paths.

    Args:
        config: StaticConfig with dist_path and route_path

    Returns:
        Rewritten HTML content, or None if index.html not found
    """
    index_html_path = config.dist_path / "index.html"

    if not index_html_path.exists():
        return None

    try:
        with open(index_html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()

        # Rewrite asset paths
        rewritten_html = rewrite_html_paths(html_content, config.route_path)

        return rewritten_html
    except Exception as e:
        print(f"Error reading {index_html_path}: {e}")
        return None


def create_html_routes(
    app: FastAPI,
    configs: List[Dict[str, any]],
    verbose: bool = False
) -> List[StaticConfig]:
    """Create HTML routes for serving index.html with rewritten asset paths.

    This function reads the index.html from each dist directory, rewrites
    the asset paths to use the configured static route, and creates a
    FastAPI route to serve the modified HTML.

    Args:
        app: FastAPI application instance
        configs: List of configuration dictionaries (same as create_static_mounts)
                Each config with an 'html_route' field will get an HTML route
        verbose: Print information about created routes

    Returns:
        List of StaticConfig objects with HTML routes created

    Example:
        configs = [
            {
                "dist_path": "app/persona-editor/frontend/dist",
                "route_path": "/static/app/persona-editor",
                "html_route": "/apps/persona-editor"
            }
        ]
        created = create_html_routes(app, configs, verbose=True)
    """
    html_configs = []

    for config_dict in configs:
        # Skip if no html_route defined
        if not config_dict.get("html_route"):
            continue

        # Create StaticConfig from dict
        static_config = StaticConfig(
            dist_path=config_dict["dist_path"],
            route_path=config_dict["route_path"],
            name=config_dict.get("name"),
            html=config_dict.get("html", True),
            check_exists=config_dict.get("check_exists", True),
            html_route=config_dict.get("html_route"),
            isApp=config_dict.get("isApp", False)
        )

        # Check if directory exists (if check is enabled)
        if static_config.check_exists and not static_config.exists():
            if verbose:
                print(f"⚠️  Skipping HTML route for {static_config.name}: Directory not found at {static_config.dist_path}")
            continue

        # Load and rewrite HTML
        rewritten_html = load_and_rewrite_html(static_config)

        if not rewritten_html:
            if verbose:
                print(f"⚠️  Skipping HTML route for {static_config.name}: index.html not found")
            continue

        # Cache the rewritten HTML (for validation, but not serving)
        static_config.html_content = rewritten_html

        try:
            # Create the route dynamically
            html_route = static_config.html_route
            is_app = static_config.isApp
            config = static_config  # Capture the config object

            # Define the route handler for exact match
            # Read HTML on each request to avoid serving stale cached content
            async def serve_html(cfg=config):
                html_content = load_and_rewrite_html(cfg)
                if not html_content:
                    html_content = cfg.html_content  # Fallback to cached version
                return HTMLResponse(content=html_content)

            # Add the exact-match route to the app
            app.get(html_route, response_class=HTMLResponse)(serve_html)

            # If this is an SPA (isApp=True), add a catch-all route for client-side routing
            if is_app:
                catch_all_route = f"{html_route}/{{path:path}}"

                # Define the catch-all route handler
                # Read HTML on each request to avoid serving stale cached content
                async def serve_html_catchall(path: str, cfg=config):
                    html_content = load_and_rewrite_html(cfg)
                    if not html_content:
                        html_content = cfg.html_content  # Fallback to cached version
                    return HTMLResponse(content=html_content)

                # Add the catch-all route
                app.get(catch_all_route, response_class=HTMLResponse)(serve_html_catchall)

            html_configs.append(static_config)

            if verbose:
                print(f"✓ Created HTML route for {static_config.name}")
                print(f"  HTML Route: {html_route}")
                if is_app:
                    print(f"  Catch-all Route: {catch_all_route} (SPA mode)")
                print(f"  Assets: {static_config.route_path}/assets/*")

        except Exception as e:
            if verbose:
                print(f"✗ Failed to create HTML route for {static_config.name}: {e}")

    return html_configs
