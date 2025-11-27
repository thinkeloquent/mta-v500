import asyncio
import os
from typing import AsyncGenerator, Union

from app.get_api_key import (
    AISDKChatModel,
    AIEmbeddingModel,
    ai_chat_stream,
    get_api_key
)


# =============================================================================
# Chat Model (equivalent to aiSDKChatModel)
# =============================================================================
ai_sdk_chat_model = AISDKChatModel(
    base_url=os.getenv("AISDKChatModel_URL"),
    model=os.getenv("AISDKChatModel"),
)


# =============================================================================
# Embedding Model (equivalent to aiSDKEmbeddingModel)
# =============================================================================
ai_sdk_embedding_model = AIEmbeddingModel(
    base_url=os.getenv("AISDKEmbeddingModel_URL"),
    model=os.getenv("AISDKEmbeddingModel"),
    query_params={"api-version": "2024-06-01"},
)

# =============================================================================
# Simple Prompt (equivalent to aiSDKChatSimplePrompt)
# =============================================================================
async def ai_sdk_chat_simple_prompt(prompt: str, api_key: str) -> dict:
    response = await ai_sdk_chat_model.generate_async(prompt, api_key=api_key)

    # Extract text from OpenAI-compatible response
    text = ""
    choices = response.get("choices", [])
    if choices:
        text = choices[0].get("message", {}).get("content", "")

    return {"instance": response, "text": text}


# =============================================================================
# Streaming Prompt (equivalent to aiSDKChatSimpleStreamPrompt)
# =============================================================================
async def ai_sdk_chat_simple_stream_prompt(
    prompt: str,
    api_key: str,
    include_usage: bool = False,
) -> AsyncGenerator[Union[str, dict], None]:
    """
    Stream chat completion chunks.

    Args:
        prompt: The user prompt to send
        api_key: API key for authentication
        include_usage: If True, yields usage dict as final item

    Yields:
        str chunks of content, and optionally a dict with usage info at the end
    """
    async for chunk in ai_chat_stream(
        prompt=prompt,
        base_url=ai_sdk_chat_model.base_url,
        model=ai_sdk_chat_model.model,
        api_key=api_key,
        headers=ai_sdk_chat_model.headers,
        include_usage=include_usage or ai_sdk_chat_model.include_usage,
    ):
        yield chunk


# =============================================================================
# Embedding (equivalent to aiSDKEmbeddingModel.embed)
# =============================================================================
async def ai_sdk_embed(text: str, api_key: str) -> dict:
    return await ai_sdk_embedding_model.embed_async(text, api_key=api_key)


# =============================================================================
# Example Usage
# =============================================================================
if __name__ == "__main__":

    async def main():
        # Replace with your actual service token
        api_key = get_api_key()

        # Simple completion
        print("=== Simple Prompt ===")
        result = await ai_sdk_chat_simple_prompt("Hello, what is Python?", api_key)
        print(result["text"])

        # Streaming
        print("\n=== Streaming Prompt ===")
        async for chunk in ai_sdk_chat_simple_stream_prompt("Tell me a fun fact.", api_key):
            print(chunk, end="", flush=True)
        print()

        # Embedding
        print("\n=== Embedding ===")
        emb = await ai_sdk_embed("chatbots are cool", api_key)
        data = emb.get("data", [{}])
        if data:
            embedding = data[0].get("embedding", [])
            print(f"Embedding dimensions: {len(embedding)}")

    asyncio.run(main())
