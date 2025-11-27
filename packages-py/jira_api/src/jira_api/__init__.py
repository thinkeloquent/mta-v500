"""
Unified Jira API Python SDK

A simplified, async-first SDK for the Jira API optimized for modern Python applications.

Example usage:
    >>> import os
    >>> from jira_api import JiraAPI
    >>>
    >>> async with JiraAPI(
    >>>     base_url="https://company.atlassian.net",
    >>>     email="user@company.com",
    >>>     api_token=os.environ['JIRA_API_TOKEN']
    >>> ) as jira:
    >>>     # Get issue
    >>>     issue = await jira.issues.get("PROJ-123")
    >>>
    >>>     # Create issue
    >>>     new_issue = await jira.issues.create(IssueCreate(
    >>>         project_key="PROJ",
    >>>         summary="Bug in system",
    >>>         issue_type="Bug"
    >>>     ))
    >>>
    >>>     # Search users
    >>>     users = await jira.users.search("developer")
"""
import os
import ssl
from typing import Any, Dict, Optional, Union

from jira_api.client import JiraHttpClient, TokenBucket
from jira_api.exceptions import (
    JiraAPIError,
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
from jira_api.issues import IssuesAPI
from jira_api.projects import ProjectsAPI
from jira_api.users import UsersAPI


class JiraAPI:
    """
    Unified Jira API client.

    Provides simplified access to all Jira API endpoints through a single interface.

    Features:
    - Async/await support for modern Python applications
    - Automatic rate limiting with token bucket algorithm
    - Retry logic with exponential backoff
    - Type hints and Pydantic models for all responses
    - Unified error handling
    - Built-in proxy support

    Usage:
        >>> import os
        >>> from jira_api import JiraAPI
        >>>
        >>> # Using context manager (recommended)
        >>> async with JiraAPI(
        >>>     base_url="https://company.atlassian.net",
        >>>     email="user@company.com",
        >>>     api_token=os.environ['JIRA_API_TOKEN']
        >>> ) as jira:
        >>>     issue = await jira.issues.get("PROJ-123")
        >>>     projects = await jira.projects.list()
        >>>
        >>> # Or manual initialization/cleanup
        >>> jira = JiraAPI(
        >>>     base_url="https://company.atlassian.net",
        >>>     email="user@company.com",
        >>>     api_token=os.environ['JIRA_API_TOKEN']
        >>> )
        >>> await jira.connect()
        >>> issue = await jira.issues.get("PROJ-123")
        >>> await jira.close()

    API Modules:
        - issues: Issue operations (get, create, update, delete, transitions, comments)
        - projects: Project operations (get, list, versions, components)
        - users: User operations (get, search, find assignable users)
    """

    def __init__(
        self,
        base_url: str,
        email: str,
        api_token: Optional[str] = None,
        rate_limit: float = 10.0,
        rate_capacity: float = 20.0,
        max_retries: int = 3,
        timeout: float = 30.0,
        proxies: Optional[Union[str, Dict[str, Any]]] = None,
        trust_env: bool = True,
        verify: Union[str, bool, ssl.SSLContext] = True,
    ):
        """
        Initialize Jira API client.

        Args:
            base_url: Base URL of Jira instance (e.g., https://company.atlassian.net)
            email: Email address for authentication
            api_token: Jira API token (defaults to JIRA_API_TOKEN env var)
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
            ValueError: If api_token is not provided and JIRA_API_TOKEN env var is not set
        """
        # Get token from env if not provided
        if api_token is None:
            api_token = os.environ.get("JIRA_API_TOKEN")
            if not api_token:
                raise ValueError(
                    "Jira API token is required. "
                    "Provide via api_token parameter or JIRA_API_TOKEN environment variable."
                )

        # Initialize HTTP client
        self._client = JiraHttpClient(
            base_url=base_url,
            email=email,
            api_token=api_token,
            rate_limit=rate_limit,
            rate_capacity=rate_capacity,
            max_retries=max_retries,
            timeout=timeout,
            proxies=proxies,
            trust_env=trust_env,
            verify=verify,
        )

        # Initialize API modules
        self.issues = IssuesAPI(self._client)
        self.projects = ProjectsAPI(self._client)
        self.users = UsersAPI(self._client)

    async def __aenter__(self) -> "JiraAPI":
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
    "JiraAPI",
    # Exceptions
    "JiraAPIError",
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
    "IssuesAPI",
    "ProjectsAPI",
    "UsersAPI",
]
