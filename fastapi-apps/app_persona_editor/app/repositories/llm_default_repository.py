"""
LLMDefault repository for database operations.
"""

from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.llm_default import LLMDefault, LLMDefaultCategory
from app.repositories.base import BaseRepository


class LLMDefaultRepository(BaseRepository[LLMDefault]):
    """
    Repository for LLMDefault model with specific query methods.
    """

    def __init__(self, db: AsyncSession):
        super().__init__(LLMDefault, db)

    async def get_by_category(self, category: LLMDefaultCategory) -> List[LLMDefault]:
        """
        Get all LLM defaults for a specific category.

        Args:
            category: LLM default category

        Returns:
            List of LLM defaults for the category
        """
        stmt = select(LLMDefault).where(LLMDefault.category == category)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_default_by_category(
        self, category: LLMDefaultCategory
    ) -> Optional[LLMDefault]:
        """
        Get the default LLM default for a specific category.

        Args:
            category: LLM default category

        Returns:
            Default LLM default for the category or None
        """
        stmt = select(LLMDefault).where(
            LLMDefault.category == category, LLMDefault.is_default == True
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def set_as_default(self, llm_default_id: str) -> None:
        """
        Set an LLM default as the default for its category.
        Unsets any other default in the same category.

        Args:
            llm_default_id: LLM default ID to set as default
        """
        # Get the LLM default
        llm_default = await self.get_by_id(llm_default_id)
        if not llm_default:
            return

        # Unset all defaults in the same category
        category = llm_default.category
        stmt = select(LLMDefault).where(
            LLMDefault.category == category, LLMDefault.is_default == True
        )
        result = await self.db.execute(stmt)
        current_defaults = result.scalars().all()

        for default in current_defaults:
            default.is_default = False

        # Set this one as default
        llm_default.is_default = True
        await self.db.flush()

    async def unset_default_for_category(self, category: LLMDefaultCategory) -> None:
        """
        Unset the default for a specific category.

        Args:
            category: LLM default category
        """
        stmt = select(LLMDefault).where(
            LLMDefault.category == category, LLMDefault.is_default == True
        )
        result = await self.db.execute(stmt)
        current_defaults = result.scalars().all()

        for default in current_defaults:
            default.is_default = False

        await self.db.flush()
