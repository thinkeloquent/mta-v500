"""
JSON utilities for serialization and deserialization.
"""

import json
from datetime import datetime, date
from decimal import Decimal
from typing import Any
from uuid import UUID


def serialize_datetime(obj: Any) -> str:
    """
    Serialize datetime objects for JSON.

    Args:
        obj: Object to serialize

    Returns:
        ISO format string for datetime/date objects

    Raises:
        TypeError: If object is not serializable
    """
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, date):
        return obj.isoformat()
    if isinstance(obj, UUID):
        return str(obj)
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


def json_serializer(obj: Any) -> str:
    """
    Serialize object to JSON string with datetime support.

    Args:
        obj: Object to serialize

    Returns:
        JSON string
    """
    return json.dumps(obj, default=serialize_datetime)


def json_deserializer(json_str: str) -> Any:
    """
    Deserialize JSON string to Python object.

    Args:
        json_str: JSON string to deserialize

    Returns:
        Python object
    """
    return json.loads(json_str)


def safe_json_loads(json_str: str, default: Any = None) -> Any:
    """
    Safely deserialize JSON string, returning default on error.

    Args:
        json_str: JSON string to deserialize
        default: Default value to return on error

    Returns:
        Python object or default value
    """
    try:
        return json.loads(json_str)
    except (json.JSONDecodeError, TypeError):
        return default
