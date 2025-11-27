"""
Services package for business logic.

Services encapsulate business logic and orchestrate operations
between repositories and external systems.

Note: resolve_model is in get_api_key module, not ai_provider.

Example:
    from app.services.ai_provider import get_chat_config
    from app.services.stream_service import text_stream, data_stream
    from app.get_api_key import resolve_model
"""

from app.services.ai_provider import (
    get_chat_config,
    stream_completion,
)
from app.services.stream_service import (
    text_stream,
    data_stream,
    custom_stream,
)

__all__ = [
    "get_chat_config",
    "stream_completion",
    "text_stream",
    "data_stream",
    "custom_stream",
]
