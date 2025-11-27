"""
AI Provider service - thin wrapper delegating to get_api_key module.

All AI model requests and API key handling are centralized in get_api_key.py.
This service provides route-friendly helpers.
"""

from typing import AsyncGenerator

from app.get_api_key import (
    AISDKChatModel,
    ai_chat_stream,
    get_api_key,
    get_provider_for_model,
)
from app.schemas.chat import ChatConfig, Message


def get_chat_config(model: str) -> ChatConfig:
    """
    Get the chat configuration for a given model.
    Delegates to get_api_key module for provider resolution.
    """
    provider_name, provider_config = get_provider_for_model(model)
    api_key = get_api_key(provider_name)

    return ChatConfig(
        model=model,
        provider=provider_name,
        base_url=provider_config["baseURL"],
        api_key=api_key,
    )


def build_openai_payload(messages: list[Message], model: str, stream: bool = True) -> dict:
    """
    Build the OpenAI-compatible API request payload.
    """
    return {
        "model": model,
        "messages": [{"role": m.role, "content": m.content} for m in messages],
        "stream": stream,
    }


def build_prompt_payload(prompt: str, model: str, stream: bool = True) -> dict:
    """
    Build the OpenAI-compatible API request payload for a simple prompt.
    """
    return {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "stream": stream,
    }


async def stream_completion(
    config: ChatConfig,
    payload: dict,
) -> AsyncGenerator[str, None]:
    """
    Stream completion from the OpenAI-compatible API.
    Delegates to ai_chat_stream from get_api_key module.

    Yields chunks of text as they arrive.
    """
    # Pass full messages array to preserve conversation history
    messages = payload.get("messages", [])

    async for chunk in ai_chat_stream(
        base_url=config.base_url,
        model=config.model,
        api_key=config.api_key,
        messages=messages,
    ):
        # ai_chat_stream may yield dict for usage info, filter to str only
        if isinstance(chunk, str):
            yield chunk


async def get_completion(
    config: ChatConfig,
    payload: dict,
) -> str:
    """
    Get a non-streaming completion from the OpenAI-compatible API.
    Delegates to AISDKChatModel from get_api_key module.

    Returns the full response text.
    """
    # Pass full messages array to preserve conversation history
    messages = payload.get("messages", [])

    # Create model instance and generate
    model = AISDKChatModel(
        base_url=config.base_url,
        model=config.model,
    )

    response = await model.generate_async(api_key=config.api_key, messages=messages)

    # Extract text from response
    choices = response.get("choices", [])
    if choices:
        return choices[0].get("message", {}).get("content", "")
    return ""
