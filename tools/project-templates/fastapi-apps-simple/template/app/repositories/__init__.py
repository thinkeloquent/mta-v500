"""
Repository package for data access layer.

Repositories encapsulate database operations and provide a clean interface
for services to interact with the database.

Example:
    from app.repositories.user_repository import UserRepository
    from app.repositories.item_repository import ItemRepository

    __all__ = ["UserRepository", "ItemRepository"]
"""

from app.repositories.base import BaseRepository

__all__ = ["BaseRepository"]
