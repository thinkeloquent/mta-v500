"""
Health check and root endpoints.
"""
from datetime import datetime
from fastapi import APIRouter
from ..models import HealthResponse

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    description="Check if the API is running and healthy.",
    responses={
        200: {
            "description": "API is healthy",
            "content": {
                "application/json": {
                    "example": {
                        "status": "ok",
                        "timestamp": "2024-01-15T10:30:00Z",
                        "version": "1.0.0",
                    }
                }
            },
        }
    },
)
async def health_check() -> HealthResponse:
    """
    Health check endpoint.

    Returns:
        HealthResponse with status, timestamp, and version
    """
    return HealthResponse(
        status="ok",
        timestamp=datetime.utcnow().isoformat() + "Z",
        version="1.0.0",
    )


@router.get(
    "/",
    summary="API root",
    description="Get API information and available endpoints.",
    responses={
        200: {
            "description": "API information",
            "content": {
                "application/json": {
                    "example": {
                        "name": "AWS S3 Admin API",
                        "version": "1.0.0",
                        "description": "FastAPI backend for AWS S3 resource administration",
                        "docs": "/docs",
                        "redoc": "/redoc",
                    }
                }
            },
        }
    },
)
async def root() -> dict:
    """
    Root endpoint with API information.

    Returns:
        Dict with API details
    """
    return {
        "name": "AWS S3 Admin API",
        "version": "1.0.0",
        "description": "FastAPI backend for AWS S3 resource administration",
        "docs": "/docs",
        "redoc": "/redoc",
    }
