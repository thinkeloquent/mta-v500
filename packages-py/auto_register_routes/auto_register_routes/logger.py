"""
Comprehensive logging system for auto-registration.

Provides structured, color-coded logging with multiple levels and
detailed tracking of the route loading process.
"""

import sys
from datetime import datetime
from enum import Enum
from typing import Optional, List
from .models import LoadResult, RouteInfo, SkippedFile, FailedFile


class LogLevel(str, Enum):
    """Log level enumeration."""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARN = "WARN"
    ERROR = "ERROR"


class Color:
    """ANSI color codes for terminal output."""
    RESET = "\033[0m"
    RED = "\033[0;31m"
    GREEN = "\033[0;32m"
    YELLOW = "\033[1;33m"
    BLUE = "\033[0;34m"
    GRAY = "\033[0;90m"
    BOLD = "\033[1m"


class AutoRegisterLogger:
    """
    Logger for auto-registration process.

    Provides structured logging with timestamps, color coding, and
    multiple log levels.
    """

    def __init__(self, verbose: bool = True, use_colors: bool = True):
        """
        Initialize the logger.

        Args:
            verbose: If True, show DEBUG level messages
            use_colors: If True, use ANSI colors in output
        """
        self.verbose = verbose
        self.use_colors = use_colors and self._supports_color()

    def _supports_color(self) -> bool:
        """
        Check if terminal supports ANSI colors.

        Returns:
            True if colors are supported
        """
        # Check if stdout is a TTY
        if not hasattr(sys.stdout, 'isatty'):
            return False
        if not sys.stdout.isatty():
            return False

        # Windows check
        if sys.platform == 'win32':
            return False

        return True

    def _get_timestamp(self) -> str:
        """Get current timestamp string."""
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def _colorize(self, text: str, color: str) -> str:
        """
        Apply color to text if colors are enabled.

        Args:
            text: Text to colorize
            color: Color code

        Returns:
            Colorized text or plain text
        """
        if not self.use_colors:
            return text
        return f"{color}{text}{Color.RESET}"

    def _format_message(self, level: LogLevel, message: str) -> str:
        """
        Format a log message with timestamp and level.

        Args:
            level: Log level
            message: Message text

        Returns:
            Formatted message
        """
        timestamp = self._colorize(
            f"[{self._get_timestamp()}]",
            Color.GRAY
        )

        # Color code the level
        level_colors = {
            LogLevel.DEBUG: Color.GRAY,
            LogLevel.INFO: Color.BLUE,
            LogLevel.WARN: Color.YELLOW,
            LogLevel.ERROR: Color.RED,
        }
        colored_level = self._colorize(
            f"{level.value:5}",
            level_colors.get(level, Color.RESET)
        )

        return f"{timestamp} {colored_level} {message}"

    def debug(self, message: str):
        """Log a DEBUG level message."""
        if self.verbose:
            print(self._format_message(LogLevel.DEBUG, message))

    def info(self, message: str):
        """Log an INFO level message."""
        print(self._format_message(LogLevel.INFO, message))

    def warn(self, message: str):
        """Log a WARN level message."""
        print(self._format_message(LogLevel.WARN, message))

    def error(self, message: str):
        """Log an ERROR level message."""
        print(self._format_message(LogLevel.ERROR, message))

    def log_scan_start(self, directory: str, pattern: str = "*.routes.py"):
        """Log the start of directory scanning."""
        self.info(f"Starting route auto-registration")
        self.info(f"Scanning directory: {directory}")
        self.debug(f"Looking for files matching: {pattern}")

    def log_files_found(self, files: List[str]):
        """
        Log files found in directory.

        Args:
            files: List of filenames found
        """
        if not files:
            self.warn("No route files found in directory")
            return

        count = len(files)
        checkmark = self._colorize("✓", Color.GREEN)
        self.info(f"{checkmark} Found {count} matching route file{'s' if count != 1 else ''}")
        if self.verbose:
            for filename in files:
                self.debug(f"  - {filename}")

    def log_loading_file(self, filename: str, module_path: str, file_path: str):
        """
        Log start of file loading.

        Args:
            filename: Route filename
            module_path: Python module path
            file_path: Filesystem path
        """
        self.info(f"Loading: {self._colorize(filename, Color.BOLD)}")
        self.debug(f"  Module path: {module_path}")
        self.debug(f"  File path: {file_path}")

    def log_success(self, route_info: RouteInfo):
        """
        Log successful route loading.

        Args:
            route_info: Information about loaded route
        """
        checkmark = self._colorize("✓", Color.GREEN)
        filename = self._colorize(route_info.filename, Color.GREEN)
        self.info(f"{checkmark} Successfully loaded {filename}")

        # Format route details
        details_parts = []
        if route_info.prefix:
            details_parts.append(f"Prefix: {route_info.prefix}")
        if route_info.tags:
            tags_str = ', '.join(f"'{tag}'" for tag in route_info.tags)
            details_parts.append(f"Tags: [{tags_str}]")
        details_parts.append(f"Routes: {route_info.route_count}")
        if route_info.load_time_ms > 0:
            details_parts.append(f"Time: {route_info.load_time_ms:.1f}ms")

        self.info(f"  {', '.join(details_parts)}")

    def log_skipped(self, skipped: SkippedFile):
        """
        Log skipped file.

        Args:
            skipped: Information about skipped file
        """
        warning = self._colorize("⚠", Color.YELLOW)
        filename = self._colorize(skipped.filename, Color.YELLOW)
        self.warn(f"{warning} Skipped {filename}: {skipped.reason}")

    def log_failed(self, failed: FailedFile):
        """
        Log failed file load.

        Args:
            failed: Information about failed file
        """
        cross = self._colorize("✗", Color.RED)
        filename = self._colorize(failed.filename, Color.RED)
        self.error(f"{cross} Failed to load {filename}")
        self.error(f"  {failed.error_type}: {str(failed.error)}")

        if failed.traceback and self.verbose:
            # Print each line of traceback indented
            for line in failed.traceback.strip().split('\n'):
                self.debug(f"  {line}")

    def log_summary(self, result: LoadResult):
        """
        Log summary of loading process.

        Args:
            result: Complete load result
        """
        print("\n" + "="*60)
        self.info("Auto-registration Summary")
        print("="*60)

        # Success count
        if result.total_loaded > 0:
            checkmark = self._colorize("✓", Color.GREEN)
            self.info(f"{checkmark} Successful: {result.total_loaded}/{result.total_files}")
        else:
            self.warn(f"Successful: 0/{result.total_files}")

        # Skipped count
        if result.has_warnings:
            warning = self._colorize("⚠", Color.YELLOW)
            self.warn(f"{warning} Skipped: {len(result.skipped)}")

        # Failed count
        if result.has_errors:
            cross = self._colorize("✗", Color.RED)
            self.error(f"{cross} Failed: {len(result.failed)}")

        # Total time
        if result.total_time_ms > 0:
            self.info(f"Total time: {result.total_time_ms:.1f}ms")

        # Success rate
        self.info(f"Success rate: {result.success_rate:.1f}%")

        print("="*60 + "\n")

    def log_duplicate_prefixes(self, duplicates: List[tuple]):
        """
        Log warning about duplicate route prefixes.

        Args:
            duplicates: List of (prefix, filenames) tuples
        """
        if not duplicates:
            return

        self.warn("Duplicate route prefixes detected:")
        for prefix, filenames in duplicates:
            self.warn(f"  Prefix '{prefix}' defined in:")
            for filename in filenames:
                self.warn(f"    - {filename}")


# Global logger instance
_logger: Optional[AutoRegisterLogger] = None


def get_logger(verbose: bool = True, use_colors: bool = True) -> AutoRegisterLogger:
    """
    Get or create the global logger instance.

    Args:
        verbose: Enable verbose (DEBUG) logging
        use_colors: Enable color output

    Returns:
        Logger instance
    """
    global _logger
    if _logger is None:
        _logger = AutoRegisterLogger(verbose=verbose, use_colors=use_colors)
    return _logger


__all__ = [
    "AutoRegisterLogger",
    "LogLevel",
    "get_logger",
]
