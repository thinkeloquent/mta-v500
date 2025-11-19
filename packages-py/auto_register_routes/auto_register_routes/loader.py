"""
Core auto-registration logic for FastAPI routes.

This module provides the main functionality for discovering and loading
route modules from a package directory.
"""

import os
import sys
import importlib
import importlib.util
import time
import traceback as tb
from pathlib import Path
from typing import Optional

try:
    from fastapi import FastAPI
except ImportError:
    FastAPI = None  # type: ignore

from .models import LoadResult, RouteInfo, SkippedFile, FailedFile
from .logger import get_logger, AutoRegisterLogger
from .validators import (
    validate_fastapi_app,
    validate_package_name,
    validate_directory,
    validate_filename,
    check_file_readable,
    validate_router,
    detect_duplicate_prefixes,
    validate_verbose_flag,
    ValidationError
)


# Global to store last load result for backward compatibility
_last_load_result: Optional[LoadResult] = None


def auto_register_routes(
    app: "FastAPI",
    routes_package: str = "app.routes",
    logger: Optional[AutoRegisterLogger] = None,
    verbose: bool = True
) -> LoadResult:
    """
    Automatically discover and register route modules from a package.

    Scans the specified package directory for files matching the pattern
    *.routes.py and registers any FastAPI routers found in them.

    Args:
        app: FastAPI application instance
        routes_package: Python package path to scan (default: "app.routes")
        logger: Optional logger instance (creates new one if None)
        verbose: Enable verbose logging (default: True)

    Returns:
        LoadResult with detailed information about the loading process

    Raises:
        ValidationError: If app or routes_package validation fails

    Example:
        >>> from fastapi import FastAPI
        >>> from auto_register_routes import auto_register_routes
        >>>
        >>> app = FastAPI()
        >>> result = auto_register_routes(app, "app.routes")
        >>> print(f"Loaded {result.total_loaded} routes")
    """
    global _last_load_result

    # Normalize verbose flag
    verbose = validate_verbose_flag(verbose)

    # Get or create logger
    if logger is None:
        logger = get_logger(verbose=verbose, use_colors=True)

    # Track total time
    start_time = time.time()

    # Initialize result
    result = LoadResult()

    try:
        # Validate inputs
        validate_fastapi_app(app)
        validate_package_name(routes_package)

        # Import the routes package
        try:
            package = importlib.import_module(routes_package)
        except ImportError as e:
            logger.error(f"Failed to import package '{routes_package}': {e}")
            result.total_time_ms = (time.time() - start_time) * 1000
            _last_load_result = result
            return result

        # Get package directory
        package_file = getattr(package, '__file__', None)
        if package_file is None:
            logger.error(f"Package '{routes_package}' has no __file__ attribute")
            result.total_time_ms = (time.time() - start_time) * 1000
            _last_load_result = result
            return result

        package_path_str = os.path.dirname(package_file)

        # Validate directory
        try:
            package_path = validate_directory(package_path_str)
        except ValidationError as e:
            logger.error(str(e))
            result.total_time_ms = (time.time() - start_time) * 1000
            _last_load_result = result
            return result

        result.scan_directory = package_path_str

        # Log scan start
        logger.log_scan_start(package_path_str)

        # Scan for route files
        all_files = sorted(os.listdir(package_path_str))
        route_files = [
            f for f in all_files
            if f.endswith('.routes.py') and not f.startswith('_')
        ]

        result.total_files = len(route_files)

        # Log files found
        logger.log_files_found(route_files)

        # Load each route file
        for filename in route_files:
            _load_route_file(
                app=app,
                filename=filename,
                package_path=package_path,
                routes_package=routes_package,
                result=result,
                logger=logger
            )

        # Detect duplicate prefixes
        duplicates = detect_duplicate_prefixes(result.success)
        if duplicates:
            logger.log_duplicate_prefixes(duplicates)

        # Update total loaded count
        result.total_loaded = len(result.success)

        # Calculate total time
        result.total_time_ms = (time.time() - start_time) * 1000

        # Log summary
        logger.log_summary(result)

    except Exception as e:
        logger.error(f"Unexpected error during auto-registration: {e}")
        if verbose:
            logger.error(tb.format_exc())
        result.total_time_ms = (time.time() - start_time) * 1000

    # Store result globally for backward compatibility
    _last_load_result = result

    return result


