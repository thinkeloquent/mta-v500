"""
Datetime utilities for consistent datetime handling across the application.
"""

from datetime import datetime
from typing import Optional


def datetime_to_iso(dt: Optional[datetime]) -> Optional[str]:
    """
    Convert datetime to ISO 8601 string.

    Args:
        dt: Datetime object or None

    Returns:
        ISO 8601 formatted string or None
    """
    if dt is None:
        return None
    return dt.isoformat()


def iso_to_datetime(iso_str: Optional[str]) -> Optional[datetime]:
    """
    Convert ISO 8601 string to datetime.

    Args:
        iso_str: ISO 8601 formatted string or None

    Returns:
        Datetime object or None
    """
    if iso_str is None:
        return None
    return datetime.fromisoformat(iso_str)


def now() -> datetime:
    """
    Get current datetime.

    Returns:
        Current datetime
    """
    return datetime.now()
