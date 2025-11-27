"""
Datetime utilities for consistent timestamp handling.
"""

from datetime import datetime, timezone
from typing import Optional


def get_current_timestamp() -> datetime:
    """
    Get the current UTC timestamp.

    Returns:
        Current datetime in UTC timezone
    """
    return datetime.now(timezone.utc)


def format_datetime(dt: Optional[datetime], format_str: str = "%Y-%m-%dT%H:%M:%SZ") -> Optional[str]:
    """
    Format a datetime object to ISO 8601 string.

    Args:
        dt: Datetime object to format
        format_str: Format string (default: ISO 8601)

    Returns:
        Formatted datetime string or None if dt is None
    """
    if dt is None:
        return None
    return dt.strftime(format_str)


def parse_datetime(dt_str: str, format_str: str = "%Y-%m-%dT%H:%M:%SZ") -> datetime:
    """
    Parse an ISO 8601 string to datetime object.

    Args:
        dt_str: Datetime string to parse
        format_str: Format string (default: ISO 8601)

    Returns:
        Parsed datetime object
    """
    return datetime.strptime(dt_str, format_str).replace(tzinfo=timezone.utc)


def timestamp_to_datetime(timestamp: float) -> datetime:
    """
    Convert Unix timestamp to datetime.

    Args:
        timestamp: Unix timestamp (seconds since epoch)

    Returns:
        Datetime object in UTC
    """
    return datetime.fromtimestamp(timestamp, tz=timezone.utc)


def datetime_to_timestamp(dt: datetime) -> float:
    """
    Convert datetime to Unix timestamp.

    Args:
        dt: Datetime object

    Returns:
        Unix timestamp (seconds since epoch)
    """
    return dt.timestamp()
