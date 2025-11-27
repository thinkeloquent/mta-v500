"""
Schemas package.
"""

from app.schemas.project import (
    ProjectBase,
    ProjectCreate,
    ProjectUpdate,
    Project,
    ProjectWithFiles,
)
from app.schemas.file import (
    FileBase,
    FileCreate,
    FileUpdate,
    File,
    FileInProject,
)

# Rebuild Pydantic models to resolve forward references
# This is needed because ProjectWithFiles references FileInProject
ProjectWithFiles.model_rebuild()

__all__ = [
    "ProjectBase",
    "ProjectCreate",
    "ProjectUpdate",
    "Project",
    "ProjectWithFiles",
    "FileBase",
    "FileCreate",
    "FileUpdate",
    "File",
    "FileInProject",
]
