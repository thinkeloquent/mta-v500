"""
API routes for S3 file operations.
"""
import logging
from datetime import datetime
from typing import Any, Dict, Optional
from urllib.parse import unquote
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Path,
    Query,
    UploadFile,
    status,
)
from fastapi.responses import StreamingResponse
from ..schemas.file import (
    FileListParams,
    FileListResponse,
    FileUploadResponse,
    FileDeleteResponse,
    PresignedUrlResponse,
    FileMetadata,
    DownloadUrlParams,
)
from ..schemas import ErrorResponse
from ..services.s3_service import S3Service, get_s3_service
from ..config import Settings, get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/buckets", tags=["Files"])


@router.get(
    "/{bucket}/files",
    response_model=Dict[str, Any],
    summary="List files in a bucket",
    description="List all files in an S3 bucket with optional prefix filtering and pagination support.",
    responses={
        200: {
            "description": "Successfully retrieved file list",
            "model": Dict[str, Any],
        },
        404: {"model": ErrorResponse, "description": "Bucket not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def list_files(
    bucket: str = Path(..., description="Bucket name"),
    prefix: str = Query(default="", description="Prefix to filter files"),
    maxKeys: int = Query(
        default=1000, ge=1, le=1000, description="Maximum number of files to return"
    ),
    continuationToken: Optional[str] = Query(default=None, description="Pagination token"),
    s3_service: S3Service = Depends(get_s3_service),
) -> Dict[str, Any]:
    """
    List files in a bucket with pagination.

    Args:
        bucket: Bucket name
        prefix: File key prefix for filtering
        maxKeys: Maximum number of keys to return
        continuationToken: Token for pagination

    Returns:
        Dict with files list and pagination info
    """
    try:
        result = await s3_service.list_files(bucket, prefix, maxKeys, continuationToken)

        return {
            "success": True,
            "files": result["files"],
            "pagination": {
                "isTruncated": result["isTruncated"],
                "nextContinuationToken": result.get("nextContinuationToken"),
                "totalCount": result["totalCount"],
            },
        }
    except Exception as e:
        error_msg = str(e)

        if "not found" in error_msg.lower() or "does not exist" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"success": False, "message": "Bucket not found"},
            )

        logger.error(f"Failed to list files: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": error_msg},
        )


@router.post(
    "/{bucket}/files",
    status_code=status.HTTP_201_CREATED,
    response_model=Dict[str, Any],
    summary="Upload a file",
    description="Upload a file to an S3 bucket. Supports multipart form data with optional custom key.",
    responses={
        201: {
            "description": "File uploaded successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "File uploaded successfully",
                        "file": {"key": "uploads/file.txt", "etag": '"abc123"', "size": 1024},
                    }
                }
            },
        },
        400: {"model": ErrorResponse, "description": "Validation error or file too large"},
        404: {"model": ErrorResponse, "description": "Bucket not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def upload_file(
    bucket: str = Path(..., description="Bucket name"),
    file: UploadFile = File(..., description="File to upload"),
    key: Optional[str] = Form(None, description="Custom file key (optional, uses filename if not provided)"),
    s3_service: S3Service = Depends(get_s3_service),
    settings: Settings = Depends(get_settings),
) -> Dict[str, Any]:
    """
    Upload a file to a bucket.

    Args:
        bucket: Bucket name
        file: File to upload
        key: Optional custom file key
        s3_service: S3Service instance
        settings: Application settings

    Returns:
        Dict with upload success and file details
    """
    try:
        # Use custom key or filename
        file_key = key if key else file.filename

        if not file_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"success": False, "message": "File key or filename is required"},
            )

        # Validate file type
        content_type = file.content_type or "application/octet-stream"
        try:
            s3_service.validate_file_type(content_type)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"success": False, "message": str(e)},
            )

        # Read file content
        file_content = await file.read()
        file_size = len(file_content)

        # Validate file size
        try:
            s3_service.validate_file_size(file_size)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"success": False, "message": str(e)},
            )

        # Upload file with metadata
        metadata = {
            "originalName": file.filename or "",
            "uploadedAt": datetime.utcnow().isoformat(),
        }

        result = await s3_service.upload_file(
            bucket, file_key, file_content, content_type, metadata
        )

        return {
            "success": True,
            "message": "File uploaded successfully",
            "file": result,
        }

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)

        if "not found" in error_msg.lower() or "does not exist" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"success": False, "message": "Bucket not found"},
            )

        logger.error(f"Failed to upload file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": error_msg},
        )


