"""
Unified exception hierarchy for Figma API.
"""
from typing import Optional, Any, Dict


class FigmaAPIError(Exception):
    """Base exception for all Figma API errors."""

    def __init__(
        self,
        message: str,
        status_code: Optional[int] = None,
        response: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.status_code = status_code
        self.response = response
        super().__init__(self.message)

    def __str__(self) -> str:
        if self.status_code:
            return f"[{self.status_code}] {self.message}"
        return self.message


class AuthenticationError(FigmaAPIError):
    """
    Authentication failed (401).
    Token is missing, invalid, or expired.
    """

    def __init__(self, message: str = "Authentication failed. Check your FIGMA_TOKEN.", **kwargs: Any):
        super().__init__(message, status_code=401, **kwargs)


class AuthorizationError(FigmaAPIError):
    """
    Authorization failed (403).
    Token doesn't have required permissions.
    """

    def __init__(self, message: str = "Permission denied. Token lacks required access.", **kwargs: Any):
        super().__init__(message, status_code=403, **kwargs)


class NotFoundError(FigmaAPIError):
    """
    Resource not found (404).
    File, project, comment, or other resource doesn't exist or is not accessible.
    """

    def __init__(self, message: str = "Resource not found.", **kwargs: Any):
        super().__init__(message, status_code=404, **kwargs)


class RateLimitError(FigmaAPIError):
    """
    Rate limit exceeded (429).
    Too many requests in a given time period.
    """

    def __init__(
        self,
        message: str = "Rate limit exceeded.",
        retry_after: Optional[int] = None,
        **kwargs: Any,
    ):
        super().__init__(message, status_code=429, **kwargs)
        self.retry_after = retry_after

    def __str__(self) -> str:
        base = super().__str__()
        if self.retry_after:
            return f"{base} Retry after {self.retry_after} seconds."
        return base


class ValidationError(FigmaAPIError):
    """
    Request validation failed (400, 422).
    Invalid parameters, missing required fields, or malformed data.
    """

    def __init__(
        self,
        message: str = "Validation error.",
        errors: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ):
        super().__init__(message, **kwargs)
        self.errors = errors or {}

    def __str__(self) -> str:
        base = super().__str__()
        if self.errors:
            error_details = ", ".join(f"{k}: {v}" for k, v in self.errors.items())
            return f"{base} Details: {error_details}"
        return base


class ConflictError(FigmaAPIError):
    """
    Conflict error (409).
    Resource state conflict, duplicate resources, etc.
    """

    def __init__(self, message: str = "Resource conflict.", **kwargs: Any):
        super().__init__(message, status_code=409, **kwargs)


class ServerError(FigmaAPIError):
    """
    Server error (500, 502, 503, 504).
    Figma API internal errors.
    """

    def __init__(self, message: str = "Figma API server error.", **kwargs: Any):
        super().__init__(message, **kwargs)


class NetworkError(FigmaAPIError):
    """
    Network-related errors.
    Connection failures, timeouts, DNS errors, etc.
    """

    def __init__(self, message: str = "Network error occurred.", **kwargs: Any):
        super().__init__(message, **kwargs)


class TimeoutError(FigmaAPIError):
    """
    Request timeout.
    Request took too long to complete.
    """

    def __init__(self, message: str = "Request timed out.", **kwargs: Any):
        super().__init__(message, **kwargs)


def map_http_error(status_code: int, message: str, response: Optional[Dict[str, Any]] = None) -> FigmaAPIError:
    """
    Map HTTP status code to appropriate exception.

    Args:
        status_code: HTTP status code
        message: Error message
        response: Optional response data

    Returns:
        Appropriate FigmaAPIError subclass
    """
    error_map = {
        400: ValidationError,
        401: AuthenticationError,
        403: AuthorizationError,
        404: NotFoundError,
        409: ConflictError,
        422: ValidationError,
        429: RateLimitError,
        500: ServerError,
        502: ServerError,
        503: ServerError,
        504: ServerError,
    }

    error_class = error_map.get(status_code, FigmaAPIError)

    # Extract retry-after for rate limits
    if status_code == 429 and response:
        retry_after = response.get("retry_after")
        return RateLimitError(message, retry_after=retry_after, response=response)

    # Extract validation errors
    if status_code in (400, 422) and response:
        errors = response.get("errors") or response.get("error")
        return ValidationError(message, errors=errors, response=response)

    return error_class(message, status_code=status_code, response=response)
