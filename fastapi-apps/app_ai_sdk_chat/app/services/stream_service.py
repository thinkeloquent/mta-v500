"""
Streaming service implementing different stream protocols.

Mirrors the three streaming approaches from the Fastify version:
1. Text stream - Plain text chunks
2. Data stream - With X-Vercel-AI-Data-Stream: v1 header
3. Custom stream - With initialization data and error handling
"""

import json
from datetime import datetime, timezone
from typing import AsyncGenerator

from app.schemas.chat import ChatConfig, Message
from app.services.ai_provider import (
    build_openai_payload,
    build_prompt_payload,
    stream_completion,
)


async def text_stream(
    config: ChatConfig,
    messages: list[Message],
) -> AsyncGenerator[str, None]:
    """
    Simple text stream - yields raw text chunks.
    """
    payload = build_openai_payload(messages, config.model)
    async for chunk in stream_completion(config, payload):
        yield chunk


async def text_stream_prompt(
    config: ChatConfig,
    prompt: str,
) -> AsyncGenerator[str, None]:
    """
    Simple text stream for prompt input.
    """
    payload = build_prompt_payload(prompt, config.model)
    async for chunk in stream_completion(config, payload):
        yield chunk


async def data_stream(
    config: ChatConfig,
    messages: list[Message],
) -> AsyncGenerator[str, None]:
    """
    Data stream with Vercel AI SDK protocol.
    Each chunk is formatted as: 0:"text content"
    """
    payload = build_openai_payload(messages, config.model)
    async for chunk in stream_completion(config, payload):
        # Format as Vercel AI SDK data stream: 0:"content"
        # The 0 indicates text content type
        encoded = json.dumps(chunk)
        yield f"0:{encoded}\n"


async def data_stream_prompt(
    config: ChatConfig,
    prompt: str,
) -> AsyncGenerator[str, None]:
    """
    Data stream for prompt input.
    """
    payload = build_prompt_payload(prompt, config.model)
    async for chunk in stream_completion(config, payload):
        encoded = json.dumps(chunk)
        yield f"0:{encoded}\n"


async def custom_stream(
    config: ChatConfig,
    messages: list[Message],
) -> AsyncGenerator[str, None]:
    """
    Custom data stream with initialization and structured data.

    Format:
    - 2:[init_data] - Data message with initialization
    - 0:"text" - Text content chunks
    - e:{error} - Error message (if any)
    """
    # Send initialization data
    init_data = {
        "initialized": True,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "model": config.model,
        "provider": config.provider,
    }
    yield f"2:{json.dumps([init_data])}\n"

    try:
        payload = build_openai_payload(messages, config.model)
        async for chunk in stream_completion(config, payload):
            encoded = json.dumps(chunk)
            yield f"0:{encoded}\n"
    except Exception as e:
        # Send error in data stream format
        error_data = {"message": str(e)}
        yield f"e:{json.dumps(error_data)}\n"
        raise


async def custom_stream_prompt(
    config: ChatConfig,
    prompt: str,
) -> AsyncGenerator[str, None]:
    """
    Custom data stream for prompt input.
    """
    # Send initialization data
    init_data = {
        "initialized": True,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "model": config.model,
        "provider": config.provider,
    }
    yield f"2:{json.dumps([init_data])}\n"

    try:
        payload = build_prompt_payload(prompt, config.model)
        async for chunk in stream_completion(config, payload):
            encoded = json.dumps(chunk)
            yield f"0:{encoded}\n"
    except Exception as e:
        # Send error in data stream format
        error_data = {"message": str(e)}
        yield f"e:{json.dumps(error_data)}\n"
        raise
