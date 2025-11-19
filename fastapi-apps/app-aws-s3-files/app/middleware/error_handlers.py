"""
Global exception handlers for FastAPI.

Handles all application exceptions including custom S3ServiceError exceptions,
AWS ClientErrors, validation errors, and general exceptions with proper logging
and correlation ID tracking.
"""
import logging
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError, HTTPException
from pydantic import ValidationError as PydanticValidationError
from botocore.exceptions import ClientError, BotoCoreError
from ..config import settings
from ..exceptions import (
    S3ServiceError,
    BucketNotFoundError,
    BucketNotEmptyError,
    BucketHasAccessPointsError,
    FileNotFoundError,
    ValidationError as CustomValidationError,
    S3AccessDeniedError,
)

logger = logging.getLogger(__name__)


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    Handle HTTPException errors.

    Args:
        request: Request instance
        exc: HTTPException

    Returns:
        JSONResponse with error details
    """
    correlation_id = getattr(request.state, "correlation_id", None)

    logger.warning(
        f"HTTP exception: {exc.status_code} - {exc.detail}",
        extra={"correlation_id": correlation_id},
    )

    # If detail is already a dict, use it directly
    if isinstance(exc.detail, dict):
        return JSONResponse(status_code=exc.status_code, content=exc.detail)

    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": str(exc.detail)},
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """
    Handle Pydantic validation errors.

    Args:
        request: Request instance
        exc: RequestValidationError

    Returns:
        JSONResponse with validation error details
    """
    correlation_id = getattr(request.state, "correlation_id", None)

    logger.warning(
        f"Validation error: {exc.errors()}",
        extra={"correlation_id": correlation_id},
    )

    # Format validation errors
    errors = []
    for error in exc.errors():
        field = ".".join(str(loc) for loc in error["loc"] if loc != "body")
        errors.append({"field": field or "unknown", "message": error["msg"]})

    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "success": False,
            "message": "Validation error",
            "code": "VALIDATION_ERROR",
            "errors": errors,
        },
    )


async def boto_client_error_handler(request: Request, exc: ClientError) -> JSONResponse:
    """
    Handle AWS boto3 ClientError exceptions.

    Args:
        request: Request instance
        exc: ClientError

    Returns:
        JSONResponse with error details
    """
    correlation_id = getattr(request.state, "correlation_id", None)

    error_code = exc.response.get("Error", {}).get("Code", "Unknown")
    error_message = exc.response.get("Error", {}).get("Message", str(exc))

    logger.error(
        f"AWS ClientError: {error_code} - {error_message}",
        extra={"correlation_id": correlation_id},
    )

    # Map AWS error codes to HTTP status codes
    status_code_map = {
        "NoSuchBucket": status.HTTP_404_NOT_FOUND,
        "NoSuchKey": status.HTTP_404_NOT_FOUND,
        "BucketAlreadyExists": status.HTTP_409_CONFLICT,
        "BucketAlreadyOwnedByYou": status.HTTP_409_CONFLICT,
        "BucketNotEmpty": status.HTTP_409_CONFLICT,
        "AccessDenied": status.HTTP_403_FORBIDDEN,
        "InvalidAccessKeyId": status.HTTP_401_UNAUTHORIZED,
        "SignatureDoesNotMatch": status.HTTP_401_UNAUTHORIZED,
    }

    http_status = status_code_map.get(error_code, status.HTTP_500_INTERNAL_SERVER_ERROR)

    return JSONResponse(
        status_code=http_status,
        content={
            "success": False,
            "message": error_message if not settings.is_production else "An error occurred",
            "code": error_code,
        },
    )


async def s3_service_error_handler(request: Request, exc: S3ServiceError) -> JSONResponse:
    """
    Handle custom S3ServiceError exceptions.

    Args:
        request: Request instance
        exc: S3ServiceError or subclass

    Returns:
        JSONResponse with detailed error information
    """
    correlation_id = getattr(request.state, "correlation_id", None)

    # Log at appropriate level based on status code
    log_level = logging.WARNING if exc.status_code < 500 else logging.ERROR
    logger.log(
        log_level,
        f"S3ServiceError: {exc.__class__.__name__} - {exc.message}",
        extra={"correlation_id": correlation_id, "context": exc.context},
        exc_info=(exc.status_code >= 500)  # Full traceback only for 5xx errors
    )

    # Build response content
    content = {
        "success": False,
        "message": exc.message,
        "error": exc.__class__.__name__,
    }

    # Add correlation ID if available
    if correlation_id:
        content["correlation_id"] = correlation_id

    # Add error code for specific exceptions
    if hasattr(exc, "code"):
        content["code"] = exc.code

    # Add context for specific exception types
    if isinstance(exc, BucketHasAccessPointsError) and exc.access_points:
        content["accessPoints"] = exc.access_points

    # Add context in development mode
    if not settings.is_production and exc.context:
        content["context"] = exc.context

    return JSONResponse(
        status_code=exc.status_code,
        content=content,
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handle all other exceptions.

    Args:
        request: Request instance
        exc: Exception

    Returns:
        JSONResponse with error details
    """
    correlation_id = getattr(request.state, "correlation_id", None)

    logger.error(
        f"Unhandled exception: {type(exc).__name__} - {str(exc)}",
        extra={"correlation_id": correlation_id},
        exc_info=True,
    )

    # Hide detailed error messages in production
    error_message = (
        "An internal server error occurred"
        if settings.is_production
        else f"{type(exc).__name__}: {str(exc)}"
    )

    content = {
        "success": False,
        "message": error_message,
        "code": "INTERNAL_SERVER_ERROR",
    }

    if correlation_id:
        content["correlation_id"] = correlation_id

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=content,
    )


def setup_exception_handlers(app: FastAPI) -> None:
    """
    Register all exception handlers with the FastAPI application.

    Exception handlers are registered in order of specificity (most specific first).
    More specific exception types must be registered before their parent types.

    Args:
        app: FastAPI application instance
    """
    # Custom S3 exceptions (most specific)
    app.add_exception_handler(S3ServiceError, s3_service_error_handler)

    # FastAPI built-in exceptions
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)

    # AWS boto3 exceptions
    app.add_exception_handler(ClientError, boto_client_error_handler)

    # General catch-all (least specific, must be last)
    app.add_exception_handler(Exception, general_exception_handler)

    logger.info("Exception handlers registered successfully")
