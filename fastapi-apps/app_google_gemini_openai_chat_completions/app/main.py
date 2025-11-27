"""
FastAPI main application entry point for Google Gemini OpenAI Chat Completions.

Provides chat completion endpoints using Google Gemini via the OpenAI-compatible API.
"""

import re
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import close_db
from app.middleware import add_exception_handlers, LoggingMiddleware

from fetch_proxy_dispatcher import (
    create_proxy_dispatcher_factory,
    FactoryConfig,
    ProxyUrlConfig,
    AgentProxyConfig,
)


# =============================================================================
# Proxy Configuration
# =============================================================================

# Configure proxy settings here (primary configuration)
# Environment variables (HTTP_PROXY, PROXY_*_URL) are used as fallback
PROXY_CONFIG = FactoryConfig(
    # Explicit proxy URLs per environment (optional)
    proxy_urls=ProxyUrlConfig(
        DEV=None,  # No proxy in dev
        STAGE=None,
        QA=None,
        PROD=None,  # Set to "http://proxy.company.com:8080" if needed
    ),
    # Agent proxy override (optional)
    agent_proxy=AgentProxyConfig(
        http_proxy=None,  # Falls back to HTTP_PROXY env var
        https_proxy=None,  # Falls back to HTTPS_PROXY env var
    ),
    # SSL certificates (optional)
    cert=None,  # Path to client certificate or (cert, key) tuple
    ca_bundle=None,  # Path to CA bundle for SSL verification
)

# Create factory instance
proxy_factory = create_proxy_dispatcher_factory(config=PROXY_CONFIG)


def redact_url_password(url: str) -> str:
    """
    Redact password from connection URL for safe logging.
    """
    # Replace password in URL with '***'
    return re.sub(r':([^:@]+)@', r':***@', url)


# Create FastAPI application
app = FastAPI(
    title="Google Gemini OpenAI Chat Completions API",
    description="""
# Google Gemini Chat Completions API

OpenAI-compatible chat completions API powered by Google Gemini.

## Features

- **Chat Completion**: Send messages and get AI-generated responses
- **Structured Output**: Get JSON responses constrained by a schema
- **OpenAI Compatible**: Uses the OpenAI API format for easy integration

## Authentication

Set the `GEMINI_API_KEY` environment variable with your Google AI API key.

## Models

Default model: `gemini-2.0-flash`

Available models depend on your Google AI API access.
    """,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    docs_url="/docs",
    redoc_url=None,  # Disable ReDoc
    swagger_ui_oauth2_redirect_url=None,  # Disable OAuth2 redirect
    openapi_tags=[
        {
            "name": "chat",
            "description": "Chat completion endpoints",
        },
        {
            "name": "health",
            "description": "Health check endpoints",
        },
    ],
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
    # Store proxy factory in app state for routes to access
    app.state.proxy_factory = proxy_factory

    print(f"{settings.APP_NAME} v{settings.APP_VERSION} starting...")
    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"Database: {settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}")
    print(f"Redis: {redact_url_password(settings.redis_url)}")


@app.on_event("shutdown")
async def shutdown_event():
    """
    Execute on application shutdown.
    Cleanup database connections.
    """
    print("Shutting down...")
    await close_db()


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
from app.routes import health, chat

app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(chat.router, tags=["chat"])


# For standalone execution
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(settings.PORT))
