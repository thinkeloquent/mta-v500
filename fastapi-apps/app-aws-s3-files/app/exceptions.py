"""Custom exception classes for AWS S3 Files application.

This module defines a hierarchy of custom exceptions that provide:
- Better error handling and type discrimination
- Correlation IDs for request tracking
- User-friendly error messages
- Structured error context for logging
"""

from typing import Any, Dict, Optional, List


class S3ServiceError(Exception):
    """Base exception for all S3 service errors.

    Attributes:
        message: User-friendly error message
        correlation_id: Request correlation ID for tracking
        context: Additional context data for debugging
        status_code: Suggested HTTP status code
    """

    def __init__(
        self,
        message: str,
        correlation_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        status_code: int = 500
    ):
        self.message = message
        self.correlation_id = correlation_id
        self.context = context or {}
        self.status_code = status_code
        super().__init__(self.message)

    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for JSON responses."""
        result = {
            "error": self.__class__.__name__,
            "message": self.message,
            "status_code": self.status_code
        }

        if self.correlation_id:
            result["correlation_id"] = self.correlation_id

        if self.context:
            result["context"] = self.context

        return result


class BucketNotFoundError(S3ServiceError):
    """Exception raised when a bucket does not exist."""

    def __init__(
        self,
        bucket_name: str,
        correlation_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        context = context or {}
        context["bucket_name"] = bucket_name
        super().__init__(
            message=f'Bucket "{bucket_name}" does not exist or has been deleted',
            correlation_id=correlation_id,
            context=context,
            status_code=404
        )
        self.bucket_name = bucket_name


class BucketNotEmptyError(S3ServiceError):
    """Exception raised when attempting to delete a non-empty bucket."""

    def __init__(
        self,
        bucket_name: str,
        object_count: Optional[int] = None,
        correlation_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        context = context or {}
        context["bucket_name"] = bucket_name
        if object_count is not None:
            context["object_count"] = object_count

        msg = f'Cannot delete bucket "{bucket_name}" because it contains files'
        if object_count:
            msg += f" ({object_count} object(s))"
        msg += ". Delete all files first, then try again."

        super().__init__(
            message=msg,
            correlation_id=correlation_id,
            context=context,
            status_code=409
        )
        self.bucket_name = bucket_name
        self.object_count = object_count


class BucketHasAccessPointsError(S3ServiceError):
    """Exception raised when a bucket has S3 Access Points attached."""

    def __init__(
        self,
        bucket_name: str,
        access_points: Optional[List[Dict[str, str]]] = None,
        correlation_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        context = context or {}
        context["bucket_name"] = bucket_name
        if access_points:
            context["access_points"] = access_points
            context["access_point_count"] = len(access_points)

        msg = f'Cannot delete bucket "{bucket_name}" because it has access points attached'
        if access_points:
            msg += f" ({len(access_points)} access point(s))"
        msg += ". Remove access points first or use force delete."

        super().__init__(
            message=msg,
            correlation_id=correlation_id,
            context=context,
            status_code=409
        )
        self.bucket_name = bucket_name
        self.access_points = access_points or []
        self.code = "BUCKET_HAS_ACCESS_POINTS"  # For frontend detection


class FileNotFoundError(S3ServiceError):
    """Exception raised when a file does not exist in S3."""

    def __init__(
        self,
        bucket_name: str,
        file_key: str,
        correlation_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        context = context or {}
        context["bucket_name"] = bucket_name
        context["file_key"] = file_key

        super().__init__(
            message=f'File "{file_key}" not found in bucket "{bucket_name}"',
            correlation_id=correlation_id,
            context=context,
            status_code=404
        )
        self.bucket_name = bucket_name
        self.file_key = file_key


class ValidationError(S3ServiceError):
    """Exception raised for input validation failures."""

    def __init__(
        self,
        message: str,
        field: Optional[str] = None,
        value: Any = None,
        correlation_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        context = context or {}
        if field:
            context["field"] = field
        if value is not None:
            context["value"] = str(value)[:100]  # Truncate long values

        super().__init__(
            message=message,
            correlation_id=correlation_id,
            context=context,
            status_code=400
        )
        self.field = field
        self.value = value


class S3AccessDeniedError(S3ServiceError):
    """Exception raised when access to an S3 resource is denied."""

    def __init__(
        self,
        resource: str,
        operation: str,
        correlation_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        context = context or {}
        context["resource"] = resource
        context["operation"] = operation

        super().__init__(
            message=f'Access denied for {operation} operation on "{resource}". Check IAM permissions.',
            correlation_id=correlation_id,
            context=context,
            status_code=403
        )
        self.resource = resource
        self.operation = operation


class S3OperationTimeoutError(S3ServiceError):
    """Exception raised when an S3 operation times out."""

    def __init__(
        self,
        operation: str,
        timeout_seconds: int,
        correlation_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        context = context or {}
        context["operation"] = operation
        context["timeout_seconds"] = timeout_seconds

        super().__init__(
            message=f'Operation "{operation}" timed out after {timeout_seconds} seconds',
            correlation_id=correlation_id,
            context=context,
            status_code=504
        )
        self.operation = operation
        self.timeout_seconds = timeout_seconds
