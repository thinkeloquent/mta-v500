"""
Pydantic models for S3 bucket operations.
"""
from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, Field, field_validator
import re


class BucketCreate(BaseModel):
    """Request model for creating a new bucket."""

    name: str = Field(
        ...,
        min_length=3,
        max_length=63,
        description="Bucket name (3-63 characters, lowercase alphanumeric with dots and hyphens)",
        examples=["my-bucket-name"],
    )
    region: str = Field(
        default="us-east-1",
        description="AWS region for the bucket",
        examples=["us-east-1", "us-west-2", "eu-west-1"],
    )

    @field_validator("name")
    @classmethod
    def validate_bucket_name(cls, v: str) -> str:
        """Validate bucket name according to AWS rules."""
        if not re.match(r"^[a-z0-9.-]+$", v):
            raise ValueError(
                "Bucket name can only contain lowercase letters, numbers, dots, and hyphens"
            )
        if v.startswith(".") or v.endswith("."):
            raise ValueError("Bucket name cannot start or end with a dot")
        if ".." in v:
            raise ValueError("Bucket name cannot contain consecutive dots")
        if ".-" in v or "-." in v:
            raise ValueError("Bucket name cannot contain dots adjacent to hyphens")
        return v

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"name": "my-s3-bucket", "region": "us-east-1"},
                {"name": "data.bucket-2024", "region": "eu-west-1"},
            ]
        }
    }


class BucketResponse(BaseModel):
    """Response model for bucket information."""

    name: str = Field(..., description="Bucket name")
    creationDate: Optional[str] = Field(None, description="Bucket creation date (ISO format)")
    region: str = Field(..., description="AWS region")
    objectCount: int = Field(default=0, description="Approximate object count")
    hasObjects: bool = Field(default=False, description="Whether bucket contains objects")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "name": "my-s3-bucket",
                    "creationDate": "2024-01-15T10:30:00Z",
                    "region": "us-east-1",
                    "objectCount": 42,
                    "hasObjects": True,
                }
            ]
        }
    }


class BucketList(BaseModel):
    """Response model for listing buckets."""

    buckets: List[BucketResponse] = Field(default_factory=list, description="List of buckets")
    totalCount: int = Field(default=0, description="Total number of buckets")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "buckets": [
                        {
                            "name": "bucket-1",
                            "creationDate": "2024-01-15T10:30:00Z",
                            "region": "us-east-1",
                            "objectCount": 10,
                            "hasObjects": True,
                        },
                        {
                            "name": "bucket-2",
                            "creationDate": "2024-02-01T14:20:00Z",
                            "region": "eu-west-1",
                            "objectCount": 0,
                            "hasObjects": False,
                        },
                    ],
                    "totalCount": 2,
                }
            ]
        }
    }


class BucketDeleteResponse(BaseModel):
    """Response model for bucket deletion."""

    success: bool = Field(..., description="Whether deletion was successful")
    message: str = Field(..., description="Deletion status message")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"success": True, "message": "Bucket deleted successfully"},
                {
                    "success": True,
                    "message": "Bucket deleted successfully after removing 2 access point(s)",
                },
            ]
        }
    }


class AccessPoint(BaseModel):
    """Model for S3 access point information."""

    Name: str = Field(..., description="Access point name")
    Bucket: Optional[str] = Field(None, description="Associated bucket name")
    NetworkOrigin: Optional[str] = Field(None, description="Network origin (VPC or Internet)")


class BucketError(BaseModel):
    """Error response model for bucket operations."""

    success: bool = Field(default=False, description="Always false for errors")
    message: str = Field(..., description="Error message")
    code: Optional[str] = Field(None, description="Error code")
    accessPoints: Optional[List[AccessPoint]] = Field(
        None, description="Access points (if error is due to access points)"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"success": False, "message": "Bucket name already exists", "code": "BUCKET_EXISTS"},
                {
                    "success": False,
                    "message": "Cannot delete bucket that contains objects",
                    "code": "BUCKET_NOT_EMPTY",
                },
                {
                    "success": False,
                    "message": "Bucket has 2 access point(s) attached",
                    "code": "BUCKET_HAS_ACCESS_POINTS",
                    "accessPoints": [{"Name": "my-access-point", "Bucket": "my-bucket"}],
                },
            ]
        }
    }
