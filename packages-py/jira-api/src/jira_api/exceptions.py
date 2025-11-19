"""Custom exceptions for Jira API operations."""

from typing import Any, Dict, Optional


class JiraAPIError(Exception):
    """Base exception for all Jira API errors."""

    def __init__(
        self,
        message: str,
        status_code: Optional[int] = None,
        response_data: Optional[Dict[str, Any]] = None,
    ):
        """
        Initialize JiraAPIError.

        Args:
            message: Error message
            status_code: HTTP status code if applicable
            response_data: Response data from API if available
        """
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.response_data = response_data or {}

    def __str__(self) -> str:
        """Return string representation of the error."""
        if self.status_code:
            return f"Jira API Error ({self.status_code}): {self.message}"
        return f"Jira API Error: {self.message}"


class AuthenticationError(JiraAPIError):
    """Exception raised for authentication failures (401)."""

    def __init__(self, message: str = "Authentication failed"):
        """Initialize AuthenticationError."""
        super().__init__(message, status_code=401)


class AuthorizationError(JiraAPIError):
    """Exception raised for authorization/permission failures (403)."""

    def __init__(self, message: str = "Insufficient permissions"):
        """Initialize AuthorizationError."""
        super().__init__(message, status_code=403)


class NotFoundError(JiraAPIError):
    """Exception raised when a resource is not found (404)."""

    def __init__(self, message: str = "Resource not found"):
        """Initialize NotFoundError."""
        super().__init__(message, status_code=404)


class ValidationError(JiraAPIError):
    """Exception raised for validation failures (400)."""

    def __init__(self, message: str = "Validation failed", errors: Optional[Dict[str, Any]] = None):
        """Initialize ValidationError."""
        super().__init__(message, status_code=400)
        self.errors = errors or {}


class RateLimitError(JiraAPIError):
    """Exception raised when rate limit is exceeded (429)."""

    def __init__(self, message: str = "Rate limit exceeded", retry_after: Optional[int] = None):
        """Initialize RateLimitError."""
        super().__init__(message, status_code=429)
        self.retry_after = retry_after


class ConflictError(JiraAPIError):
    """Exception raised for conflict errors (409)."""

    def __init__(self, message: str = "Resource conflict"):
        """Initialize ConflictError."""
        super().__init__(message, status_code=409)


class ServerError(JiraAPIError):
    """Exception raised for server-side errors (5xx)."""

    def __init__(self, message: str = "Internal server error", status_code: int = 500):
        """Initialize ServerError."""
        super().__init__(message, status_code=status_code)


class NetworkError(JiraAPIError):
    """Exception raised for network-related errors."""

    def __init__(self, message: str = "Network error occurred"):
        """Initialize NetworkError."""
        super().__init__(message)


class TimeoutError(JiraAPIError):
    """Exception raised when a request times out."""

    def __init__(self, message: str = "Request timed out"):
        """Initialize TimeoutError."""
        super().__init__(message)
