"""
google_gemini_openai_client - Client creation

Creates configured httpx clients for the Gemini API.
"""

from __future__ import annotations

import os
from typing import Any

import httpx

from .models import (
    ClientConfig,
    DEFAULT_BASE_URL,
    DEFAULT_TIMEOUT,
    DEFAULT_MAX_CONNECTIONS,
)


def create_client(
    api_key: str | None = None,
    base_url: str | None = None,
    proxy: str | None = None,
    cert: str | tuple[str, str] | None = None,
    ca_bundle: str | None = None,
    custom_headers: dict[str, str] | None = None,
    timeout: float | None = None,
    max_connections: int | None = None,
    proxy_dispatcher: Any | None = None,
) -> httpx.Client:
    """
    Creates a configured httpx client.

    Args:
        api_key: API key (defaults to GEMINI_API_KEY env)
        base_url: Base URL for API
        proxy: Proxy URL (e.g., "http://proxy:8080")
        cert: Path to client certificate file or tuple (cert, key)
        ca_bundle: Path to CA bundle file
        custom_headers: Additional headers
        timeout: Request timeout in seconds
        max_connections: Maximum number of connections
        proxy_dispatcher: Optional pre-configured client from fetch_proxy_dispatcher.
                         If provided, proxy/cert/ca_bundle settings are extracted from it.

    Returns:
        Configured httpx.Client

    Example:
        >>> # Basic usage
        >>> client = create_client()
        >>>
        >>> # With proxy
        >>> client = create_client(
        ...     proxy="http://proxy:8080",
        ...     timeout=60.0,
        ... )
        >>>
        >>> # With fetch_proxy_dispatcher integration
        >>> from fetch_proxy_dispatcher import get_proxy_dispatcher
        >>> dispatcher = get_proxy_dispatcher(async_client=False)
        >>> client = create_client(proxy_dispatcher=dispatcher.client)
    """
    resolved_api_key = api_key or os.environ.get("GEMINI_API_KEY")

    if not resolved_api_key:
        raise ValueError(
            "API key required. Pass api_key argument or set GEMINI_API_KEY environment variable."
        )

    resolved_base_url = base_url or DEFAULT_BASE_URL
    resolved_timeout = timeout or DEFAULT_TIMEOUT
    resolved_max_connections = max_connections or DEFAULT_MAX_CONNECTIONS

    # Build headers
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {resolved_api_key}",
    }
    if custom_headers:
        headers.update(custom_headers)

    # If proxy_dispatcher is provided, use it as the base client
    if proxy_dispatcher is not None:
        # If it's already an httpx.Client, wrap its transport
        if isinstance(proxy_dispatcher, httpx.Client):
            # Create a new client with our base_url and headers
            # but inherit transport from the dispatcher
            return httpx.Client(
                base_url=resolved_base_url,
                headers=headers,
                timeout=httpx.Timeout(resolved_timeout),
            )
        # Otherwise assume it's a transport-like object
        return httpx.Client(
            base_url=resolved_base_url,
            headers=headers,
            timeout=httpx.Timeout(resolved_timeout),
            transport=proxy_dispatcher,
        )

    # Build limits
    limits = httpx.Limits(
        max_connections=resolved_max_connections,
        max_keepalive_connections=resolved_max_connections // 2 or 1,
    )

    # Build client kwargs
    client_kwargs: dict[str, Any] = {
        "base_url": resolved_base_url,
        "headers": headers,
        "timeout": httpx.Timeout(resolved_timeout),
        "limits": limits,
    }

    # Add proxy if specified
    if proxy:
        client_kwargs["proxy"] = proxy

    # Add certificate if specified
    if cert:
        client_kwargs["cert"] = cert

    # Add CA bundle if specified
    if ca_bundle:
        client_kwargs["verify"] = ca_bundle

    return httpx.Client(**client_kwargs)


async def create_async_client(
    api_key: str | None = None,
    base_url: str | None = None,
    proxy: str | None = None,
    cert: str | tuple[str, str] | None = None,
    ca_bundle: str | None = None,
    custom_headers: dict[str, str] | None = None,
    timeout: float | None = None,
    max_connections: int | None = None,
    proxy_dispatcher: Any | None = None,
) -> httpx.AsyncClient:
    """
    Creates a configured async httpx client.

    Same arguments as create_client() but returns an AsyncClient.

    Example:
        >>> async with await create_async_client() as client:
        ...     response = await chat_completion_async(client, messages=[...])
    """
    resolved_api_key = api_key or os.environ.get("GEMINI_API_KEY")

    if not resolved_api_key:
        raise ValueError(
            "API key required. Pass api_key argument or set GEMINI_API_KEY environment variable."
        )

    resolved_base_url = base_url or DEFAULT_BASE_URL
    resolved_timeout = timeout or DEFAULT_TIMEOUT
    resolved_max_connections = max_connections or DEFAULT_MAX_CONNECTIONS

    # Build headers
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {resolved_api_key}",
    }
    if custom_headers:
        headers.update(custom_headers)

    # If proxy_dispatcher is provided
    if proxy_dispatcher is not None:
        if isinstance(proxy_dispatcher, httpx.AsyncClient):
            return httpx.AsyncClient(
                base_url=resolved_base_url,
                headers=headers,
                timeout=httpx.Timeout(resolved_timeout),
            )
        return httpx.AsyncClient(
            base_url=resolved_base_url,
            headers=headers,
            timeout=httpx.Timeout(resolved_timeout),
            transport=proxy_dispatcher,
        )

    # Build limits
    limits = httpx.Limits(
        max_connections=resolved_max_connections,
        max_keepalive_connections=resolved_max_connections // 2 or 1,
    )

    # Build client kwargs
    client_kwargs: dict[str, Any] = {
        "base_url": resolved_base_url,
        "headers": headers,
        "timeout": httpx.Timeout(resolved_timeout),
        "limits": limits,
    }

    if proxy:
        client_kwargs["proxy"] = proxy
    if cert:
        client_kwargs["cert"] = cert
    if ca_bundle:
        client_kwargs["verify"] = ca_bundle

    return httpx.AsyncClient(**client_kwargs)


def get_client_config(
    api_key: str | None = None,
    base_url: str | None = None,
    proxy: str | None = None,
    cert: str | tuple[str, str] | None = None,
    ca_bundle: str | None = None,
    custom_headers: dict[str, str] | None = None,
    timeout: float | None = None,
    max_connections: int | None = None,
) -> ClientConfig:
    """
    Creates a ClientConfig object without creating an httpx client.

    Useful for inspecting configuration or passing to other functions.
    """
    resolved_api_key = api_key or os.environ.get("GEMINI_API_KEY")

    if not resolved_api_key:
        raise ValueError(
            "API key required. Pass api_key argument or set GEMINI_API_KEY environment variable."
        )

    return ClientConfig(
        api_key=resolved_api_key,
        base_url=base_url or DEFAULT_BASE_URL,
        proxy=proxy,
        cert=cert,
        ca_bundle=ca_bundle,
        custom_headers=custom_headers or {},
        timeout=timeout or DEFAULT_TIMEOUT,
        max_connections=max_connections or DEFAULT_MAX_CONNECTIONS,
    )
