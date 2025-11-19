"""
Example route module.

This demonstrates the pattern for creating auto-loadable routes.
Each route module should export an APIRouter instance named 'router'.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/example", tags=["example"])


@router.get("/ping")
async def ping():
    """Simple ping endpoint to test route auto-loading."""
    return {"message": "pong from example routes"}


@router.get("/info")
async def info():
    """Get information about this route module."""
    return {
        "module": "example",
        "status": "active",
        "description": "Auto-loaded route example"
    }
