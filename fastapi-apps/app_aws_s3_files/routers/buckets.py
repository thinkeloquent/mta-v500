"""
API routes for S3 bucket operations.
"""
import logging
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Path, status
from ..models.bucket import (
    BucketCreate,
    BucketResponse,
    BucketList,
    BucketDeleteResponse,
    BucketError,
)
from ..models import ErrorResponse
from ..services.s3_service import S3Service, get_s3_service
from ..config.settings import Settings, get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/buckets", tags=["Buckets"])


@router.get(
    "",
    response_model=Dict[str, Any],
    summary="List all S3 buckets",
    description="Retrieve a list of all S3 buckets with metadata including region, creation date, and object count.",
    responses={
        200: {
            "description": "Successfully retrieved bucket list",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "buckets": [
                            {
                                "name": "my-bucket",
                                "creationDate": "2024-01-15T10:30:00Z",
                                "region": "us-east-1",
                                "objectCount": 42,
                                "hasObjects": True,
                            }
                        ],
                    }
                }
            },
        },
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def list_buckets(s3_service: S3Service = Depends(get_s3_service)) -> Dict[str, Any]:
    """
    List all S3 buckets with metadata.

    Returns:
        Dict with success status and list of buckets
    """
    try:
        buckets = await s3_service.list_buckets()
        return {"success": True, "buckets": buckets}
    except Exception as e:
        logger.error(f"Failed to list buckets: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": str(e)},
        )


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=Dict[str, Any],
    summary="Create a new S3 bucket",
    description="Create a new S3 bucket with the specified name and region. Bucket names must follow AWS naming conventions.",
    responses={
        201: {
            "description": "Bucket created successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Bucket created successfully",
                        "bucket": {"name": "my-bucket", "region": "us-east-1"},
                    }
                }
            },
        },
        400: {"model": ErrorResponse, "description": "Validation error"},
        409: {"model": ErrorResponse, "description": "Bucket already exists"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def create_bucket(
    bucket_data: BucketCreate, s3_service: S3Service = Depends(get_s3_service)
) -> Dict[str, Any]:
    """
    Create a new S3 bucket.

    Args:
        bucket_data: Bucket creation parameters (name, region)

    Returns:
        Dict with success status, message, and bucket details
    """
    try:
        bucket = await s3_service.create_bucket(bucket_data.name, bucket_data.region)
        return {
            "success": True,
            "message": "Bucket created successfully",
            "bucket": bucket,
        }
    except ValueError as e:
        # Bucket already exists or validation error
        logger.warning(f"Bucket creation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"success": False, "message": str(e)},
        )
    except Exception as e:
        logger.error(f"Failed to create bucket: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": str(e)},
        )


@router.delete(
    "/{name}",
    response_model=Dict[str, Any],
    summary="Delete an S3 bucket",
    description="Delete an empty S3 bucket. The bucket must not contain any objects or access points.",
    responses={
        200: {
            "description": "Bucket deleted successfully",
            "content": {
                "application/json": {
                    "example": {"success": True, "message": "Bucket deleted successfully"}
                }
            },
        },
        404: {"model": ErrorResponse, "description": "Bucket not found"},
        409: {"model": BucketError, "description": "Bucket not empty or has access points"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def delete_bucket(
    name: str = Path(..., description="Bucket name to delete"),
    s3_service: S3Service = Depends(get_s3_service),
) -> Dict[str, Any]:
    """
    Delete an S3 bucket.

    Args:
        name: Bucket name

    Returns:
        Dict with success status and message
    """
    try:
        result = await s3_service.delete_bucket(name)
        return {"success": True, "message": result["message"]}
    except ValueError as e:
        # Bucket has objects or access points
        error_msg = str(e)
        logger.warning(f"Bucket deletion failed: {error_msg}")

        # Check if error is due to access points
        if hasattr(e, "code") and e.code == "BUCKET_HAS_ACCESS_POINTS":  # type: ignore
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "success": False,
                    "message": error_msg,
                    "code": "BUCKET_HAS_ACCESS_POINTS",
                    "accessPoints": getattr(e, "access_points", []),  # type: ignore
                },
            )

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"success": False, "message": error_msg},
        )
    except Exception as e:
        error_msg = str(e)

        # Check if bucket not found
        if "not found" in error_msg.lower() or "does not exist" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"success": False, "message": "Bucket not found"},
            )

        logger.error(f"Failed to delete bucket: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": error_msg},
        )