def _load_route_file(
    app: "FastAPI",
    filename: str,
    package_path: Path,
    routes_package: str,
    result: LoadResult,
    logger: AutoRegisterLogger
) -> None:
    """
    Load a single route file.

    Args:
        app: FastAPI application
        filename: Route filename
        package_path: Path to package directory
        routes_package: Package name
        result: LoadResult to update
        logger: Logger instance
    """
    # Validate filename
    is_valid, reason = validate_filename(filename)
    if not is_valid:
        skipped = SkippedFile(filename=filename, reason=reason)
        result.skipped.append(skipped)
        logger.log_skipped(skipped)
        return

    # Build file path
    file_path = package_path / filename

    # Check file is readable
    if not check_file_readable(file_path):
        skipped = SkippedFile(
            filename=filename,
            reason="File is not readable or does not exist"
        )
        result.skipped.append(skipped)
        logger.log_skipped(skipped)
        return

    # Extract module name (remove .py extension)
    module_name = filename[:-3]

    # Build full module path
    full_module_path = f"{routes_package}.{module_name}"

    # Log loading start
    logger.log_loading_file(filename, full_module_path, str(file_path))

    # Track load time
    load_start = time.time()

    try:
        # Load module using importlib.util
        spec = importlib.util.spec_from_file_location(
            full_module_path,
            file_path
        )

        if spec is None or spec.loader is None:
            raise ImportError(f"Could not create module spec for {filename}")

        # Create and execute module
        mod = importlib.util.module_from_spec(spec)
        sys.modules[full_module_path] = mod
        spec.loader.exec_module(mod)

        # Look for router variable
        router = getattr(mod, 'router', None)

        if router is None:
            skipped = SkippedFile(
                filename=filename,
                reason="No 'router' variable found in module"
            )
            result.skipped.append(skipped)
            logger.log_skipped(skipped)
            return

        # Validate and extract router metadata
        try:
            router_meta = validate_router(router)
        except ValidationError as e:
            failed = FailedFile(
                filename=filename,
                error=e,
                error_type="ValidationError",
                traceback=tb.format_exc()
            )
            result.failed.append(failed)
            logger.log_failed(failed)
            return

        # Register router with FastAPI
        try:
            app.include_router(router)
        except Exception as e:
            failed = FailedFile(
                filename=filename,
                error=e,
                error_type=type(e).__name__,
                traceback=tb.format_exc()
            )
            result.failed.append(failed)
            logger.log_failed(failed)
            return

        # Calculate load time
        load_time_ms = (time.time() - load_start) * 1000

        # Create route info
        route_info = RouteInfo(
            filename=filename,
            module_path=full_module_path,
            prefix=router_meta['prefix'],
            tags=router_meta['tags'],
            route_count=router_meta['route_count'],
            load_time_ms=load_time_ms
        )

        result.success.append(route_info)
        logger.log_success(route_info)

    except Exception as e:
        failed = FailedFile(
            filename=filename,
            error=e,
            error_type=type(e).__name__,
            traceback=tb.format_exc()
        )
        result.failed.append(failed)
        logger.log_failed(failed)


def get_load_result() -> Optional[LoadResult]:
    """
    Get the result from the last auto_register_routes call.

    This function provides backward compatibility with code that relied
    on the global AUTO_LOADED_ROUTES variable.

    Returns:
        LoadResult from last call, or None if never called
    """
    return _last_load_result


__all__ = [
    "auto_register_routes",
    "get_load_result",
]
