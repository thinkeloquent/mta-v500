"""Models for Projects API."""
from typing import List, Optional
from datetime import datetime
from pydantic import Field

from ..models import FigmaBaseModel, Project as BaseProject, FileMetadata


class ProjectFiles(FigmaBaseModel):
    """Files in a project."""

    files: List[FileMetadata]


class TeamProjects(FigmaBaseModel):
    """Projects in a team."""

    projects: List[BaseProject]
