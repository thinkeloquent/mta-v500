"""
Persona repository for database operations.
"""

from typing import List, Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.persona import Persona
from app.repositories.base import BaseRepository


class PersonaRepository(BaseRepository[Persona]):
    """
    Repository for Persona model with specific query methods.
    """

    def __init__(self, db: AsyncSession):
        super().__init__(Persona, db)

    async def get_all_ordered_by_updated(
        self, skip: int = 0, limit: Optional[int] = None
    ) -> List[Persona]:
        """
        Get all personas ordered by last_updated DESC.

        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of personas ordered by last_updated DESC
        """
        return await self.get_all(skip=skip, limit=limit, order_by=desc(Persona.last_updated))

    async def get_by_id_with_audit_logs(self, persona_id: str) -> Optional[Persona]:
        """
        Get persona by ID with audit logs eager loaded.

        Args:
            persona_id: Persona ID

        Returns:
            Persona with audit logs or None if not found
        """
        stmt = (
            select(Persona)
            .where(Persona.id == persona_id)
            .options(selectinload(Persona.audit_logs))
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_role(self, role: str) -> List[Persona]:
        """
        Get all personas with specified role.

        Args:
            role: Persona role

        Returns:
            List of personas with specified role
        """
        stmt = select(Persona).where(Persona.role == role)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def search_by_name(self, name_query: str) -> List[Persona]:
        """
        Search personas by name (case-insensitive partial match).

        Args:
            name_query: Name search query

        Returns:
            List of matching personas
        """
        stmt = select(Persona).where(Persona.name.ilike(f"%{name_query}%"))
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
