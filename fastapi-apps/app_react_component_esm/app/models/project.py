"""
Project model for SQLAlchemy.
"""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base
from app.config import settings


class Project(Base):
    """
    Project model representing a code project container.
    A project can contain multiple files.
    """

    __tablename__ = "react_component_esm_projects"
    __table_args__ = {"schema": settings.POSTGRES_SCHEMA}

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Project metadata
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    files = relationship(
        "File",
        back_populates="project",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Project(id={self.id}, name={self.name})>"
