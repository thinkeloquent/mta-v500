"""
Pydantic schemas for File model.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# Base schema with common fields
class FileBase(BaseModel):
    """Base file schema with common fields."""
    name: str = Field(..., min_length=1, max_length=255, description="File name")
    path: Optional[str] = Field(None, max_length=512, description="Folder path within project")
    content: str = Field(default="", description="File content")
    language: str = Field(default="javascript", max_length=50, description="Programming language")


# Schema for creating a new file
class FileCreate(FileBase):
    """Schema for creating a new file."""
    project_id: UUID


# Schema for updating a file
class FileUpdate(BaseModel):
    """Schema for updating a file. All fields are optional."""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="File name")
    path: Optional[str] = Field(None, max_length=512, description="Folder path")
    content: Optional[str] = Field(None, description="File content")
    language: Optional[str] = Field(None, max_length=50, description="Programming language")


# Schema for file in responses (with metadata)
class File(FileBase):
    """Complete file schema for responses."""
    id: UUID
    project_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Schema for file without project reference (to avoid circular dependencies)
class FileInProject(BaseModel):
    """Simplified file schema for use in Project responses."""
    id: UUID
    name: str
    path: Optional[str]
    language: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
