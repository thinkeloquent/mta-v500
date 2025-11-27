"""
Health check API routes.
"""

from typing import Dict, Any
from datetime import datetime

from fastapi import APIRouter, status

from app.config import settings

router = APIRouter()


@router.get("", status_code=status.HTTP_200_OK)
async def health_check():
    """
    Basic health check endpoint.

    Returns:
        Simple status response
    """
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
    }


@router.get("/detailed", status_code=status.HTTP_200_OK)
async def detailed_health_check():
    """
    Detailed health check with service status.

    Returns:
        Detailed health status for all services
    """
    # Check which AI providers are configured
    configured_providers = []
    if settings.OPENAI_API_KEY:
        configured_providers.append("openai")
    if settings.GOOGLE_GENERATIVE_AI_API_KEY:
        configured_providers.append("google")
    if settings.ANTHROPIC_API_KEY:
        configured_providers.append("anthropic")

    health_status: Dict[str, Any] = {
        "status": "healthy" if configured_providers else "degraded",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "ai_providers": {
                "status": "healthy" if configured_providers else "unhealthy",
                "configured": configured_providers,
                "default_model": settings.DEFAULT_CHAT_MODEL,
                "message": (
                    f"Configured providers: {', '.join(configured_providers)}"
                    if configured_providers
                    else "No AI providers configured"
                ),
            }
        },
    }

    return health_status
