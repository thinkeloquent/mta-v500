"""
Centralized logging configuration.

Sets up Python's standard logging with rotating file handler.
"""

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path


def setup_logging(app_name: str = "app", log_level: str = "INFO") -> logging.Logger:
    """
    Configure application logging with rotating file handler.

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

    # Create logs directory if it doesn't exist
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)

    # Rotating file handler - 10MB max, 5 backup files
    handler = RotatingFileHandler(
        log_dir / f"{app_name}.log",
        maxBytes=10_000_000,
        backupCount=5,
    )

    # Formatter with timestamp, level, logger name, and message
    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
    )

    handler.setFormatter(formatter)
    logger.addHandler(handler)

    # Also log to console for development
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    return logger


# Create default logger instance
logger = setup_logging("figma-component-inspector")
