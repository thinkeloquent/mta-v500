"""
Request logging middleware.
"""

import time
import logging
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log all HTTP requests and responses.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process the request and log details.

        Args:
            request: Incoming request
            call_next: Next middleware/route handler

        Returns:
            Response from the route handler
        """
        # Start timer
        start_time = time.time()

        # Get client info
        client_host = request.client.host if request.client else "unknown"

        # Log request
        logger.info(
            f"Request: {request.method} {request.url.path} from {client_host}"
        )

        # Process request
        try:
            response = await call_next(request)
        except Exception as exc:
            # Log error and re-raise
            logger.error(
                f"Request failed: {request.method} {request.url.path} - {str(exc)}"
            )
            raise

        # Calculate duration
        duration = time.time() - start_time

        # Log response
        logger.info(
            f"Response: {request.method} {request.url.path} - "
            f"Status: {response.status_code} - "
            f"Duration: {duration:.3f}s"
        )

        # Add custom headers
        response.headers["X-Process-Time"] = str(duration)

        return response
