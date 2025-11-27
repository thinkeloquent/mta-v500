"""
google_gemini_openai_client - Google Gemini OpenAI-compatible REST API client.

This package provides utilities for interacting with Google's Gemini API
using the OpenAI-compatible REST interface. It supports both synchronous
and asynchronous clients via httpx.

Example - Basic usage:
    >>> from google_gemini_openai_client import create_client, chat_completion
    >>>
    >>> client = create_client()  # Uses GEMINI_API_KEY env
    >>> response = chat_completion(
    ...     client,
    ...     messages=[{"role": "user", "content": "Hello!"}],
    ... )
    >>> print(response.choices[0].message.content)

Example - Structured output:
    >>> from google_gemini_openai_client import (
    ...     create_client,
    ...     chat_completion_structured,
    ...     parse_structured_output,
    ...     create_json_schema,
    ... )
    >>>
    >>> client = create_client()
    >>> schema = create_json_schema(
    ...     "person_info",
    ...     {"name": {"type": "string"}, "age": {"type": "number"}},
    ...     required=["name", "age"],
    ... )
    >>> response = chat_completion_structured(
    ...     client,
    ...     messages=[{"role": "user", "content": "John is 30 years old"}],
    ...     schema=schema,
    ... )
    >>> result = parse_structured_output(response)
    >>> print(result.data)

Example - With fetch_proxy_dispatcher:
    >>> from fetch_proxy_dispatcher import get_proxy_dispatcher
    >>> from google_gemini_openai_client import create_client, chat_completion
    >>>
    >>> dispatcher = get_proxy_dispatcher(async_client=False)
    >>> client = create_client(proxy_dispatcher=dispatcher.client)
    >>> response = chat_completion(client, messages=[...])

Environment Variables:
    GEMINI_API_KEY: Your Google Gemini API key
"""

__version__ = "1.0.0"

# Client
from .client import (
    create_client,
    create_async_client,
    get_client_config,
)

# Chat
from .chat import (
    chat_completion,
    chat_completion_async,
    chat_completion_with_dynamic_key,
    chat_completion_structured,
    parse_structured_output,
    extract_content,
    extract_all_contents,
    resolve_api_key,
    API_KEY_HEADER,
)

# Utils
from .utils import (
    log_progress,
    format_output,
    format_usage,
    create_json_schema,
    create_simple_schema,
    system_message,
    user_message,
    assistant_message,
)

# Config
from .config import (
    DEFAULT_BASE_URL,
    DEFAULT_MODEL,
    DEFAULT_TIMEOUT,
    DEFAULT_KEEP_ALIVE_TIMEOUT,
    DEFAULT_MAX_CONNECTIONS,
    SEPARATOR,
    THIN_SEPARATOR,
    ENV_API_KEY,
    get_api_key,
)

# Models
from .models import (
    # Types
    ApiKeyResolver,
    MessageRole,
    ResponseFormatType,
    # Dataclasses
    Message,
    JsonSchema,
    ResponseFormat,
    ResponseMessage,
    Choice,
    Usage,
    ChatCompletionResponse,
    StructuredOutputSchema,
    StructuredOutputResult,
    ClientConfig,
)

__all__ = [
    # Version
    "__version__",
    # Client
    "create_client",
    "create_async_client",
    "get_client_config",
    # Chat
    "chat_completion",
    "chat_completion_async",
    "chat_completion_with_dynamic_key",
    "chat_completion_structured",
    "parse_structured_output",
    "extract_content",
    "extract_all_contents",
    "resolve_api_key",
    "API_KEY_HEADER",
    # Utils
    "log_progress",
    "format_output",
    "format_usage",
    "create_json_schema",
    "create_simple_schema",
    "system_message",
    "user_message",
    "assistant_message",
    # Config
    "DEFAULT_BASE_URL",
    "DEFAULT_MODEL",
    "DEFAULT_TIMEOUT",
    "DEFAULT_KEEP_ALIVE_TIMEOUT",
    "DEFAULT_MAX_CONNECTIONS",
    "SEPARATOR",
    "THIN_SEPARATOR",
    "ENV_API_KEY",
    "get_api_key",
    # Types
    "ApiKeyResolver",
    "MessageRole",
    "ResponseFormatType",
    # Models
    "Message",
    "JsonSchema",
    "ResponseFormat",
    "ResponseMessage",
    "Choice",
    "Usage",
    "ChatCompletionResponse",
    "StructuredOutputSchema",
    "StructuredOutputResult",
    "ClientConfig",
]
