"""
Pydantic schemas for AuditLog model.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    """
    Schema for audit log responses.
    Audit logs are read-only (no create/update schemas).
    """

    id: str
    timestamp: datetime
    persona_id: str
    action: str
    user_id: str
    changes: str
    ip_address: Optional[str] = None

    model_config = {"from_attributes": True}
