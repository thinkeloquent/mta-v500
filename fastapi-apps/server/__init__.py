"""
Server Package - Public API re-exports from launch.py

Mirrors fastify-apps/server/index.mjs pattern.

This module provides a clean public interface for external modules
to access the server initialization functions.

Usage:
    from fastapi_apps.server import bootstrap, initialize_app, start_server

    # One-call bootstrap
    bootstrap()

    # Or step-by-step
    app = initialize_app()
    start_server(app)
"""

import sys
from pathlib import Path

# Add parent to path for imports (fastapi-apps/)
_parent_dir = str(Path(__file__).parent.parent)
if _parent_dir not in sys.path:
    sys.path.insert(0, _parent_dir)

# Add app directory for module imports (env_feature_flag, models, auth, etc.)
_app_dir = str(Path(__file__).parent.parent / "app")
if _app_dir not in sys.path:
    sys.path.insert(0, _app_dir)

from app.launch import (
    # Server lifecycle
    bootstrap,
    create_main_app,
    initialize_app,
    start_server,
    # Configuration
    load_secrets_blocking,
    log_feature_flags,
    get_default_apps,
    get_imported_apps,
    get_openapi_tags,
    get_static_configs,
    # App registration
    register_internal_apps,
    register_health_routes,
    register_documentation_routes,
    register_static_files,
    # Middleware
    register_under_construction_auth,
    register_cors_middleware,
    register_no_cache_middleware,
    # Utilities
    combine_lifespans,
    log_routes,
    import_sub_app,
)

__all__ = [
    # Server lifecycle
    "bootstrap",
    "create_main_app",
    "initialize_app",
    "start_server",
    # Configuration
    "load_secrets_blocking",
    "log_feature_flags",
    "get_default_apps",
    "get_imported_apps",
    "get_openapi_tags",
    "get_static_configs",
    # App registration
    "register_internal_apps",
    "register_health_routes",
    "register_documentation_routes",
    "register_static_files",
    # Middleware
    "register_under_construction_auth",
    "register_cors_middleware",
    "register_no_cache_middleware",
    # Utilities
    "combine_lifespans",
    "log_routes",
    "import_sub_app",
]
