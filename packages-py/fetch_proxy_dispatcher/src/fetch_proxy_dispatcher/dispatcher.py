"""
Simple API for auto-detecting proxy configuration.

Provides convenience functions that automatically detect environment
and return appropriately configured HTTP clients.
"""
from typing import Optional, Dict, Any

import httpx

from .config import get_effective_proxy_url, is_dev
from .models import ProxyConfig, DispatcherResult
from .adapters.adapter_httpx import HttpxAdapter

# Default adapter instance
_default_adapter = HttpxAdapter()


def get_proxy_dispatcher(
    disable_tls: Optional[bool] = None,
    timeout: float = 30.0,
    async_client: bool = True,
) -> DispatcherResult:
    """
    Get appropriate httpx client for current environment.

    Automatically detects proxy configuration from environment variables
    and returns a configured client.

    Args:
        disable_tls: Force TLS disabled (default: auto based on APP_ENV).
                    If None, TLS is disabled only in DEV environment.
        timeout: Request timeout in seconds.
        async_client: If True return AsyncClient, else return sync Client.

    Returns:
        DispatcherResult containing:
        - client: Configured httpx.Client or httpx.AsyncClient
        - config: The ProxyConfig used
        - proxy_dict: Raw kwargs for manual client creation

    Example:
        >>> result = get_proxy_dispatcher()
        >>> async with result.client as client:
        ...     response = await client.get("https://api.example.com")
        >>> print(f"Used proxy: {result.config.proxy_url}")
    """
    proxy_url = get_effective_proxy_url()
    verify_ssl = not disable_tls if disable_tls is not None else not is_dev()

    config = ProxyConfig(
        proxy_url=proxy_url,
        verify_ssl=verify_ssl,
        timeout=timeout,
        trust_env=False,
    )

    if async_client:
        return _default_adapter.create_async_client(config)
    return _default_adapter.create_sync_client(config)


def get_proxy_config(
    timeout: float = 30.0,
    cert: Optional[Any] = None,
    ca_bundle: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Get proxy configuration as dict for custom httpx.Client creation.

    Use this when you need to create your own httpx client with
    custom options (http2, limits, etc.) but want the proxy/SSL
    configuration handled automatically.

    Note: verify defaults to False unless ca_bundle is provided.

    Args:
        timeout: Request timeout in seconds.
        cert: Client certificate path or (cert, key) tuple for proxy auth.
        ca_bundle: CA bundle path for SSL verification (sets verify to this path).

    Returns:
        Dictionary suitable for httpx.Client/AsyncClient constructor.

    Example:
        >>> config = get_proxy_config(cert="/path/to/client.crt")
        >>> with httpx.Client(**config, http2=True) as client:
        ...     response = client.post("https://api.example.com", json=data)
    """
    proxy_url = get_effective_proxy_url()

    config = ProxyConfig(
        proxy_url=proxy_url,
        verify_ssl=False,
        timeout=timeout,
        trust_env=False,
        cert=cert,
        ca_bundle=ca_bundle,
    )

    return _default_adapter.get_proxy_dict(config)


def get_async_client(
    disable_tls: Optional[bool] = None,
    timeout: float = 30.0,
) -> httpx.AsyncClient:
    """
    Get configured AsyncClient.

    Convenience function that returns just the client without the
    DispatcherResult wrapper.

    Args:
        disable_tls: Force TLS disabled (default: auto based on APP_ENV).
        timeout: Request timeout in seconds.

    Returns:
        Configured httpx.AsyncClient.

    Example:
        >>> async with get_async_client() as client:
        ...     response = await client.get("https://api.example.com")
    """
    result = get_proxy_dispatcher(
        disable_tls=disable_tls,
        timeout=timeout,
        async_client=True,
    )
    return result.client  # type: ignore


def get_sync_client(
    disable_tls: Optional[bool] = None,
    timeout: float = 30.0,
) -> httpx.Client:
    """
    Get configured sync Client.

    Convenience function that returns just the client without the
    DispatcherResult wrapper.

    Args:
        disable_tls: Force TLS disabled (default: auto based on APP_ENV).
        timeout: Request timeout in seconds.

    Returns:
        Configured httpx.Client.

    Example:
        >>> with get_sync_client() as client:
        ...     response = client.get("https://api.example.com")
    """
    result = get_proxy_dispatcher(
        disable_tls=disable_tls,
        timeout=timeout,
        async_client=False,
    )
    return result.client  # type: ignore


def get_request_kwargs(
    timeout: float = 30.0,
    ca_bundle: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Get kwargs dict for httpx top-level functions (get, post, put, delete, etc).

    Returns a dictionary that can be spread into httpx top-level function calls
    to apply proxy and SSL configuration based on environment auto-detection.

    Note: verify defaults to False unless ca_bundle is provided.
    Note: For client certificates (cert), use get_proxy_dispatcher() with the
          client pattern instead, as httpx top-level functions don't support cert.

    Args:
        timeout: Request timeout in seconds.
        ca_bundle: CA bundle path for SSL verification (sets verify to this path).

    Returns:
        Dictionary suitable for spreading into httpx.get(), httpx.post(), etc.

    Example:
        >>> kwargs = get_request_kwargs()
        >>> response = httpx.get("https://api.example.com", **kwargs)
        >>>
        >>> # With CA bundle for SSL verification
        >>> kwargs = get_request_kwargs(ca_bundle="/path/to/ca-bundle.crt")
    """
    proxy_url = get_effective_proxy_url()

    kwargs: Dict[str, Any] = {
        "timeout": timeout,
        "trust_env": False,
        "verify": ca_bundle if ca_bundle else False,
    }
    if proxy_url:
        kwargs["proxy"] = proxy_url

    return kwargs
