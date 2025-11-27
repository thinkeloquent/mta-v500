"""
JSON utilities for custom serialization.
"""

import json
from datetime import datetime
from typing import Any


class CustomJSONEncoder(json.JSONEncoder):
    """
    Custom JSON encoder that handles datetime objects.
    """

    def default(self, obj: Any) -> Any:
        """
        Convert non-serializable objects to JSON-compatible format.

        Args:
            obj: Object to serialize

        Returns:
            JSON-serializable representation
        """
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


def serialize_to_json(data: Any) -> str:
    """
    Serialize data to JSON string with custom encoding.

    Args:
        data: Data to serialize

    Returns:
        JSON string
    """
    return json.dumps(data, cls=CustomJSONEncoder)


def deserialize_from_json(json_str: str) -> Any:
    """
    Deserialize JSON string to Python object.

    Args:
        json_str: JSON string

    Returns:
        Deserialized Python object
    """
    return json.loads(json_str)
