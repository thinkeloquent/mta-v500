"""
google_gemini_openai_client - Data models

Type definitions and dataclasses for the Gemini OpenAI-compatible API.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, Literal

# Re-export constants from config for backward compatibility
from .config import (
    DEFAULT_BASE_URL,
    DEFAULT_MODEL,
    DEFAULT_TIMEOUT,
    DEFAULT_KEEP_ALIVE_TIMEOUT,
    DEFAULT_MAX_CONNECTIONS,
)

# =============================================================================
# Type Aliases
# =============================================================================

MessageRole = Literal["system", "user", "assistant", "function", "tool"]
ResponseFormatType = Literal["text", "json_object", "json_schema"]

# Async-only resolver that receives request for context-aware API key selection
# Usage: async def get_api_key(request) -> str: ...
ApiKeyResolver = Callable[[Any], Awaitable[str]]

# =============================================================================
# Chat Message Models
# =============================================================================


@dataclass
class Message:
    """A single chat message."""

    role: MessageRole
    content: str
    name: str | None = None


# =============================================================================
# Response Format Models
# =============================================================================


@dataclass
class JsonSchema:
    """JSON schema definition for structured output."""

    name: str
    schema: dict[str, Any]
    description: str | None = None
    strict: bool = True


@dataclass
class ResponseFormat:
    """Response format configuration."""

    type: ResponseFormatType
    json_schema: JsonSchema | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to API-compatible dictionary."""
        result: dict[str, Any] = {"type": self.type}
        if self.json_schema is not None:
            result["json_schema"] = {
                "name": self.json_schema.name,
                "schema": self.json_schema.schema,
                "strict": self.json_schema.strict,
            }
            if self.json_schema.description:
                result["json_schema"]["description"] = self.json_schema.description
        return result


# =============================================================================
# Response Models
# =============================================================================


@dataclass
class ResponseMessage:
    """Message in a completion choice."""

    role: str
    content: str


@dataclass
class Choice:
    """A single completion choice."""

    index: int
    message: ResponseMessage
    finish_reason: str | None = None


@dataclass
class Usage:
    """Token usage statistics."""

    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


@dataclass
class ChatCompletionResponse:
    """Chat completion response."""

    id: str
    object: str
    created: int
    model: str
    choices: list[Choice]
    usage: Usage | None = None


# =============================================================================
# Structured Output Models
# =============================================================================


@dataclass
class StructuredOutputSchema:
    """Schema definition for structured output parsing."""

    name: str
    schema: dict[str, Any]
    description: str | None = None
    strict: bool = True


@dataclass
class StructuredOutputResult:
    """Result of structured output parsing."""

    success: bool
    data: Any | None
    raw: str
    error: str | None = None


# =============================================================================
# Client Configuration
# =============================================================================


@dataclass
class ClientConfig:
    """Internal client configuration."""

    api_key: str
    base_url: str
    proxy: str | None = None
    cert: str | tuple[str, str] | None = None
    ca_bundle: str | None = None
    custom_headers: dict[str, str] = field(default_factory=dict)
    timeout: float = DEFAULT_TIMEOUT
    max_connections: int = DEFAULT_MAX_CONNECTIONS
    get_api_key_for_request: ApiKeyResolver | None = None
    """
    Async function to get API key per request.
    Receives request object for context-aware token selection.
    Called when no header override is provided.
    """
