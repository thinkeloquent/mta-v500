"""
File model for SQLAlchemy.
"""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base
from app.config import settings


class File(Base):
    """
    File model representing a code file within a project.
    Stores code content, file path, and metadata.
    """

    __tablename__ = "react_component_esm_files"
    __table_args__ = {"schema": settings.POSTGRES_SCHEMA}

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign key to project
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey(f"{settings.POSTGRES_SCHEMA}.react_component_esm_projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # File metadata
    name = Column(String(255), nullable=False, index=True)
    path = Column(String(512), nullable=True)  # Folder path within project (e.g., "src/components")
    content = Column(Text, nullable=False, default="")
    language = Column(String(50), nullable=False, default="javascript")  # js, ts, py, css, html, json, etc.

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="files")

    def __repr__(self) -> str:
        return f"<File(id={self.id}, name={self.name}, language={self.language})>"

    @property
    def full_path(self) -> str:
        """
        Get the full file path including folder path.
        """
        if self.path:
            return f"{self.path}/{self.name}"
        return self.name
