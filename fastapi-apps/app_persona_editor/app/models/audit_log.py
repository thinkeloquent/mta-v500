"""
AuditLog SQLAlchemy model.
"""

from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.database import Base


class AuditLog(Base):
    """
    Audit log model for tracking persona changes.

    Attributes:
        id: Unique identifier (format: 'audit-{uuid}')
        timestamp: Audit event timestamp (auto-generated, indexed)
        persona_id: Foreign key to personas table (CASCADE delete, indexed)
        action: Action type (CREATE/UPDATE/DELETE, indexed)
        user_id: User identifier (default: 'system')
        changes: JSON-serialized changes (TEXT field)
        ip_address: Optional IP address of user
    """

    __tablename__ = "persona_editor_audit_logs"

    # Primary key
    id = Column(String, primary_key=True, index=True)

    # Audit metadata
    timestamp = Column(DateTime, nullable=False, default=datetime.now, index=True)
    persona_id = Column(
        String,
        ForeignKey("persona_editor_personas.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    action = Column(String, nullable=False, index=True)
    user_id = Column(String, nullable=False, default="system")

    # Audit data
    changes = Column(Text, nullable=False)
    ip_address = Column(String, nullable=True)

    # Relationships
    persona = relationship("Persona", back_populates="audit_logs")

    # Composite indexes for common queries
    __table_args__ = (
        Index("idx_audit_persona_timestamp", "persona_id", "timestamp"),
        Index("idx_audit_action_timestamp", "action", "timestamp"),
    )

    def __repr__(self) -> str:
        return f"<AuditLog(id='{self.id}', persona_id='{self.persona_id}', action='{self.action}')>"
