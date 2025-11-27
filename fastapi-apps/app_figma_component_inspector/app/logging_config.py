"""
Centralized logging configuration.

Sets up Python's standard logging with console handler.
File logging is optional and gracefully handles read-only filesystems.
"""

import logging
import os
import tempfile
from logging.handlers import RotatingFileHandler
from pathlib import Path


def setup_logging(app_name: str = "app", log_level: str = "INFO") -> logging.Logger:
    """
    Configure application logging with console and optional file handler.

    Args:
        app_name: Name of the application/logger
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)

    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(app_name)
    logger.setLevel(getattr(logging, log_level.upper()))

    # Avoid duplicate handlers if called multiple times
    if logger.handlers:
        return logger

    # Formatter with timestamp, level, logger name, and message
    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
    )

    # Console handler (always enabled)
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # Try to set up file logging (gracefully handle read-only filesystems)
    try:
        # Priority: /app/logs (Docker) > app-relative logs > temp directory
        log_dir = Path("/app/logs")
        if not (log_dir.exists() and os.access(log_dir, os.W_OK)):
            log_dir = Path(__file__).parent.parent / "logs"
            if not _try_create_log_dir(log_dir):
                log_dir = Path(tempfile.gettempdir()) / "fastapi-logs"
                _try_create_log_dir(log_dir)

        if log_dir.exists() and os.access(log_dir, os.W_OK):
            handler = RotatingFileHandler(
                log_dir / f"{app_name}.log",
                maxBytes=10_000_000,
                backupCount=5,
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
    except (OSError, PermissionError):
        # File logging disabled on read-only filesystem
        pass

    return logger


def _try_create_log_dir(log_dir: Path) -> bool:
    """Try to create log directory, return True if successful."""
    try:
        log_dir.mkdir(exist_ok=True)
        return True
    except (OSError, PermissionError):
        return False


# Create default logger instance
logger = setup_logging("figma_component_inspector")
