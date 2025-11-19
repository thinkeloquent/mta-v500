"""
Base repository class for common database operations.
"""

from typing import Generic, TypeVar, Type, Optional, List
from sqlalchemy import select, delete as sql_delete, update as sql_update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """
    Base repository providing common CRUD operations.

    Type Parameters:
        ModelType: SQLAlchemy model class
    """

    def __init__(self, model: Type[ModelType], db: AsyncSession):
        """
        Initialize repository.

        Args:
            model: SQLAlchemy model class
            db: Async database session
        """
        self.model = model
        self.db = db

    async def create(self, obj: ModelType) -> ModelType:
        """
        Create a new record.

        Args:
            obj: Model instance to create

        Returns:
            Created model instance with populated fields
        """
        self.db.add(obj)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def get_by_id(self, id: str) -> Optional[ModelType]:
        """
        Get record by ID.

        Args:
            id: Record ID

        Returns:
            Model instance or None if not found
        """
        stmt = select(self.model).where(self.model.id == id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all(
        self, skip: int = 0, limit: Optional[int] = None, order_by=None
    ) -> List[ModelType]:
        """
        Get all records with optional pagination and ordering.

        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            order_by: Column to order by (e.g., desc(Model.created_at))

        Returns:
            List of model instances
        """
        stmt = select(self.model)

        if order_by is not None:
            stmt = stmt.order_by(order_by)

        if skip:
            stmt = stmt.offset(skip)

        if limit:
            stmt = stmt.limit(limit)

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def update(self, obj: ModelType) -> ModelType:
        """
        Update an existing record.

        Args:
            obj: Model instance with updated fields

        Returns:
            Updated model instance
        """
        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def delete(self, obj: ModelType) -> None:
        """
        Delete a record.

        Args:
            obj: Model instance to delete
        """
        await self.db.delete(obj)
        await self.db.flush()

    async def delete_by_id(self, id: str) -> bool:
        """
        Delete record by ID.

        Args:
            id: Record ID

        Returns:
            True if deleted, False if not found
        """
        stmt = sql_delete(self.model).where(self.model.id == id)
        result = await self.db.execute(stmt)
        await self.db.flush()
        return result.rowcount > 0

    async def exists(self, id: str) -> bool:
        """
        Check if record exists by ID.

        Args:
            id: Record ID

        Returns:
            True if exists, False otherwise
        """
        obj = await self.get_by_id(id)
        return obj is not None
