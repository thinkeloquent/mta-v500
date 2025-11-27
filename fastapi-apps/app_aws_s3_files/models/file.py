"""
Pydantic models for S3 file operations.
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator
import re


class FileListParams(BaseModel):
    """Query parameters for listing files."""

    prefix: str = Field(
        default="", description="Prefix to filter files", examples=["images/", "documents/2024/"]
    )
    maxKeys: int = Field(
        default=1000,
        ge=1,
        le=1000,
        description="Maximum number of files to return (1-1000)",
        examples=[100, 500, 1000],
    )
    continuationToken: Optional[str] = Field(
        default=None, description="Token for pagination (from previous response)"
    )


class FileMetadata(BaseModel):
    """Model for S3 file metadata."""

    key: str = Field(..., description="Object key (file path)")
    size: int = Field(..., description="File size in bytes")
    lastModified: str = Field(..., description="Last modified date (ISO format)")
    etag: str = Field(..., description="Entity tag (ETag)")
    storageClass: str = Field(default="STANDARD", description="S3 storage class")
    contentType: Optional[str] = Field(None, description="MIME content type")
    metadata: Optional[Dict[str, str]] = Field(
        default_factory=dict, description="Custom metadata"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "key": "images/photo.jpg",
                    "size": 2048576,
                    "lastModified": "2024-01-15T10:30:00Z",
                    "etag": '"abc123def456"',
                    "storageClass": "STANDARD",
                    "contentType": "image/jpeg",
                    "metadata": {"uploaded-by": "user123"},
                }
            ]
        }
    }


class FileListResponse(BaseModel):
    """Response model for listing files."""

    files: List[FileMetadata] = Field(default_factory=list, description="List of files")
    isTruncated: bool = Field(default=False, description="Whether results are truncated")
    nextContinuationToken: Optional[str] = Field(
        None, description="Token for fetching next page"
    )
    totalCount: int = Field(default=0, description="Number of files in this response")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "files": [
                        {
                            "key": "file1.txt",
                            "size": 1024,
                            "lastModified": "2024-01-15T10:30:00Z",
                            "etag": '"abc123"',
                            "storageClass": "STANDARD",
                        },
                        {
                            "key": "file2.pdf",
                            "size": 4096,
                            "lastModified": "2024-01-16T11:45:00Z",
                            "etag": '"def456"',
                            "storageClass": "STANDARD",
                        },
                    ],
                    "isTruncated": False,
                    "nextContinuationToken": None,
                    "totalCount": 2,
                }
            ]
        }
    }


class FileUploadResponse(BaseModel):
    """Response model for file upload."""

    key: str = Field(..., description="Object key (file path)")
    etag: str = Field(..., description="Entity tag (ETag)")
    size: int = Field(..., description="File size in bytes")
    success: bool = Field(default=True, description="Upload success status")
    message: str = Field(default="File uploaded successfully", description="Status message")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "key": "uploads/document.pdf",
                    "etag": '"xyz789"',
                    "size": 2048576,
                    "success": True,
                    "message": "File uploaded successfully",
                }
            ]
        }
    }


class FileDeleteResponse(BaseModel):
    """Response model for file deletion."""

    success: bool = Field(..., description="Whether deletion was successful")
    message: str = Field(..., description="Deletion status message")

    model_config = {
        "json_schema_extra": {
            "examples": [{"success": True, "message": "File deleted successfully"}]
        }
    }


class PresignedUrlResponse(BaseModel):
    """Response model for presigned URL generation."""

    url: str = Field(..., description="Presigned URL")
    expiresIn: int = Field(default=3600, description="URL expiration time in seconds")
    bucket: str = Field(..., description="Bucket name")
    key: str = Field(..., description="Object key")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "url": "https://my-bucket.s3.amazonaws.com/file.txt?...",
                    "expiresIn": 3600,
                    "bucket": "my-bucket",
                    "key": "file.txt",
                }
            ]
        }
    }


class FileError(BaseModel):
    """Error response model for file operations."""

    success: bool = Field(default=False, description="Always false for errors")
    message: str = Field(..., description="Error message")
    code: Optional[str] = Field(None, description="Error code")
    field: Optional[str] = Field(None, description="Field that caused the error")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"success": False, "message": "File not found", "code": "FILE_NOT_FOUND"},
                {
                    "success": False,
                    "message": "File size exceeds maximum allowed size",
                    "code": "FILE_TOO_LARGE",
                },
                {
                    "success": False,
                    "message": "File type not allowed",
                    "code": "INVALID_FILE_TYPE",
                    "field": "content_type",
                },
            ]
        }
    }


class DownloadUrlParams(BaseModel):
    """Query parameters for generating download URL."""

    key: str = Field(..., description="Object key (file path)", min_length=1, max_length=1024)

    @field_validator("key")
    @classmethod
    def validate_file_key(cls, v: str) -> str:
        """Validate file key."""
        if re.search(r'[<>:"|?*]', v):
            raise ValueError("File key contains invalid characters")
        return v
