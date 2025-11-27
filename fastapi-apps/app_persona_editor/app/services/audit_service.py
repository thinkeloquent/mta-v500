"""
Audit logging service for tracking persona changes.
"""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.utils.id_generator import generate_audit_id


async def create_audit_log(
    db: AsyncSession,
    persona_id: str,
    action: str,
    changes: Dict[str, Any],
    user_id: str = "system",
    ip_address: Optional[str] = None,
) -> AuditLog:
    """
    Create an audit log entry.

    Args:
        db: Database session
        persona_id: ID of the persona being modified
        action: Action type (CREATE/UPDATE/DELETE)
        changes: Dictionary of changes
        user_id: User who performed the action (default: 'system')
        ip_address: IP address of the user (optional)

    Returns:
        Created AuditLog instance
    """
    audit_log = AuditLog(
        id=generate_audit_id(),
        timestamp=datetime.now(),
        persona_id=persona_id,
        action=action,
        user_id=user_id,
        changes=json.dumps(changes),  # Serialize dict to JSON string
        ip_address=ip_address,
    )

    db.add(audit_log)
    await db.flush()  # Flush to ensure it's written
    # Let get_db() auto-commit after route completes

    return audit_log


async def get_persona_audit_logs(
    db: AsyncSession, persona_id: str, limit: int = 100
) -> List[AuditLog]:
    """
    Get audit logs for a specific persona.

    Args:
        db: Database session
        persona_id: Persona ID
        limit: Maximum number of logs to return (default: 100)

    Returns:
        List of audit logs ordered by timestamp DESC
    """
    stmt = (
        select(AuditLog)
        .where(AuditLog.persona_id == persona_id)
        .order_by(desc(AuditLog.timestamp))
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_recent_audit_logs(
    db: AsyncSession, limit: int = 50
) -> List[AuditLog]:
    """
    Get recent audit logs across all personas.

    Args:
        db: Database session
        limit: Maximum number of logs to return (default: 50)

    Returns:
        List of recent audit logs ordered by timestamp DESC
    """
    stmt = select(AuditLog).order_by(desc(AuditLog.timestamp)).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())
