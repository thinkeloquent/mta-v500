"""
File repository for database operations.
"""

from typing import List, Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.file import File
from app.repositories.base import BaseRepository


class FileRepository(BaseRepository[File]):
    """
    Repository for File model operations.
    """

    def __init__(self, db: AsyncSession):
        super().__init__(File, db)

    async def get_files_by_project(
        self, project_id: str, skip: int = 0, limit: Optional[int] = None
    ) -> List[File]:
        """
        Get all files for a specific project.

        Args:
            project_id: Project ID
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of files
        """
        stmt = (
            select(self.model)
            .where(self.model.project_id == project_id)
            .order_by(self.model.path, self.model.name)
        )

        if skip:
            stmt = stmt.offset(skip)

        if limit:
            stmt = stmt.limit(limit)

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_file_by_name_and_project(
        self, project_id: str, name: str, path: Optional[str] = None
    ) -> Optional[File]:
        """
        Get a file by name and project (with optional path).

        Args:
            project_id: Project ID
            name: File name
            path: File path (optional)

        Returns:
            File or None if not found
        """
        stmt = select(self.model).where(
            self.model.project_id == project_id,
            self.model.name == name
        )

        if path is not None:
            stmt = stmt.where(self.model.path == path)
        else:
            stmt = stmt.where(self.model.path.is_(None))

        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def search_files_by_name(
        self, project_id: str, name: str
    ) -> List[File]:
        """
        Search files by name within a project (case-insensitive partial match).

        Args:
            project_id: Project ID
            name: Name to search for

        Returns:
            List of matching files
        """
        stmt = (
            select(self.model)
            .where(
                self.model.project_id == project_id,
                self.model.name.ilike(f"%{name}%")
            )
            .order_by(self.model.path, self.model.name)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
