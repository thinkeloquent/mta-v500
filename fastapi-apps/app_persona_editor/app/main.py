"""
FastAPI main application entry point.
"""

import re
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import close_db
from app.middleware import add_exception_handlers, LoggingMiddleware


def redact_url_password(url: str) -> str:
    """
    Redact password from connection URL for safe logging.
    """
    # Replace password in URL with '***'
    return re.sub(r':([^:@]+)@', r':***@', url)

# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Add exception handlers
add_exception_handlers(app)

# Add middleware
app.add_middleware(LoggingMiddleware)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """
    Execute on application startup.
    """
    print(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} starting...")
    print(f"📊 Environment: {settings.ENVIRONMENT}")
    print(f"🗄️  Database: {settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}")
    print(f"🔴 Redis: {redact_url_password(settings.redis_url)}")


@app.on_event("shutdown")
async def shutdown_event():
    """
    Execute on application shutdown.
    Cleanup database connections.
    """
    print("🛑 Shutting down...")
    await close_db()


@app.get("/")
async def root():
    """
    Root endpoint - basic health check.
    """
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }


# Import and register routers
from app.routes import personas, llm_defaults, health

app.include_router(personas.router, prefix="/personas", tags=["personas"])
app.include_router(llm_defaults.router, prefix="/llm-defaults", tags=["llm-defaults"])
app.include_router(health.router, prefix="/health", tags=["health"])


# For standalone execution
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=59900)
