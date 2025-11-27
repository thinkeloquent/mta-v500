"""
Chat routes for AI SDK streaming endpoints.

Implements 6 streaming endpoints:
- 3 with messages input (array of role/content)
- 3 with prompt input (simple string)

Each set has three variants:
- stream-protocol / stream-protocol-prompt: Data stream with Vercel AI SDK protocol
- stream-text / stream-text-prompt: Plain text stream
- stream-custom / stream-custom-prompt: Custom data stream with init data
"""

from typing import Optional

from fastapi import APIRouter, Header
from fastapi.responses import StreamingResponse

from app.schemas.chat import MessagesRequest, PromptRequest
from app.services.ai_provider import get_chat_config
from app.get_api_key import resolve_model
from app.services.stream_service import (
    custom_stream,
    custom_stream_prompt,
    data_stream,
    data_stream_prompt,
    text_stream,
    text_stream_prompt,
)

# Prefix /chat - when mounted at /api/apps/ai-sdk-chat, routes become /api/apps/ai-sdk-chat/chat/stream-text etc.
router = APIRouter(prefix="/chat", tags=["ai-sdk-chat"])


# Health check
@router.get("")
async def health_check():
    """Health check endpoint for the AI SDK Chat API."""
    return {"status": "ok", "service": "ai-sdk-chat"}


# ============================================================================
# Messages-based endpoints (chat with message history)
# ============================================================================


@router.post("/stream-protocol")
async def stream_protocol(
    request: MessagesRequest,
    x_ai_model: Optional[str] = Header(None, alias="X-AI-Model"),
):
    """
    Data stream with Vercel AI SDK protocol (messages input).

    Returns streaming response with X-Vercel-AI-Data-Stream: v1 header.
    Uses data stream format: 0:"text content"
    """
    model = resolve_model(x_ai_model)
    config = get_chat_config(model)

    return StreamingResponse(
        data_stream(config, request.messages),
        media_type="text/plain; charset=utf-8",
        headers={"X-Vercel-AI-Data-Stream": "v1"},
    )


@router.post("/stream-text")
async def stream_text_endpoint(
    request: MessagesRequest,
    x_ai_model: Optional[str] = Header(None, alias="X-AI-Model"),
):
    """
    Plain text stream (messages input).

    Returns raw text chunks as they arrive from the AI model.
    """
    model = resolve_model(x_ai_model)
    config = get_chat_config(model)

    return StreamingResponse(
        text_stream(config, request.messages),
        media_type="text/plain; charset=utf-8",
    )


@router.post("/stream-custom")
async def stream_custom_endpoint(
    request: MessagesRequest,
    x_ai_model: Optional[str] = Header(None, alias="X-AI-Model"),
):
    """
    Custom data stream with initialization (messages input).

    Sends initialization data at the start, then streams content.
    Format: 2:[init_data], 0:"text chunks"
    """
    model = resolve_model(x_ai_model)
    config = get_chat_config(model)

    return StreamingResponse(
        custom_stream(config, request.messages),
        media_type="text/plain; charset=utf-8",
        headers={"X-Vercel-AI-Data-Stream": "v1"},
    )


# ============================================================================
# Prompt-based endpoints (single prompt input)
# ============================================================================


@router.post("/stream-protocol-prompt")
async def stream_protocol_prompt(
    request: PromptRequest,
    x_ai_model: Optional[str] = Header(None, alias="X-AI-Model"),
):
    """
    Data stream with Vercel AI SDK protocol (prompt input).

    Returns streaming response with X-Vercel-AI-Data-Stream: v1 header.
    """
    model = resolve_model(x_ai_model)
    config = get_chat_config(model)

    return StreamingResponse(
        data_stream_prompt(config, request.prompt),
        media_type="text/plain; charset=utf-8",
        headers={"X-Vercel-AI-Data-Stream": "v1"},
    )


@router.post("/stream-text-prompt")
async def stream_text_prompt_endpoint(
    request: PromptRequest,
    x_ai_model: Optional[str] = Header(None, alias="X-AI-Model"),
):
    """
    Plain text stream (prompt input).

    Returns raw text chunks as they arrive from the AI model.
    """
    model = resolve_model(x_ai_model)
    config = get_chat_config(model)

    return StreamingResponse(
        text_stream_prompt(config, request.prompt),
        media_type="text/plain; charset=utf-8",
    )


@router.post("/stream-custom-prompt")
async def stream_custom_prompt_endpoint(
    request: PromptRequest,
    x_ai_model: Optional[str] = Header(None, alias="X-AI-Model"),
):
    """
    Custom data stream with initialization (prompt input).

    Sends initialization data at the start, then streams content.
    """
    model = resolve_model(x_ai_model)
    config = get_chat_config(model)

    return StreamingResponse(
        custom_stream_prompt(config, request.prompt),
        media_type="text/plain; charset=utf-8",
        headers={"X-Vercel-AI-Data-Stream": "v1"},
    )
