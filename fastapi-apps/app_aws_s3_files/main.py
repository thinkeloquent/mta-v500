"""
FastAPI application for AWS S3 resource administration.
"""
import logging
import sys
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .config.settings import settings
from .config.aws import validate_aws_credentials
from .routers import buckets, files, health
from .middleware.cors import setup_cors
from .middleware.rate_limit import setup_rate_limiting
from .middleware.security import setup_security_headers
from .middleware.logging import setup_logging_middleware
from .middleware.error_handlers import setup_exception_handlers

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    if settings.log_format == "text"
    else "%(message)s",
    stream=sys.stdout,
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager.
    Handles startup and shutdown events.
    """
    # Startup
    logger.info("Starting AWS S3 Admin API...")
    logger.info(f"Environment: {settings.node_env}")
    logger.info(f"Port: {settings.port}")
    logger.info(f"AWS Region: {settings.aws_region}")

    # Validate AWS credentials
    try:
        validate_aws_credentials()
        logger.info("AWS credentials validated successfully")
    except ValueError as e:
        logger.error(f"AWS credential validation failed: {e}")
        logger.error("Application will start but AWS operations will fail")

    logger.info("Application startup complete")

    yield

    # Shutdown
    logger.info("Shutting down AWS S3 Admin API...")
    logger.info("Application shutdown complete")


# Create FastAPI application
app = FastAPI(
    title="AWS S3 Admin API",
    description="FastAPI backend for AWS S3 resource administration. "
    "Provides comprehensive S3 bucket and file management capabilities.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Setup middleware (order matters!)
# 1. CORS (should be first to handle preflight requests)
setup_cors(app)

# 2. Security headers
setup_security_headers(app)

# 3. Logging (should be early to log all requests)
setup_logging_middleware(app)

# 4. Rate limiting
setup_rate_limiting(app)

# Setup exception handlers
setup_exception_handlers(app)

# Register routers
app.include_router(health.router)
app.include_router(buckets.router)
app.include_router(files.router)

# Serve static frontend files
frontend_dist_path = Path(__file__).parent / "frontend" / "dist"
if frontend_dist_path.exists():
    # Mount static assets (JS, CSS, images, etc.)
    app.mount("/assets", StaticFiles(directory=str(frontend_dist_path / "assets")), name="assets")

    # Serve index.html for root and any other routes (SPA routing)
    @app.get("/", response_class=FileResponse)
    @app.get("/{full_path:path}", response_class=FileResponse)
    async def serve_frontend(full_path: str = ""):
        # Don't serve index.html for API routes
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("redoc") or full_path.startswith("openapi"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404)

        index_file = frontend_dist_path / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Frontend not built")

    logger.info(f"Serving frontend from: {frontend_dist_path}")
else:
    logger.warning(f"Frontend dist directory not found: {frontend_dist_path}")
    logger.warning("Frontend will not be served. Run 'npm run build' in the frontend directory.")

# Log registered routes
logger.info("Registered routes:")
for route in app.routes:
    if hasattr(route, "methods"):
        logger.info(f"  {', '.join(route.methods)} {route.path}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.is_development,
        log_level=settings.log_level.lower(),
    )
