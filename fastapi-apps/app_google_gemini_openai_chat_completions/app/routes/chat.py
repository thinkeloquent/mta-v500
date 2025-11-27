"""
Google Gemini OpenAI Chat Completions routes.

Provides chat completion endpoints using Google Gemini via the OpenAI-compatible API.
Uses the google_gemini_openai_client package for API communication.
"""

from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
import httpx

from google_gemini_openai_client import (
    create_client,
    chat_completion,
    chat_completion_structured,
    parse_structured_output,
    create_json_schema,
    extract_content,
    DEFAULT_MODEL,
)


router = APIRouter(tags=["chat"])


# =============================================================================
# Request/Response Models
# =============================================================================


class ChatMessage(BaseModel):
    """A single chat message."""

    role: str = Field(..., description="Message role: 'user', 'assistant', or 'system'")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    """Request body for chat completion."""

    messages: list[ChatMessage] = Field(..., description="List of messages")
    model: str = Field(default=DEFAULT_MODEL, description="Model to use")
    temperature: float | None = Field(default=None, description="Sampling temperature (0-2)")
    max_tokens: int | None = Field(default=None, description="Maximum tokens to generate")


class StructuredChatRequest(ChatRequest):
    """Request body for structured chat completion with JSON schema."""

    schema_name: str = Field(..., description="Name for the JSON schema")
    schema_properties: dict[str, Any] = Field(
        ..., description="JSON schema properties definition"
    )
    schema_required: list[str] | None = Field(
        default=None, description="Required property names"
    )


class ChatResponse(BaseModel):
    """Response from chat completion."""

    content: str = Field(..., description="Response content")
    model: str = Field(..., description="Model used")
    finish_reason: str | None = Field(default=None, description="Why generation stopped")
    usage: dict[str, int] | None = Field(default=None, description="Token usage stats")


class StructuredChatResponse(BaseModel):
    """Response from structured chat completion."""

    success: bool = Field(..., description="Whether parsing succeeded")
    data: dict[str, Any] | None = Field(default=None, description="Parsed JSON data")
    raw: str = Field(..., description="Raw response content")
    error: str | None = Field(default=None, description="Error message if parsing failed")
    model: str = Field(..., description="Model used")
    usage: dict[str, int] | None = Field(default=None, description="Token usage stats")


# =============================================================================
# Client Dependency
# =============================================================================

# Cache for the client instance
_gemini_client: httpx.Client | None = None


def get_gemini_client(request: Request) -> httpx.Client:
    """
    Get or create a singleton Gemini client.

    Uses GEMINI_API_KEY environment variable for authentication.
    Uses proxy configuration from app state (configured in main.py).
    Falls back to environment variables if no explicit config is set.
    """
    global _gemini_client
    if _gemini_client is None:
        proxy_factory = request.app.state.proxy_factory
        proxy_config = proxy_factory.get_proxy_config()
        # Extract only the params that create_client accepts
        _gemini_client = create_client(
            proxy=proxy_config.get("proxy"),
            cert=proxy_config.get("cert"),
            ca_bundle=proxy_config.get("verify") if isinstance(proxy_config.get("verify"), str) else None,
        )
    return _gemini_client


# =============================================================================
# Routes
# =============================================================================


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, req: Request):
    """
    Send messages to Gemini and get a response.

    This is the basic chat completion endpoint.
    """
    try:
        client = get_gemini_client(req)

        # Convert Pydantic models to dicts
        messages = [{"role": m.role, "content": m.content} for m in request.messages]

        # Build optional parameters
        kwargs: dict[str, Any] = {}
        if request.temperature is not None:
            kwargs["temperature"] = request.temperature
        if request.max_tokens is not None:
            kwargs["max_tokens"] = request.max_tokens

        response = chat_completion(
            client,
            messages=messages,
            model=request.model,
            **kwargs,
        )

        # Build usage dict if available
        usage = None
        if response.usage:
            usage = {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens,
            }

        return ChatResponse(
            content=extract_content(response),
            model=response.model,
            finish_reason=response.choices[0].finish_reason if response.choices else None,
            usage=usage,
        )

    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Gemini API error: {e.response.text}",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.post("/chat/structured", response_model=StructuredChatResponse)
async def chat_structured(request: StructuredChatRequest, req: Request):
    """
    Get structured JSON response from Gemini.

    Uses JSON schema to constrain the output format.
    """
    try:
        client = get_gemini_client(req)

        # Convert Pydantic models to dicts
        messages = [{"role": m.role, "content": m.content} for m in request.messages]

        # Create JSON schema
        schema = create_json_schema(
            name=request.schema_name,
            properties=request.schema_properties,
            required=request.schema_required,
        )

        # Build optional parameters
        kwargs: dict[str, Any] = {}
        if request.temperature is not None:
            kwargs["temperature"] = request.temperature
        if request.max_tokens is not None:
            kwargs["max_tokens"] = request.max_tokens

        response = chat_completion_structured(
            client,
            messages=messages,
            schema=schema,
            model=request.model,
            **kwargs,
        )

        # Parse the structured output
        result = parse_structured_output(response)

        # Build usage dict if available
        usage = None
        if response.usage:
            usage = {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens,
            }

        return StructuredChatResponse(
            success=result.success,
            data=result.data,
            raw=result.raw,
            error=result.error,
            model=response.model,
            usage=usage,
        )

    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Gemini API error: {e.response.text}",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
