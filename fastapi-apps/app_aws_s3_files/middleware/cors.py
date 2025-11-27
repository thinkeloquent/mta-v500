"""
CORS middleware configuration.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from ..config.settings import settings


def setup_cors(app: FastAPI) -> None:
    """
    Configure CORS middleware for the FastAPI application.

    Args:
        app: FastAPI application instance
    """
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,  # List of allowed origins
        allow_credentials=settings.cors_allow_credentials,
        allow_methods=["GET", "POST", "DELETE", "PUT", "PATCH", "OPTIONS"],
        allow_headers=[
            "Content-Type",
            "Authorization",
            "Accept",
            "Origin",
            "X-Requested-With",
            "X-Correlation-ID",
        ],
        expose_headers=["Content-Length", "X-Correlation-ID"],
        max_age=3600,  # Cache preflight requests for 1 hour
    )
