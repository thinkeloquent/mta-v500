"""
Project repository for database operations.
"""

from typing import List, Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.project import Project
from app.repositories.base import BaseRepository


class ProjectRepository(BaseRepository[Project]):
    """
    Repository for Project model operations.
    """

    def __init__(self, db: AsyncSession):
        super().__init__(Project, db)

    async def get_all_with_files(
        self, skip: int = 0, limit: Optional[int] = None
    ) -> List[Project]:
        """
        Get all projects with their files eagerly loaded.

        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of projects with files
        """
        stmt = (
            select(self.model)
            .options(selectinload(Project.files))
            .order_by(desc(Project.updated_at))
        )

        if skip:
            stmt = stmt.offset(skip)

        if limit:
            stmt = stmt.limit(limit)

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id_with_files(self, id: str) -> Optional[Project]:
        """
        Get a single project by ID with files eagerly loaded.

        Args:
            id: Project ID

        Returns:
            Project with files or None if not found
        """
        stmt = (
            select(self.model)
            .options(selectinload(Project.files))
            .where(self.model.id == id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def search_by_name(self, name: str) -> List[Project]:
        """
        Search projects by name (case-insensitive partial match).

        Args:
            name: Name to search for

        Returns:
            List of matching projects
        """
        stmt = (
            select(self.model)
            .where(self.model.name.ilike(f"%{name}%"))
            .order_by(desc(Project.updated_at))
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
