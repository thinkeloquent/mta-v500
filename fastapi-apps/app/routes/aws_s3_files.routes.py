"""
AWS S3 Files Admin routes.

This module provides a reference route to the mounted AWS S3 Files Admin sub-app.
The actual S3 API is mounted at /api/apps/aws-s3-files with full functionality.
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/s3-admin", tags=["s3-admin"])


class S3AdminInfo(BaseModel):
    """Information about the AWS S3 Admin application."""
    name: str = Field(..., description="Application name", example="AWS S3 Files Admin")
    mounted_at: str = Field(..., description="Mount path", example="/api/apps/aws-s3-files")
    docs_url: str = Field(..., description="API documentation URL", example="/api/apps/aws-s3-files/docs")
    health_url: str = Field(..., description="Health check URL", example="/api/apps/aws-s3-files/health")
    description: str = Field(..., description="Application description")


@router.get(
    "/info",
    response_model=S3AdminInfo,
    summary="Get S3 Admin app information",
    description="""
    Returns information about the AWS S3 Files Admin sub-application.

    The S3 Admin app is mounted at `/api/apps/aws-s3-files` and provides:
    - S3 bucket management (list, create, delete)
    - File operations (upload, download, delete, metadata)
    - Presigned URL generation
    - React-based frontend interface

    **Access the full API documentation at:** `/api/apps/aws-s3-files/docs`
    """,
)
async def get_s3_admin_info():
    """Get information about the AWS S3 Admin sub-application."""
    return {
        "name": "AWS S3 Files Admin",
        "mounted_at": "/api/apps/aws-s3-files",
        "docs_url": "/api/apps/aws-s3-files/docs",
        "health_url": "/api/apps/aws-s3-files/health",
        "description": (
            "Full-featured AWS S3 bucket and file management system. "
            "Provides REST API for S3 operations and serves a React frontend. "
            "Access the API docs at /api/apps/aws-s3-files/docs or use the web interface at /api/apps/aws-s3-files/"
        )
    }


@router.get(
    "/ping",
    summary="Ping the S3 Admin route",
    description="Simple ping endpoint to verify the route is loaded.",
)
async def ping():
    """Simple ping endpoint."""
    return {"status": "ok", "message": "S3 Admin route is active"}
