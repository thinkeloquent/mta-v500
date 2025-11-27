"""
Routes package for API endpoints.

Import and register your routers here for cleaner main.py imports.

Example:
    from app.routes import users, items, health

    # In main.py:
    app.include_router(users.router, prefix="/users", tags=["users"])
    app.include_router(items.router, prefix="/items", tags=["items"])
"""

from app.routes import health

__all__ = ["health"]
