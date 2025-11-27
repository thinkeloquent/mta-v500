"""
Pydantic models for API requests and responses.
"""
from typing import Any, List, Optional
from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    """Model for validation error details."""

    field: str = Field(..., description="Field name that caused the error")
    message: str = Field(..., description="Error message for this field")


class ErrorResponse(BaseModel):
    """Generic error response model."""

    success: bool = Field(default=False, description="Always false for errors")
    message: str = Field(..., description="Error message")
    code: Optional[str] = Field(None, description="Error code")
    errors: Optional[List[ErrorDetail]] = Field(None, description="Validation error details")
    retryAfter: Optional[int] = Field(
        None, description="Retry after N seconds (for rate limiting)"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"success": False, "message": "Resource not found", "code": "NOT_FOUND"},
                {
                    "success": False,
                    "message": "Validation error",
                    "code": "VALIDATION_ERROR",
                    "errors": [
                        {"field": "name", "message": "Bucket name is required"},
                        {"field": "region", "message": "Invalid AWS region"},
                    ],
                },
                {
                    "success": False,
                    "message": "Rate limit exceeded",
                    "code": "RATE_LIMIT_EXCEEDED",
                    "retryAfter": 60,
                },
            ]
        }
    }


class SuccessResponse(BaseModel):
    """Generic success response model."""

    success: bool = Field(default=True, description="Always true for success")
    message: str = Field(..., description="Success message")
    data: Optional[Any] = Field(None, description="Response data")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"success": True, "message": "Operation completed successfully"},
                {
                    "success": True,
                    "message": "Data retrieved successfully",
                    "data": {"count": 42, "items": []},
                },
            ]
        }
    }


class HealthResponse(BaseModel):
    """Health check response model."""

    status: str = Field(..., description="Health status", examples=["ok", "degraded", "error"])
    timestamp: str = Field(..., description="Current timestamp (ISO format)")
    version: str = Field(..., description="API version")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"status": "ok", "timestamp": "2024-01-15T10:30:00Z", "version": "1.0.0"}
            ]
        }
    }
