"""
Rate limiting middleware using SlowAPI.
"""
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from ..config.settings import settings


# Create limiter instance
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.rate_limit_per_minute}/minute"],
    storage_uri="memory://",
)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """
    Custom handler for rate limit exceeded errors.

    Args:
        request: Request instance
        exc: RateLimitExceeded exception

    Returns:
        JSONResponse with rate limit error
    """
    retry_after = exc.retry_after if hasattr(exc, "retry_after") else 60

    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "success": False,
            "message": "Rate limit exceeded. Too many requests.",
            "code": "RATE_LIMIT_EXCEEDED",
            "retryAfter": int(retry_after),
        },
        headers={"Retry-After": str(int(retry_after))},
    )


def setup_rate_limiting(app: FastAPI) -> None:
    """
    Configure rate limiting for the FastAPI application.

    Args:
        app: FastAPI application instance
    """
    # Add limiter to app state
    app.state.limiter = limiter

    # Add exception handler
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
