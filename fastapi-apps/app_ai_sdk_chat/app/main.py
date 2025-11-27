"""
FastAPI main application entry point for AI SDK Chat.
"""

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.middleware import add_exception_handlers, LoggingMiddleware


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
    print(f"{settings.APP_NAME} v{settings.APP_VERSION} starting...")
    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"Default model: {settings.DEFAULT_CHAT_MODEL}")

    # Log which API keys are configured
    configured_keys = []
    if settings.GEMINI_API_KEY:
        configured_keys.append("Google Gemini")
    if settings.OPENAI_API_KEY:
        configured_keys.append("OpenAI")

    if configured_keys:
        print(f"Configured providers: {', '.join(configured_keys)}")
    else:
        print("WARNING: No API keys configured. Set GEMINI_API_KEY or OPENAI_API_KEY")


@app.on_event("shutdown")
async def shutdown_event():
    """
    Execute on application shutdown.
    """
    print("Shutting down...")


@app.get("")
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
from app.routes import health
from app.routes import chat

app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(chat.router)


# Static file serving for React frontend
FRONTEND_BUILD_DIR = Path(__file__).parent.parent / "frontend" / "dist"


def setup_static_files():
    """
    Setup static file serving for the React frontend.
    Only enabled if the frontend build directory exists.
    """
    if FRONTEND_BUILD_DIR.exists():
        # Serve static assets (JS, CSS, images)
        assets_dir = FRONTEND_BUILD_DIR / "assets"
        if assets_dir.exists():
            app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

        # Serve other static files
        app.mount("/static", StaticFiles(directory=str(FRONTEND_BUILD_DIR)), name="static")

        @app.get("/{path:path}", include_in_schema=False)
        async def serve_spa(request: Request, path: str):
            """
            SPA fallback - serve index.html for client-side routing.
            Skip API routes.
            """
            # Skip API routes
            if path.startswith("api/") or path.startswith("docs") or path.startswith("redoc") or path.startswith("health"):
                return None

            # Try to serve the requested file
            file_path = FRONTEND_BUILD_DIR / path
            if file_path.exists() and file_path.is_file():
                return FileResponse(str(file_path))

            # Fallback to index.html for SPA routing
            index_path = FRONTEND_BUILD_DIR / "index.html"
            if index_path.exists():
                return FileResponse(str(index_path))

            return HTMLResponse(content="Not Found", status_code=404)

        print(f"Frontend static files enabled: {FRONTEND_BUILD_DIR}")
    else:
        print(f"Frontend not built. Run 'pnpm build' in frontend/ to enable static serving.")


# Setup static files after app creation
setup_static_files()


# For standalone execution
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=settings.HOST, port=int(settings.PORT))
