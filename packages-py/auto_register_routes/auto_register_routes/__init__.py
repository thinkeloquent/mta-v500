"""
Auto Register Routes - Automatic FastAPI route discovery and registration.

This package provides a simple way to automatically discover and register
FastAPI route modules by scanning a directory for files matching the
*.routes.py pattern.

Example:
    >>> from fastapi import FastAPI
    >>> from auto_register_routes import auto_register_routes
    >>>
    >>> app = FastAPI()
    >>> result = auto_register_routes(app, "app.routes")
    >>> print(f"Loaded {result.total_loaded} route modules")

Features:
    - Automatic route discovery from *.routes.py files
    - Comprehensive logging with color-coded output
    - Defensive programming with type/value validation
    - Detailed error reporting and tracking
    - Duplicate prefix detection
    - Load timing and performance metrics
"""

from .loader import auto_register_routes, get_load_result
from .models import LoadResult, RouteInfo, SkippedFile, FailedFile
from .logger import AutoRegisterLogger, get_logger
from .validators import ValidationError

__version__ = "1.0.0"

__all__ = [
    # Main functions
    "auto_register_routes",
    "get_load_result",

    # Models
    "LoadResult",
    "RouteInfo",
    "SkippedFile",
    "FailedFile",

    # Logger
    "AutoRegisterLogger",
    "get_logger",

    # Exceptions
    "ValidationError",

    # Metadata
    "__version__",
]
