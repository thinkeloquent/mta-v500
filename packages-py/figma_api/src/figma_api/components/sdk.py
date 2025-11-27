"""Simplified SDK for Figma Components API."""
from typing import Dict, Any

from ..client import FigmaHttpClient
from .models import ComponentMetadata, TeamComponentsResponse


class ComponentsAPI:
    """
    Simplified SDK for Figma Components API.

    Provides methods for:
    - Getting component metadata
    - Getting component sets
    - Getting team components
    """

    def __init__(self, client: FigmaHttpClient):
        """
        Initialize Components API.

        Args:
            client: Shared HTTP client
        """
        self.client = client

    async def get(self, component_key: str) -> ComponentMetadata:
        """
        Get metadata for a component.

        Args:
            component_key: The component key

        Returns:
            ComponentMetadata object

        Example:
            >>> component = await api.components.get("abc123")
            >>> print(f"{component.name}: {component.description}")
        """
        response = await self.client.get(f"components/{component_key}")
        return ComponentMetadata(**response.get("meta", {}))

    async def get_set(self, component_set_key: str) -> Dict[str, Any]:
        """
        Get metadata for a component set.

        Args:
            component_set_key: The component set key

        Returns:
            Component set metadata

        Example:
            >>> comp_set = await api.components.get_set("abc123")
            >>> print(comp_set)
        """
        response = await self.client.get(f"component_sets/{component_set_key}")
        return response.get("meta", {})

    async def get_team_components(
        self,
        team_id: str,
        page_size: int = 100,
    ) -> TeamComponentsResponse:
        """
        Get all components for a team.

        Args:
            team_id: The team ID
            page_size: Number of components per page

        Returns:
            TeamComponentsResponse with all components

        Example:
            >>> components = await api.components.get_team_components("123456")
            >>> for key, component in components.meta.items():
            >>>     print(f"{key}: {component}")
        """
        response = await self.client.get(
            f"teams/{team_id}/components",
            params={"page_size": page_size},
        )
        return TeamComponentsResponse(**response)
