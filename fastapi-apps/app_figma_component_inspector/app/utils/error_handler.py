"""
Error Handler Utilities

Custom exception handlers for FastAPI.
Matches error format from Fastify backend.
"""

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError

from app.config import settings


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handle Pydantic validation errors.

    Returns 400 with validation details.
    """
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"],
        })

    response = {
        "error": "Validation Error",
        "message": "Request validation failed",
        "statusCode": status.HTTP_400_BAD_REQUEST,
        "validation": errors,
    }

    if settings.is_development:
        response["detail"] = str(exc)

    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=response,
    )


async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """
    Handle SQLAlchemy database errors.

    Returns 500 with generic message (hides details in production).
    """
    response = {
        "error": "Database Error",
        "message": "A database error occurred",
        "statusCode": status.HTTP_500_INTERNAL_SERVER_ERROR,
    }

    if settings.is_development:
        response["detail"] = str(exc)
        response["stack"] = exc.__class__.__name__

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=response,
    )


async def generic_exception_handler(request: Request, exc: Exception):
    """
    Handle generic exceptions.

    Returns 500 with error details in development.
    """
    response = {
        "error": exc.__class__.__name__,
        "message": str(exc) or "An unexpected error occurred",
        "statusCode": status.HTTP_500_INTERNAL_SERVER_ERROR,
    }

    if settings.is_development:
        import traceback
        response["stack"] = traceback.format_exc()

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=response,
    )
