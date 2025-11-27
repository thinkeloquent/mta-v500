"""
Shared async HTTP client for Jira API with rate limiting and retry logic.
"""
import asyncio
import ssl
import time
from typing import Any, Dict, Optional, List, Union
from urllib.parse import urljoin

import httpx
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)


class TokenBucket:
    """Token bucket algorithm for rate limiting."""

    def __init__(self, rate: float, capacity: float):
        """
        Initialize token bucket.

        Args:
            rate: Tokens per second
            capacity: Maximum tokens in bucket
        """
        self.rate = rate
        self.capacity = capacity
        self.tokens = capacity
        self.last_update = time.monotonic()
        self._lock = asyncio.Lock()

    async def consume(self, tokens: float = 1.0) -> None:
        """Consume tokens from the bucket, waiting if necessary."""
        async with self._lock:
            while True:
                now = time.monotonic()
                elapsed = now - self.last_update
                self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
                self.last_update = now

                if self.tokens >= tokens:
                    self.tokens -= tokens
                    return

                # Wait for tokens to replenish
                wait_time = (tokens - self.tokens) / self.rate
                await asyncio.sleep(wait_time)


class JiraHttpClient:
    """
    Shared async HTTP client for Jira API.

    Features:
    - Rate limiting with token bucket algorithm
    - Automatic retries with exponential backoff
    - Request statistics tracking
    - Proper error handling and conversion
    - Basic authentication with email + API token
    """

    def __init__(
        self,
        base_url: str,
        email: str,
        api_token: str,
        rate_limit: float = 10.0,  # 10 requests per second
        rate_capacity: float = 20.0,  # burst capacity
        max_retries: int = 3,
        timeout: float = 30.0,
        proxies: Optional[Union[str, Dict[str, Any]]] = None,
        trust_env: bool = True,
        verify: Union[str, bool, ssl.SSLContext] = True,
    ):
        """
        Initialize Jira HTTP client.

        Args:
            base_url: Base URL of Jira instance (e.g., https://company.atlassian.net)
            email: Email address for authentication
            api_token: Jira API token
            rate_limit: Requests per second
            rate_capacity: Maximum burst capacity
            max_retries: Maximum retry attempts
            timeout: Request timeout in seconds
            proxies: Proxy configuration (string, dict, or httpx.Proxy object)
                Examples:
                - "http://proxy.example.com:8080"
                - {"https://": "http://user:pass@proxy.example.com:8080"}
                - {"all://": httpx.Proxy(url="http://proxy.example.com:8080")}
            trust_env: Whether to use HTTP_PROXY/HTTPS_PROXY environment variables (default: True)
            verify: SSL certificate verification. Can be:
                - True (default): Verify with system CA bundle
                - False: Disable verification (not recommended)
                - Path to CA bundle file (e.g., "/path/to/corporate-ca.crt")
                - ssl.SSLContext object
        """
        # Normalize base URL
        if not base_url.startswith(("http://", "https://")):
            raise ValueError("Base URL must start with http:// or https://")

        if not base_url.endswith("/"):
            base_url += "/"

        self.base_url = urljoin(base_url, "rest/api/3/")
        self.email = email
        self.api_token = api_token
        self.max_retries = max_retries
        self.timeout = timeout
        self.proxies = proxies
        self.trust_env = trust_env
        self.verify = verify

        self._client: Optional[httpx.AsyncClient] = None
        self._rate_limiter = TokenBucket(rate=rate_limit, capacity=rate_capacity)

        # Statistics
        self.stats = {
            "requests": 0,
            "errors": 0,
            "retries": 0,
            "rate_limited": 0,
        }

    async def __aenter__(self) -> "JiraHttpClient":
        """Async context manager entry."""
        self._client = httpx.AsyncClient(
            auth=(self.email, self.api_token),
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            timeout=httpx.Timeout(self.timeout),
            follow_redirects=True,
            proxy=self.proxies,
            trust_env=self.trust_env,
            verify=self.verify,
        )
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        """Async context manager exit."""
        if self._client:
            await self._client.aclose()

    def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None:
            raise RuntimeError(
                "Client not initialized. Use 'async with JiraHttpClient(...) as client:'"
            )
        return self._client

    async def _make_request(
        self,
        method: str,
        endpoint: str,
        **kwargs: Any,
    ) -> httpx.Response:
        """Make HTTP request with rate limiting."""
        # Apply rate limiting
        await self._rate_limiter.consume()

        client = self._get_client()
        url = urljoin(self.base_url, endpoint.lstrip("/"))

        self.stats["requests"] += 1

        response = await client.request(method, url, **kwargs)

        # Handle rate limiting
        if response.status_code == 429:
            self.stats["rate_limited"] += 1
            retry_after = int(response.headers.get("Retry-After", "60"))
            await asyncio.sleep(retry_after)
            raise httpx.HTTPStatusError(
                "Rate limited", request=response.request, response=response
            )

        return response

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.RequestError)),
    )
    async def get(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """
        Make GET request.

        Args:
            endpoint: API endpoint (e.g., 'issue/PROJ-123')
            params: Query parameters
            **kwargs: Additional request arguments

        Returns:
            JSON response as dict

        Raises:
            Various Jira API exceptions
        """
        try:
            response = await self._make_request(
                "GET", endpoint, params=params, **kwargs
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            self.stats["errors"] += 1
            raise

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.RequestError)),
    )
    async def post(
        self,
        endpoint: str,
        json: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """
        Make POST request.

        Args:
            endpoint: API endpoint
            json: JSON body
            **kwargs: Additional request arguments

        Returns:
            JSON response as dict
        """
        try:
            response = await self._make_request("POST", endpoint, json=json, **kwargs)
            response.raise_for_status()

            # Some POST endpoints return empty responses
            if response.content:
                return response.json()
            return {"status": "success"}
        except Exception as e:
            self.stats["errors"] += 1
            raise

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.RequestError)),
    )
    async def put(
        self,
        endpoint: str,
        json: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Make PUT request."""
        try:
            response = await self._make_request("PUT", endpoint, json=json, **kwargs)
            response.raise_for_status()

            # Some PUT endpoints return empty responses
            if response.content:
                return response.json()
            return {"status": "success"}
        except Exception as e:
            self.stats["errors"] += 1
            raise

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type((httpx.HTTPStatusError, httpx.RequestError)),
    )
    async def delete(
        self,
        endpoint: str,
        **kwargs: Any,
    ) -> Dict[str, Any]:
        """Make DELETE request."""
        try:
            response = await self._make_request("DELETE", endpoint, **kwargs)
            response.raise_for_status()

            # Some DELETE endpoints return empty responses
            if response.content:
                return response.json()
            return {"status": "success"}
        except Exception as e:
            self.stats["errors"] += 1
            raise

    def get_stats(self) -> Dict[str, int]:
        """Get request statistics."""
        return self.stats.copy()
