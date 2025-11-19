"""
Unified Figma API Python SDK

A simplified, async-first SDK for the Figma API optimized for FastAPI integration.

Example usage:
    >>> import os
    >>> from figma_api import FigmaAPI
    >>>
    >>> async with FigmaAPI(token=os.environ['FIGMA_TOKEN']) as api:
    >>>     # Get file
    >>>     file = await api.files.get("file_key")
    >>>
    >>>     # List comments
    >>>     comments = await api.comments.list("file_key")
    >>>
    >>>     # Get components
    >>>     component = await api.components.get("component_key")
    >>>
    >>>     # And more...
"""
import os
import ssl
from typing import Any, Dict, Optional, Union

from .client import FigmaHttpClient, TokenBucket
from .exceptions import (
    FigmaAPIError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ValidationError,
    ConflictError,
    ServerError,
    NetworkError,
    TimeoutError,
)

# Import all API modules
from .files import FilesAPI
from .comments import CommentsAPI
from .components import ComponentsAPI
from .projects import ProjectsAPI
from .variables import VariablesAPI
from .webhooks import WebhooksAPI
from .dev_resources import DevResourcesAPI
from .library_analytics import LibraryAnalyticsAPI


class FigmaAPI:
    """
    Unified Figma API client.

    Provides simplified access to all Figma API endpoints through a single interface.

    Features:
    - Async/await support for FastAPI integration
    - Automatic rate limiting with token bucket algorithm
    - Retry logic with exponential backoff
    - Type hints and Pydantic models for all responses
    - Unified error handling

    Usage:
        >>> import os
        >>> from figma_api import FigmaAPI
        >>>
        >>> # Using context manager (recommended)
        >>> async with FigmaAPI(token=os.environ['FIGMA_TOKEN']) as api:
        >>>     file = await api.files.get("file_key")
        >>>     comments = await api.comments.list("file_key")
        >>>
        >>> # Or manual initialization/cleanup
        >>> api = FigmaAPI(token=os.environ['FIGMA_TOKEN'])
        >>> await api.connect()
        >>> file = await api.files.get("file_key")
        >>> await api.close()

    API Modules:
        - files: File operations (get, get_nodes, get_images, etc.)
        - comments: Comment operations (list, create, delete, reactions)
        - components: Component operations (get, get_set, get_team_components)
        - projects: Project operations (list_team_projects, get_files)
        - variables: Variable operations (get_local, get_published)
        - webhooks: Webhook operations (create, list, update, delete)
        - dev_resources: Dev resource operations (list, create, update, delete)
        - library_analytics: Analytics operations (get_component_usage)
    """

    def __init__(
        self,
        token: Optional[str] = None,
        rate_limit: float = 10.0,
        rate_capacity: float = 20.0,
        max_retries: int = 3,
        timeout: float = 30.0,
        proxies: Optional[Union[str, Dict[str, Any]]] = None,
        trust_env: bool = True,
        verify: Union[str, bool, ssl.SSLContext] = True,
    ):
        """
        Initialize Figma API client.

        Args:
            token: Figma API token (defaults to FIGMA_TOKEN env var)
            rate_limit: Requests per second (default 10)
            rate_capacity: Maximum burst capacity (default 20)
            max_retries: Maximum retry attempts (default 3)
            timeout: Request timeout in seconds (default 30)
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

        Raises:
            ValueError: If token is not provided and FIGMA_TOKEN env var is not set
        """
        # Get token from env if not provided
        if token is None:
            token = os.environ.get("FIGMA_TOKEN")
            if not token:
                raise ValueError(
                    "Figma API token is required. "
                    "Provide via token parameter or FIGMA_TOKEN environment variable."
                )

        # Initialize HTTP client
        self._client = FigmaHttpClient(
            token=token,
            rate_limit=rate_limit,
            rate_capacity=rate_capacity,
            max_retries=max_retries,
            timeout=timeout,
            proxies=proxies,
            trust_env=trust_env,
            verify=verify,
        )

        # Initialize API modules
        self.files = FilesAPI(self._client)
        self.comments = CommentsAPI(self._client)
        self.components = ComponentsAPI(self._client)
        self.projects = ProjectsAPI(self._client)
        self.variables = VariablesAPI(self._client)
        self.webhooks = WebhooksAPI(self._client)
        self.dev_resources = DevResourcesAPI(self._client)
        self.library_analytics = LibraryAnalyticsAPI(self._client)

    async def __aenter__(self) -> "FigmaAPI":
        """Async context manager entry."""
        await self._client.__aenter__()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Async context manager exit."""
        await self._client.__aexit__(exc_type, exc_val, exc_tb)

    async def connect(self) -> None:
        """
        Manually initialize the client.

        Use this if not using the context manager.
        Remember to call close() when done.
        """
        await self._client.__aenter__()

    async def close(self) -> None:
        """
        Manually close the client.

        Use this if not using the context manager.
        """
        await self._client.__aexit__(None, None, None)

    def get_stats(self):
        """
        Get request statistics.

        Returns:
            Dict with stats: requests, errors, retries, rate_limited
        """
        return self._client.get_stats()


__version__ = "1.0.0"

__all__ = [
    # Main API
    "FigmaAPI",
    # Exceptions
    "FigmaAPIError",
    "AuthenticationError",
    "AuthorizationError",
    "NotFoundError",
    "RateLimitError",
    "ValidationError",
    "ConflictError",
    "ServerError",
    "NetworkError",
    "TimeoutError",
    # API modules (for type hints)
    "FilesAPI",
    "CommentsAPI",
    "ComponentsAPI",
    "ProjectsAPI",
    "VariablesAPI",
    "WebhooksAPI",
    "DevResourcesAPI",
    "LibraryAnalyticsAPI",
]
