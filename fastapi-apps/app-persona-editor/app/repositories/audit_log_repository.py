"""
AuditLog repository for database operations.
"""

from typing import List
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.repositories.base import BaseRepository


class AuditLogRepository(BaseRepository[AuditLog]):
    """
    Repository for AuditLog model with specific query methods.
    """

    def __init__(self, db: AsyncSession):
        super().__init__(AuditLog, db)

    async def get_by_persona_id(
        self, persona_id: str, limit: int = 100
    ) -> List[AuditLog]:
        """
        Get audit logs for a specific persona ordered by timestamp DESC.

        Args:
            persona_id: Persona ID
            limit: Maximum number of records to return (default: 100)

        Returns:
            List of audit logs for the persona
        """
        stmt = (
            select(AuditLog)
            .where(AuditLog.persona_id == persona_id)
            .order_by(desc(AuditLog.timestamp))
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_recent_logs(self, limit: int = 50) -> List[AuditLog]:
        """
        Get recent audit logs across all personas.

        Args:
            limit: Maximum number of records to return (default: 50)

        Returns:
            List of recent audit logs ordered by timestamp DESC
        """
        stmt = select(AuditLog).order_by(desc(AuditLog.timestamp)).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_by_action(self, action: str, limit: int = 100) -> List[AuditLog]:
        """
        Get audit logs by action type.

        Args:
            action: Action type (e.g., 'CREATE', 'UPDATE', 'DELETE')
            limit: Maximum number of records to return (default: 100)

        Returns:
            List of audit logs with specified action
        """
        stmt = (
            select(AuditLog)
            .where(AuditLog.action == action)
            .order_by(desc(AuditLog.timestamp))
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
