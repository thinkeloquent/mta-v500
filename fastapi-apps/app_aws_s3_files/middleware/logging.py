"""
Enhanced logging middleware with correlation IDs.
"""
import logging
import time
import uuid
from typing import Callable
from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add correlation IDs and request/response logging.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Log request and response with correlation ID.

        Args:
            request: Request instance
            call_next: Next middleware/handler

        Returns:
            Response
        """
        # Generate correlation ID
        correlation_id = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())

        # Add correlation ID to request state
        request.state.correlation_id = correlation_id

        # Start timer
        start_time = time.time()

        # Log request
        logger.info(
            f"Request started",
            extra={
                "correlation_id": correlation_id,
                "method": request.method,
                "path": request.url.path,
                "client_ip": request.client.host if request.client else "unknown",
            },
        )

        # Process request
        try:
            response = await call_next(request)

            # Calculate duration
            duration_ms = (time.time() - start_time) * 1000

            # Log response
            logger.info(
                f"Request completed",
                extra={
                    "correlation_id": correlation_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration_ms": round(duration_ms, 2),
                },
            )

            # Add correlation ID to response headers
            response.headers["X-Correlation-ID"] = correlation_id

            return response

        except Exception as e:
            # Calculate duration
            duration_ms = (time.time() - start_time) * 1000

            # Log error
            logger.error(
                f"Request failed",
                extra={
                    "correlation_id": correlation_id,
                    "method": request.method,
                    "path": request.url.path,
                    "error": str(e),
                    "duration_ms": round(duration_ms, 2),
                },
                exc_info=True,
            )

            raise


def setup_logging_middleware(app: FastAPI) -> None:
    """
    Configure logging middleware.

    Args:
        app: FastAPI application instance
    """
    app.add_middleware(LoggingMiddleware)
