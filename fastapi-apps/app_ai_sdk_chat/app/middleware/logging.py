"""
Logging middleware for request/response tracking.
"""

import time
import logging
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log request and response information.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request and log timing information.

        Args:
            request: Incoming request
            call_next: Next middleware or route handler

        Returns:
            Response from the route handler
        """
        start_time = time.time()

        # Process request
        response = await call_next(request)

        # Calculate processing time
        process_time = time.time() - start_time

        # Log request information
        logger.info(
            f"{request.method} {request.url.path} "
            f"- Status: {response.status_code} "
            f"- Time: {process_time:.3f}s"
        )

        # Add processing time header
        response.headers["X-Process-Time"] = str(process_time)

        return response
