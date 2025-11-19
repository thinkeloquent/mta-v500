"""
Pydantic schemas for Project model.
"""

from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from uuid import UUID

from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from app.schemas.file import FileInProject


# Base schema with common fields
class ProjectBase(BaseModel):
    """Base project schema with common fields."""
    name: str = Field(..., min_length=1, max_length=255, description="Project name")
    description: Optional[str] = Field(None, description="Project description")


# Schema for creating a new project
class ProjectCreate(ProjectBase):
    """Schema for creating a new project."""
    pass


# Schema for updating a project
class ProjectUpdate(BaseModel):
    """Schema for updating a project. All fields are optional."""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Project name")
    description: Optional[str] = Field(None, description="Project description")


# Schema for project in responses (with metadata)
class Project(ProjectBase):
    """Complete project schema for responses."""
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True  # Previously orm_mode in Pydantic v1


# Schema for project with files included
class ProjectWithFiles(Project):
    """Project schema with files relationship."""
    files: List["FileInProject"] = []

    class Config:
        from_attributes = True
