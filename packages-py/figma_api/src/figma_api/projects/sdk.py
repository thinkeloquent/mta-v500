"""Simplified SDK for Figma Projects API."""
from typing import List

from ..client import FigmaHttpClient
from .models import ProjectFiles, TeamProjects
from ..models import Project, FileMetadata


class ProjectsAPI:
    """
    Simplified SDK for Figma Projects API.

    Provides methods for:
    - Listing team projects
    - Getting project files
    """

    def __init__(self, client: FigmaHttpClient):
        """
        Initialize Projects API.

        Args:
            client: Shared HTTP client
        """
        self.client = client

    async def list_team_projects(self, team_id: str) -> List[Project]:
        """
        List all projects in a team.

        Args:
            team_id: The team ID

        Returns:
            List of Project objects

        Example:
            >>> projects = await api.projects.list_team_projects("123456")
            >>> for project in projects:
            >>>     print(f"{project.id}: {project.name}")
        """
        response = await self.client.get(f"teams/{team_id}/projects")
        return [Project(**p) for p in response.get("projects", [])]

    async def get_files(self, project_id: str) -> List[FileMetadata]:
        """
        Get all files in a project.

        Args:
            project_id: The project ID

        Returns:
            List of FileMetadata objects

        Example:
            >>> files = await api.projects.get_files("123456")
            >>> for file in files:
            >>>     print(f"{file.key}: {file.name}")
        """
        response = await self.client.get(f"projects/{project_id}/files")
        return [FileMetadata(**f) for f in response.get("files", [])]
