"""Projects API SDK for Jira."""

from typing import List, Optional

from jira_api.client import JiraHttpClient
from jira_api.projects.models import (
    Component,
    IssueType,
    Project,
    ProjectVersion,
    ProjectVersionCreate,
)


class ProjectsAPI:
    """
    Projects API for Jira operations.

    Provides methods for project management, versions, and components.
    """

    def __init__(self, client: JiraHttpClient):
        """
        Initialize Projects API.

        Args:
            client: Configured Jira HTTP client
        """
        self.client = client

    async def get(self, project_key: str, expand: Optional[List[str]] = None) -> Project:
        """
        Get project details by key.

        Args:
            project_key: Project key (e.g., "PROJ")
            expand: List of fields to expand (e.g., ["description", "issueTypes"])

        Returns:
            Project object

        Example:
            >>> project = await jira.projects.get("PROJ")
            >>> print(f"Project: {project.name}")
        """
        params = {}
        if expand:
            params["expand"] = ",".join(expand)

        response = await self.client.get(f"project/{project_key}", params=params)
        return Project(**response)

    async def list(
        self,
        max_results: int = 50,
        start_at: int = 0,
    ) -> List[Project]:
        """
        List all projects.

        Args:
            max_results: Maximum number of results to return
            start_at: Index of the first result

        Returns:
            List of Project objects

        Example:
            >>> projects = await jira.projects.list()
            >>> for project in projects:
            >>>     print(f"{project.key}: {project.name}")
        """
        params = {
            "maxResults": max_results,
            "startAt": start_at,
        }

        response = await self.client.get("project/search", params=params)

        # Extract values from paginated response
        if "values" in response:
            return [Project(**project) for project in response["values"]]
        return []

    async def get_versions(self, project_key: str) -> List[ProjectVersion]:
        """
        Get all versions for a project.

        Args:
            project_key: Project key

        Returns:
            List of ProjectVersion objects

        Example:
            >>> versions = await jira.projects.get_versions("PROJ")
            >>> for version in versions:
            >>>     print(f"{version.name} - Released: {version.released}")
        """
        response = await self.client.get(f"project/{project_key}/versions")

        if isinstance(response, list):
            return [ProjectVersion(**version) for version in response]
        return []

    async def create_version(
        self,
        version_data: ProjectVersionCreate,
    ) -> ProjectVersion:
        """
        Create a new version in a project.

        Args:
            version_data: Version creation data

        Returns:
            Created ProjectVersion object

        Example:
            >>> from jira_api.projects import ProjectVersionCreate
            >>> version_data = ProjectVersionCreate(
            >>>     name="1.0.0",
            >>>     project_id="10000",
            >>>     description="First release"
            >>> )
            >>> version = await jira.projects.create_version(version_data)
        """
        payload = version_data.model_dump(by_alias=True, exclude_none=True)
        response = await self.client.post("version", json=payload)
        return ProjectVersion(**response)

    async def get_components(self, project_key: str) -> List[Component]:
        """
        Get all components for a project.

        Args:
            project_key: Project key

        Returns:
            List of Component objects

        Example:
            >>> components = await jira.projects.get_components("PROJ")
            >>> for component in components:
            >>>     print(f"{component.name}: {component.description}")
        """
        response = await self.client.get(f"project/{project_key}/components")

        if isinstance(response, list):
            return [Component(**component) for component in response]
        return []

    async def get_issue_types(self, project_key: str) -> List[IssueType]:
        """
        Get available issue types for a project.

        Args:
            project_key: Project key

        Returns:
            List of IssueType objects

        Example:
            >>> issue_types = await jira.projects.get_issue_types("PROJ")
            >>> for it in issue_types:
            >>>     print(f"ID: {it.id}, Name: {it.name}")
        """
        # Get project with issue types expanded
        project = await self.get(project_key, expand=["issueTypes"])

        if project.issue_types:
            return project.issue_types
        return []
