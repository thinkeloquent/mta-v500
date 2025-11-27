"""
Exception handlers for the application.
"""

import traceback

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError

from app.exceptions import AppGoogleGeminiOpenaiChatCompletionsException
from app.config import settings


def add_exception_handlers(app: FastAPI) -> None:
    """
    Register all exception handlers with the FastAPI app.

    Args:
        app: FastAPI application instance
    """

    @app.exception_handler(AppGoogleGeminiOpenaiChatCompletionsException)
    async def app_exception_handler(
        request: Request, exc: AppGoogleGeminiOpenaiChatCompletionsException
    ) -> JSONResponse:
        """Handle custom application exceptions"""
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.__class__.__name__,
                "message": exc.message,
                "details": exc.details,
                "path": str(request.url.path),
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        """Handle Pydantic validation errors"""
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": "ValidationError",
                "message": "Request validation failed",
                "details": exc.errors(),
                "path": str(request.url.path),
            },
        )

    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_exception_handler(
        request: Request, exc: SQLAlchemyError
    ) -> JSONResponse:
        """Handle SQLAlchemy database errors"""
        error_message = "Database error occurred"

        # Include detailed error in debug mode
        details = None
        if settings.DEBUG:
            details = {
                "type": exc.__class__.__name__,
                "message": str(exc),
                "traceback": traceback.format_exc(),
            }

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "DatabaseError",
                "message": error_message,
                "details": details,
                "path": str(request.url.path),
            },
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        """Handle all other unhandled exceptions"""
        error_message = "An unexpected error occurred"

        # Include detailed error in debug mode
        details = None
        if settings.DEBUG:
            details = {
                "type": exc.__class__.__name__,
                "message": str(exc),
                "traceback": traceback.format_exc(),
            }

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "InternalServerError",
                "message": error_message,
                "details": details,
                "path": str(request.url.path),
            },
        )
