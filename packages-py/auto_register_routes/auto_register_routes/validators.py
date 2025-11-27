"""
Validators for auto-registration system.

Provides defensive programming with comprehensive type and value checking.
All validations are performed to prevent runtime errors and provide clear
error messages.
"""

import os
from pathlib import Path
from typing import Any, List, Dict, Tuple
from .models import RouteInfo


class ValidationError(Exception):
    """Raised when validation fails."""
    pass


def validate_fastapi_app(app: Any) -> None:
    """
    Validate that app is a FastAPI instance.

    Args:
        app: Object to validate

    Raises:
        ValidationError: If app is not a valid FastAPI instance
    """
    if app is None:
        raise ValidationError("app cannot be None")

    # Check if it has the FastAPI required attributes
    required_attrs = ['include_router', 'routes', 'router']
    missing_attrs = [attr for attr in required_attrs if not hasattr(app, attr)]

    if missing_attrs:
        raise ValidationError(
            f"app must be a FastAPI instance. Missing attributes: {', '.join(missing_attrs)}"
        )

    # Check if include_router is callable
    if not callable(getattr(app, 'include_router', None)):
        raise ValidationError("app.include_router must be callable")


def validate_package_name(package_name: str) -> None:
    """
    Validate package name is a non-empty string.

    Args:
        package_name: Package name to validate

    Raises:
        ValidationError: If package name is invalid
    """
    if not isinstance(package_name, str):
        raise ValidationError(
            f"package_name must be a string, got {type(package_name).__name__}"
        )

    if not package_name or not package_name.strip():
        raise ValidationError("package_name cannot be empty")

    # Check for invalid characters
    invalid_chars = [' ', '\n', '\t', '\r']
    for char in invalid_chars:
        if char in package_name:
            raise ValidationError(
                f"package_name contains invalid character: {repr(char)}"
            )


def validate_directory(directory_path: str) -> Path:
    """
    Validate that directory exists and is readable.

    Args:
        directory_path: Path to directory

    Returns:
        Path object for the directory

    Raises:
        ValidationError: If directory is invalid
    """
    if not isinstance(directory_path, str):
        raise ValidationError(
            f"directory_path must be string, got {type(directory_path).__name__}"
        )

    path = Path(directory_path)

    if not path.exists():
        raise ValidationError(f"Directory does not exist: {directory_path}")

    if not path.is_dir():
        raise ValidationError(f"Path is not a directory: {directory_path}")

    # Check if directory is readable
    if not os.access(directory_path, os.R_OK):
        raise ValidationError(f"Directory is not readable: {directory_path}")

    return path


def validate_filename(filename: str) -> Tuple[bool, str]:
    """
    Validate route filename follows conventions.

    Args:
        filename: Filename to validate

    Returns:
        Tuple of (is_valid, reason_if_invalid)
    """
    if not isinstance(filename, str):
        return False, f"Filename must be string, got {type(filename).__name__}"

    # Check for hyphens (invalid in Python module names)
    if '-' in filename:
        suggested = filename.replace('-', '_')
        return False, f"Hyphens not allowed in filenames. Use underscores instead: {suggested}"

    # Check for other invalid characters
    invalid_chars = [' ', '\t', '\n', '\r', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')',
                     '+', '=', '{', '}', '[', ']', '|', '\\', ':', ';', '"', "'", '<', '>', ',', '?']
    found_invalid = [char for char in invalid_chars if char in filename]
    if found_invalid:
        return False, f"Contains invalid characters: {', '.join(repr(c) for c in found_invalid)}"

    # Check minimum length
    if len(filename) < 3:
        return False, "Filename too short"

    return True, ""


def check_file_readable(filepath: Path) -> bool:
    """
    Check if file exists and is readable.

    Args:
        filepath: Path to file

    Returns:
        True if file is readable
    """
    if not isinstance(filepath, Path):
        return False

    if not filepath.exists():
        return False

    if not filepath.is_file():
        return False

    return os.access(str(filepath), os.R_OK)


def validate_router(router: Any) -> Dict[str, Any]:
    """
    Validate router object has required attributes and extract metadata.

    Args:
        router: Router object to validate

    Returns:
        Dictionary with router metadata (prefix, tags, route_count)

    Raises:
        ValidationError: If router is invalid
    """
    if router is None:
        raise ValidationError("router cannot be None")

    # Extract and validate prefix
    prefix = getattr(router, 'prefix', None)
    if prefix is None:
        prefix = ""
    elif not isinstance(prefix, str):
        raise ValidationError(
            f"router.prefix must be string, got {type(prefix).__name__}"
        )

    # Validate prefix format if present
    if prefix and not prefix.startswith('/'):
        raise ValidationError(
            f"router.prefix must start with '/', got: {prefix}"
        )

    # Extract and validate tags
    tags = getattr(router, 'tags', None)
    if tags is None:
        tags = []
    elif not isinstance(tags, (list, tuple)):
        raise ValidationError(
            f"router.tags must be list or tuple, got {type(tags).__name__}"
        )
    else:
        tags = list(tags)  # Convert tuple to list if needed
        # Validate all tags are strings
        for i, tag in enumerate(tags):
            if not isinstance(tag, str):
                raise ValidationError(
                    f"router.tags[{i}] must be string, got {type(tag).__name__}"
                )

    # Extract and validate routes
    routes = getattr(router, 'routes', None)
    if routes is None:
        route_count = 0
    elif isinstance(routes, (list, tuple)):
        route_count = len(routes)
    else:
        # If routes is some other type, try to count it
        try:
            route_count = len(routes)
        except TypeError:
            route_count = 0

    return {
        "prefix": prefix,
        "tags": tags,
        "route_count": route_count
    }


def detect_duplicate_prefixes(route_infos: List[RouteInfo]) -> List[Tuple[str, List[str]]]:
    """
    Detect duplicate route prefixes across loaded routes.

    Args:
        route_infos: List of loaded route information

    Returns:
        List of (prefix, [filenames]) tuples for duplicates
    """
    if not isinstance(route_infos, list):
        return []

    # Build prefix -> filenames mapping
    prefix_map: Dict[str, List[str]] = {}
    for route_info in route_infos:
        if not isinstance(route_info, RouteInfo):
            continue

        prefix = route_info.prefix
        if prefix not in prefix_map:
            prefix_map[prefix] = []
        prefix_map[prefix].append(route_info.filename)

    # Find duplicates (prefixes with more than one file)
    duplicates = [
        (prefix, filenames)
        for prefix, filenames in prefix_map.items()
        if len(filenames) > 1
    ]

    return duplicates


def validate_verbose_flag(verbose: Any) -> bool:
    """
    Validate and normalize verbose flag.

    Args:
        verbose: Value to validate as verbose flag

    Returns:
        Normalized boolean value
    """
    if isinstance(verbose, bool):
        return verbose

    # Try to convert truthy values
    if verbose in (1, "true", "True", "TRUE", "yes", "Yes", "YES", "1"):
        return True

    if verbose in (0, "false", "False", "FALSE", "no", "No", "NO", "0", None):
        return False

    # Default to True if unclear
    return True


__all__ = [
    "ValidationError",
    "validate_fastapi_app",
    "validate_package_name",
    "validate_directory",
    "validate_filename",
    "check_file_readable",
    "validate_router",
    "detect_duplicate_prefixes",
    "validate_verbose_flag",
]
