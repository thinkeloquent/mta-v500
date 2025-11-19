"""Simplified SDK for Figma Dev Resources API."""
from typing import List, Dict, Any, Optional

from ..client import FigmaHttpClient
from ..models import DevResource


class DevResourcesAPI:
    """
    Simplified SDK for Figma Dev Resources API.

    Provides methods for:
    - Listing dev resources
    - Creating dev resources
    - Updating dev resources
    - Deleting dev resources
    """

    def __init__(self, client: FigmaHttpClient):
        """
        Initialize Dev Resources API.

        Args:
            client: Shared HTTP client
        """
        self.client = client

    async def list(self, file_key: str, node_id: Optional[str] = None) -> List[DevResource]:
        """
        List dev resources for a file or specific node.

        Args:
            file_key: The file key
            node_id: Optional node ID to filter by

        Returns:
            List of DevResource objects

        Example:
            >>> resources = await api.dev_resources.list("abc123")
            >>> for resource in resources:
            >>>     print(f"{resource.name}: {resource.url}")
        """
        params = {}
        if node_id:
            params["node_id"] = node_id

        response = await self.client.get(
            f"files/{file_key}/dev_resources",
            params=params,
        )
        return [DevResource(**r) for r in response.get("dev_resources", [])]

    async def create(
        self,
        file_key: str,
        node_id: str,
        name: str,
        url: str,
    ) -> DevResource:
        """
        Create a new dev resource.

        Args:
            file_key: The file key
            node_id: The node ID to attach the resource to
            name: Resource name
            url: Resource URL

        Returns:
            Created DevResource object

        Example:
            >>> resource = await api.dev_resources.create(
            ...     "abc123",
            ...     "1:2",
            ...     "Implementation PR",
            ...     "https://github.com/org/repo/pull/123"
            ... )
        """
        body = {
            "node_id": node_id,
            "name": name,
            "url": url,
        }
        response = await self.client.post(
            f"files/{file_key}/dev_resources",
            json=body,
        )
        return DevResource(**response)

    async def update(
        self,
        file_key: str,
        resource_id: str,
        name: Optional[str] = None,
        url: Optional[str] = None,
    ) -> DevResource:
        """
        Update a dev resource.

        Args:
            file_key: The file key
            resource_id: The resource ID
            name: New name (optional)
            url: New URL (optional)

        Returns:
            Updated DevResource object

        Example:
            >>> resource = await api.dev_resources.update(
            ...     "abc123",
            ...     "resource123",
            ...     name="Updated PR"
            ... )
        """
        body: Dict[str, Any] = {}
        if name:
            body["name"] = name
        if url:
            body["url"] = url

        response = await self.client.patch(
            f"files/{file_key}/dev_resources/{resource_id}",
            json=body,
        )
        return DevResource(**response)

    async def delete(self, file_key: str, resource_id: str) -> Dict[str, Any]:
        """
        Delete a dev resource.

        Args:
            file_key: The file key
            resource_id: The resource ID

        Returns:
            Success response

        Example:
            >>> await api.dev_resources.delete("abc123", "resource123")
        """
        return await self.client.delete(
            f"files/{file_key}/dev_resources/{resource_id}"
        )
