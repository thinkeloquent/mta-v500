"""
Health check API routes.
"""

from typing import Dict, Any
from datetime import datetime

from fastapi import APIRouter, Depends, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.redis_service import redis_service

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
async def detailed_health_check(db: AsyncSession = Depends(get_db)):
    """
    Detailed health check with service status.

    Checks:
    - Database connectivity
    - Redis connectivity
    - API service status

    Args:
        db: Database session

    Returns:
        Detailed health status for all services
    """
    health_status: Dict[str, Any] = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {},
    }

    # Check database
    try:
        result = await db.execute(text("SELECT 1"))
        result.scalar()
        health_status["services"]["database"] = {
            "status": "healthy",
            "message": "Database connection successful",
        }
    except Exception as e:
        health_status["status"] = "degraded"
        health_status["services"]["database"] = {
            "status": "unhealthy",
            "message": f"Database connection failed: {str(e)}",
        }

    # Check Redis
    try:
        client = await redis_service.get_client()
        await client.ping()
        health_status["services"]["redis"] = {
            "status": "healthy",
            "message": "Redis connection successful",
        }
    except Exception as e:
        health_status["status"] = "degraded"
        health_status["services"]["redis"] = {
            "status": "unhealthy",
            "message": f"Redis connection failed: {str(e)}",
        }

    # API is healthy if at least one service is up
    if all(
        service["status"] == "unhealthy"
        for service in health_status["services"].values()
    ):
        health_status["status"] = "unhealthy"

    return health_status
