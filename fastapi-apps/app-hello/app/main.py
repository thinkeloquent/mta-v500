"""Hello standalone FastAPI application.

This app can run independently or be mounted as a sub-app in the parent application.
"""

from fastapi import FastAPI
from .routes import router

# Create standalone FastAPI app
app = FastAPI(
    title="Hello Service",
    description="A standalone hello service that can run independently or as a sub-app",
    version="0.1.0",
    root_path="",  # Will be overridden when mounted as sub-app
)

# Include routes
app.include_router(router, tags=["hello"])


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "service": "hello"}


# For standalone execution
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
