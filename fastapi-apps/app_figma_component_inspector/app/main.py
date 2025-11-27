"""
FastAPI Main Application

Entry point for the Figma Component Inspector API.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError

from app.config import settings
from app.logging_config import logger
from app.database import close_database, test_connection
from app.routes import figma, health
from app.utils.error_handler import (
    generic_exception_handler,
    sqlalchemy_exception_handler,
    validation_exception_handler,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifecycle manager.

    Handles startup and shutdown events.
    """
    # Startup
    logger.info(f"Starting {settings.app_name} API...")
    logger.info(f"Environment: {settings.node_env}")
    logger.info(f"Host: {settings.host}:{settings.port}")

    # Validate Figma token
    if not settings.figma_token:
        logger.warning("FIGMA_TOKEN not set - Figma API calls will fail")

    # Test database connection
    try:
        await test_connection()
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        logger.error("Application will continue but database operations will fail")

    logger.info("Application startup complete")

    yield

    # Shutdown
    logger.info("Shutting down application...")
    await close_database()
    logger.info("Application shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="Figma Component Inspector API",
    description="FastAPI backend for Figma Component Inspector",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register exception handlers
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Register routers
app.include_router(health.router)
app.include_router(figma.router, prefix="/api/figma", tags=["figma"])


# Note: Signal handlers removed - Uvicorn handles SIGINT/SIGTERM gracefully through lifespan


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.is_development,
        log_level=settings.log_level.lower(),
    )
