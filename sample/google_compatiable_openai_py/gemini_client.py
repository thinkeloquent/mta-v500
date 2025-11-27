"""
Google Gemini API client using OpenAI-compatible interface.
Supports proxy configuration and custom headers.
"""

import os
import httpx
from openai import OpenAI, DefaultHttpxClient


def create_gemini_client(
    api_key: str | None = None,
    proxy: str | None = None,
    custom_headers: dict | None = None,
    local_address: str | None = None,
) -> OpenAI:
    """
    Create an OpenAI client configured for Google Gemini API.

    Args:
        api_key: Gemini API key. Defaults to GEMINI_API_KEY env var.
        proxy: Proxy URL (e.g., "http://proxy.example.com:8080").
        custom_headers: Additional headers to include in requests.
        local_address: Local address to bind to (e.g., "0.0.0.0").

    Returns:
        OpenAI client configured for Gemini API.
    """
    api_key = api_key or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is required")

    # Build httpx client with optional proxy and transport settings
    http_client = None
    if proxy or local_address:
        transport_kwargs = {}
        if local_address:
            transport_kwargs["local_address"] = local_address

        client_kwargs = {}
        if proxy:
            client_kwargs["proxy"] = proxy
        if transport_kwargs:
            client_kwargs["transport"] = httpx.HTTPTransport(**transport_kwargs)

        http_client = DefaultHttpxClient(**client_kwargs)

    # Merge custom headers with defaults
    default_headers = custom_headers or {}

    return OpenAI(
        api_key=api_key,
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        default_headers=default_headers if default_headers else None,
        http_client=http_client,
    )


def chat_completion(
    client: OpenAI,
    messages: list[dict],
    model: str = "gemini-2.5-flash",
    **kwargs,
):
    """
    Send a chat completion request to Gemini.

    Args:
        client: OpenAI client instance.
        messages: List of message dicts with 'role' and 'content'.
        model: Model name (default: gemini-2.5-flash).
        **kwargs: Additional parameters for chat.completions.create.

    Returns:
        Chat completion response.
    """
    return client.chat.completions.create(
        model=model,
        messages=messages,
        **kwargs,
    )


if __name__ == "__main__":
    # Example usage
    client = create_gemini_client(
        # api_key="your-api-key",  # Or set GEMINI_API_KEY env var
        # proxy="http://my.proxy.example.com:8080",
        # custom_headers={"X-Custom-Header": "value"},
        # local_address="0.0.0.0",
    )

    response = chat_completion(
        client,
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Explain to me how AI works"},
        ],
    )

    print(response.choices[0].message.content)
