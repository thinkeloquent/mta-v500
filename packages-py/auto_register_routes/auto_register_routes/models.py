"""
Data models for auto-registration system.

This module defines the data structures used to track route loading
results and metadata.
"""

from dataclasses import dataclass, field
from typing import List, Tuple, Optional


@dataclass
class RouteInfo:
    """
    Information about a successfully loaded route module.

    Attributes:
        filename: The route file name (e.g., "figma.routes.py")
        module_path: Full Python module path (e.g., "app.routes.figma.routes")
        prefix: Router URL prefix (e.g., "/figma")
        tags: OpenAPI tags list (e.g., ["figma"])
        route_count: Number of routes in the router
        load_time_ms: Time taken to load the module in milliseconds
    """

    filename: str
    module_path: str
    prefix: str
    tags: List[str]
    route_count: int
    load_time_ms: float

    def __post_init__(self):
        """Validate field types after initialization."""
        if not isinstance(self.filename, str) or not self.filename:
            raise ValueError(f"filename must be non-empty string, got: {type(self.filename)}")
        if not isinstance(self.module_path, str) or not self.module_path:
            raise ValueError(f"module_path must be non-empty string, got: {type(self.module_path)}")
        if not isinstance(self.prefix, str):
            raise ValueError(f"prefix must be string, got: {type(self.prefix)}")
        if not isinstance(self.tags, list):
            raise ValueError(f"tags must be list, got: {type(self.tags)}")
        if not all(isinstance(tag, str) for tag in self.tags):
            raise ValueError("All tags must be strings")
        if not isinstance(self.route_count, int) or self.route_count < 0:
            raise ValueError(f"route_count must be non-negative int, got: {self.route_count}")
        if not isinstance(self.load_time_ms, (int, float)) or self.load_time_ms < 0:
            raise ValueError(f"load_time_ms must be non-negative number, got: {self.load_time_ms}")


@dataclass
class SkippedFile:
    """
    Information about a file that was skipped during scanning.

    Attributes:
        filename: The file name
        reason: Why it was skipped
    """

    filename: str
    reason: str

    def __post_init__(self):
        """Validate field types after initialization."""
        if not isinstance(self.filename, str):
            raise ValueError(f"filename must be string, got: {type(self.filename)}")
        if not isinstance(self.reason, str):
            raise ValueError(f"reason must be string, got: {type(self.reason)}")


@dataclass
class FailedFile:
    """
    Information about a file that failed to load.

    Attributes:
        filename: The file name
        error: The exception that occurred
        error_type: The exception class name
        traceback: Optional traceback string
    """

    filename: str
    error: Exception
    error_type: str
    traceback: Optional[str] = None

    def __post_init__(self):
        """Validate field types after initialization."""
        if not isinstance(self.filename, str):
            raise ValueError(f"filename must be string, got: {type(self.filename)}")
        if not isinstance(self.error, Exception):
            raise ValueError(f"error must be Exception, got: {type(self.error)}")
        if not isinstance(self.error_type, str):
            raise ValueError(f"error_type must be string, got: {type(self.error_type)}")
        if self.traceback is not None and not isinstance(self.traceback, str):
            raise ValueError(f"traceback must be string or None, got: {type(self.traceback)}")


@dataclass
class LoadResult:
    """
    Complete result of the auto-registration process.

    Attributes:
        success: List of successfully loaded route modules
        skipped: List of skipped files with reasons
        failed: List of files that failed to load with errors
        total_files: Total number of files found
        total_loaded: Number of successfully loaded modules
        scan_directory: Directory that was scanned
        total_time_ms: Total time taken for entire process
    """

    success: List[RouteInfo] = field(default_factory=list)
    skipped: List[SkippedFile] = field(default_factory=list)
    failed: List[FailedFile] = field(default_factory=list)
    total_files: int = 0
    total_loaded: int = 0
    scan_directory: str = ""
    total_time_ms: float = 0.0

    def __post_init__(self):
        """Validate field types after initialization."""
        if not isinstance(self.success, list):
            raise ValueError(f"success must be list, got: {type(self.success)}")
        if not isinstance(self.skipped, list):
            raise ValueError(f"skipped must be list, got: {type(self.skipped)}")
        if not isinstance(self.failed, list):
            raise ValueError(f"failed must be list, got: {type(self.failed)}")
        if not isinstance(self.total_files, int) or self.total_files < 0:
            raise ValueError(f"total_files must be non-negative int, got: {self.total_files}")
        if not isinstance(self.total_loaded, int) or self.total_loaded < 0:
            raise ValueError(f"total_loaded must be non-negative int, got: {self.total_loaded}")
        if not isinstance(self.scan_directory, str):
            raise ValueError(f"scan_directory must be string, got: {type(self.scan_directory)}")
        if not isinstance(self.total_time_ms, (int, float)) or self.total_time_ms < 0:
            raise ValueError(f"total_time_ms must be non-negative number, got: {self.total_time_ms}")

    @property
    def success_rate(self) -> float:
        """Calculate success rate as percentage."""
        if self.total_files == 0:
            return 100.0
        return (self.total_loaded / self.total_files) * 100.0

    @property
    def has_errors(self) -> bool:
        """Check if any files failed to load."""
        return len(self.failed) > 0

    @property
    def has_warnings(self) -> bool:
        """Check if any files were skipped."""
        return len(self.skipped) > 0


__all__ = [
    "RouteInfo",
    "SkippedFile",
    "FailedFile",
    "LoadResult",
]
