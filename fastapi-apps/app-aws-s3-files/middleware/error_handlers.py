"""
Global exception handlers for FastAPI.
"""
import logging
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError, HTTPException
from pydantic import ValidationError
from botocore.exceptions import ClientError, BotoCoreError
from ..config.settings import settings

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

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": error_message,
            "code": "INTERNAL_SERVER_ERROR",
        },
    )


def setup_exception_handlers(app: FastAPI) -> None:
    """
    Register all exception handlers with the FastAPI application.

    Args:
        app: FastAPI application instance
    """
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(ClientError, boto_client_error_handler)
    app.add_exception_handler(Exception, general_exception_handler)