@router.delete(
    "/{name}/force",
    response_model=Dict[str, Any],
    summary="Force delete S3 bucket with access points",
    description="Delete an S3 bucket and all its associated access points. Requires AWS_ACCOUNT_ID to be configured.",
    responses={
        200: {
            "description": "Bucket and access points deleted successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Bucket deleted successfully after removing 2 access point(s)",
                    }
                }
            },
        },
        400: {"model": ErrorResponse, "description": "AWS_ACCOUNT_ID not configured"},
        409: {"model": ErrorResponse, "description": "Bucket not empty"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def force_delete_bucket(
    name: str = Path(..., description="Bucket name to delete"),
    s3_service: S3Service = Depends(get_s3_service),
    settings: Settings = Depends(get_settings),
) -> Dict[str, Any]:
    """
    Delete a bucket and all its access points.

    Args:
        name: Bucket name
        settings: Application settings

    Returns:
        Dict with success status and message
    """
    account_id = settings.aws_account_id

    if not account_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "message": "AWS_ACCOUNT_ID environment variable is required for access point management",
            },
        )

    try:
        result = await s3_service.delete_bucket_with_access_points(name, account_id)
        return {"success": True, "message": result["message"]}
    except ValueError as e:
        # Bucket has objects
        logger.warning(f"Bucket force deletion failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"success": False, "message": str(e)},
        )
    except Exception as e:
        logger.error(f"Failed to force delete bucket: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": str(e)},
        )


@router.get(
    "/{name}",
    response_model=Dict[str, Any],
    summary="Get bucket details",
    description="Retrieve detailed information about a specific S3 bucket including object count and total size.",
    responses={
        200: {
            "description": "Successfully retrieved bucket details",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "bucket": {
                            "name": "my-bucket",
                            "objectCount": 42,
                            "totalSize": 1048576,
                            "hasObjects": True,
                        },
                    }
                }
            },
        },
        404: {"model": ErrorResponse, "description": "Bucket not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def get_bucket_details(
    name: str = Path(..., description="Bucket name"),
    s3_service: S3Service = Depends(get_s3_service),
) -> Dict[str, Any]:
    """
    Get detailed information about a bucket.

    Args:
        name: Bucket name

    Returns:
        Dict with success status and bucket details
    """
    try:
        # Get bucket files to calculate stats
        files_result = await s3_service.list_files(name, "", 1)
        total_size = await _calculate_bucket_size(name, s3_service)

        return {
            "success": True,
            "bucket": {
                "name": name,
                "objectCount": files_result["totalCount"],
                "totalSize": total_size,
                "hasObjects": files_result["totalCount"] > 0,
            },
        }
    except Exception as e:
        error_msg = str(e)

        # Check if bucket not found
        if "not found" in error_msg.lower() or "does not exist" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"success": False, "message": "Bucket not found"},
            )

        logger.error(f"Failed to get bucket details: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": error_msg},
        )


# Helper function to calculate bucket size
async def _calculate_bucket_size(bucket_name: str, s3_service: S3Service) -> int:
    """
    Calculate total size of all objects in a bucket.

    Args:
        bucket_name: Name of the bucket
        s3_service: S3Service instance

    Returns:
        Total size in bytes
    """
    try:
        total_size = 0
        continuation_token = None

        while True:
            result = await s3_service.list_files(
                bucket_name, "", 1000, continuation_token=continuation_token
            )
            total_size += sum(file["size"] for file in result["files"])

            if not result.get("isTruncated"):
                break

            continuation_token = result.get("nextContinuationToken")

        return total_size
    except Exception as e:
        logger.warning(f"Failed to calculate bucket size for {bucket_name}: {e}")
        return 0  # Return 0 if we can't calculate size