@router.get(
    "/{bucket}/files/{key:path}",
    summary="Download a file",
    description="Download a file from S3 as a streaming response.",
    responses={
        200: {
            "description": "File download stream",
            "content": {"application/octet-stream": {}},
        },
        404: {"model": ErrorResponse, "description": "File or bucket not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def download_file(
    bucket: str = Path(..., description="Bucket name"),
    key: str = Path(..., description="File key (URL encoded)"),
    s3_service: S3Service = Depends(get_s3_service),
) -> StreamingResponse:
    """
    Download a file from a bucket.

    Args:
        bucket: Bucket name
        key: File key (will be URL decoded)

    Returns:
        StreamingResponse with file content
    """
    try:
        # Decode the key (handle URL encoding)
        decoded_key = unquote(key)

        file_data = await s3_service.download_file(bucket, decoded_key)

        # Get filename from key
        filename = decoded_key.split("/")[-1]

        # Create streaming response
        return StreamingResponse(
            file_data["body"],
            media_type=file_data.get("contentType", "application/octet-stream"),
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(file_data.get("contentLength", 0)),
                "Last-Modified": file_data.get("lastModified", ""),
            },
        )

    except Exception as e:
        error_msg = str(e)

        if "not found" in error_msg.lower() or "does not exist" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"success": False, "message": "File not found"},
            )

        logger.error(f"Failed to download file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": error_msg},
        )


@router.delete(
    "/{bucket}/files/{key:path}",
    response_model=Dict[str, Any],
    summary="Delete a file",
    description="Delete a file from an S3 bucket.",
    responses={
        200: {
            "description": "File deleted successfully",
            "content": {
                "application/json": {
                    "example": {"success": True, "message": "File deleted successfully"}
                }
            },
        },
        404: {"model": ErrorResponse, "description": "File or bucket not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def delete_file(
    bucket: str = Path(..., description="Bucket name"),
    key: str = Path(..., description="File key (URL encoded)"),
    s3_service: S3Service = Depends(get_s3_service),
) -> Dict[str, Any]:
    """
    Delete a file from a bucket.

    Args:
        bucket: Bucket name
        key: File key (will be URL decoded)

    Returns:
        Dict with success status and message
    """
    try:
        # Decode the key (handle URL encoding)
        decoded_key = unquote(key)

        result = await s3_service.delete_file(bucket, decoded_key)

        return {"success": True, "message": result["message"]}

    except Exception as e:
        error_msg = str(e)

        if "not found" in error_msg.lower() or "does not exist" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"success": False, "message": "File not found"},
            )

        logger.error(f"Failed to delete file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": error_msg},
        )


@router.get(
    "/{bucket}/files/{key:path}/metadata",
    response_model=Dict[str, Any],
    summary="Get file metadata",
    description="Retrieve metadata for a file in S3 (size, content type, last modified, etc.).",
    responses={
        200: {
            "description": "Successfully retrieved file metadata",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "metadata": {
                            "key": "files/document.pdf",
                            "size": 2048576,
                            "lastModified": "2024-01-15T10:30:00Z",
                            "contentType": "application/pdf",
                            "etag": '"abc123"',
                        },
                    }
                }
            },
        },
        404: {"model": ErrorResponse, "description": "File or bucket not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def get_file_metadata(
    bucket: str = Path(..., description="Bucket name"),
    key: str = Path(..., description="File key (URL encoded)"),
    s3_service: S3Service = Depends(get_s3_service),
) -> Dict[str, Any]:
    """
    Get metadata for a file.

    Args:
        bucket: Bucket name
        key: File key (will be URL decoded)

    Returns:
        Dict with file metadata
    """
    try:
        # Decode the key (handle URL encoding)
        decoded_key = unquote(key)

        metadata = await s3_service.get_file_metadata(bucket, decoded_key)

        return {"success": True, "metadata": metadata}

    except Exception as e:
        error_msg = str(e)

        if "not found" in error_msg.lower() or "does not exist" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"success": False, "message": "File not found"},
            )

        logger.error(f"Failed to get file metadata: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": error_msg},
        )


@router.get(
    "/{bucket}/download-url",
    response_model=Dict[str, Any],
    summary="Generate presigned download URL",
    description="Generate a temporary presigned URL for downloading a file (expires in 1 hour).",
    responses={
        200: {
            "description": "Successfully generated presigned URL",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "downloadUrl": "https://bucket.s3.amazonaws.com/file.txt?...",
                        "expiresIn": 3600,
                    }
                }
            },
        },
        400: {"model": ErrorResponse, "description": "File key is required"},
        404: {"model": ErrorResponse, "description": "File or bucket not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def generate_download_url(
    bucket: str = Path(..., description="Bucket name"),
    key: str = Query(..., description="File key"),
    s3_service: S3Service = Depends(get_s3_service),
    settings: Settings = Depends(get_settings),
) -> Dict[str, Any]:
    """
    Generate a presigned URL for downloading a file.

    Args:
        bucket: Bucket name
        key: File key
        s3_service: S3Service instance
        settings: Application settings

    Returns:
        Dict with presigned URL and expiration time
    """
    try:
        if not key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"success": False, "message": "File key is required"},
            )

        download_url = await s3_service.generate_download_url(bucket, key)

        return {
            "success": True,
            "downloadUrl": download_url,
            "expiresIn": settings.presigned_url_expiry,
        }

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)

        if "not found" in error_msg.lower() or "does not exist" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"success": False, "message": "File not found"},
            )

        logger.error(f"Failed to generate download URL: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"success": False, "message": error_msg},
        )
