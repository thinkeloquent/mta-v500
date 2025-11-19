"""Simplified SDK for Figma Files API."""
from typing import Dict, List, Optional, Any

from ..client import FigmaHttpClient
from .models import File, FileNodesResponse, ImageFillsResponse, ImagesResponse


class FilesAPI:
    """
    Simplified SDK for Figma Files API.

    Provides methods for:
    - Getting file content
    - Getting specific nodes
    - Getting file versions
    - Rendering images
    - Getting image fills
    """

    def __init__(self, client: FigmaHttpClient):
        """
        Initialize Files API.

        Args:
            client: Shared HTTP client
        """
        self.client = client

    async def get(
        self,
        file_key: str,
        version: Optional[str] = None,
        ids: Optional[List[str]] = None,
        depth: Optional[int] = None,
        geometry: str = "paths",
        plugin_data: Optional[str] = None,
        branch_data: bool = False,
    ) -> File:
        """
        Get file content.

        Args:
            file_key: The file key
            version: Specific version ID (optional)
            ids: List of node IDs to retrieve (optional)
            depth: Depth of node tree to return (optional)
            geometry: Whether to return path geometry data ("paths" or "paths_absolute")
            plugin_data: Comma-separated list of plugin IDs to return data for
            branch_data: Whether to return branch metadata

        Returns:
            File object with full document structure

        Example:
            >>> file = await api.files.get("abc123")
            >>> print(file.name)
            >>> print(file.document.children)
        """
        params: Dict[str, Any] = {"geometry": geometry}

        if version:
            params["version"] = version
        if ids:
            params["ids"] = ",".join(ids)
        if depth is not None:
            params["depth"] = depth
        if plugin_data:
            params["plugin_data"] = plugin_data
        if branch_data:
            params["branch_data"] = "true"

        response = await self.client.get(f"files/{file_key}", params=params)
        return File(**response)

    async def get_nodes(
        self,
        file_key: str,
        node_ids: List[str],
        version: Optional[str] = None,
        depth: Optional[int] = None,
        geometry: str = "paths",
        plugin_data: Optional[str] = None,
    ) -> FileNodesResponse:
        """
        Get specific nodes from a file.

        Args:
            file_key: The file key
            node_ids: List of node IDs to retrieve
            version: Specific version ID (optional)
            depth: Depth of node tree to return (optional)
            geometry: Whether to return path geometry data
            plugin_data: Comma-separated list of plugin IDs

        Returns:
            FileNodesResponse with requested nodes

        Example:
            >>> nodes = await api.files.get_nodes("abc123", ["1:2", "3:4"])
            >>> for node_id, node_data in nodes.nodes.items():
            >>>     print(f"{node_id}: {node_data}")
        """
        params: Dict[str, Any] = {
            "ids": ",".join(node_ids),
            "geometry": geometry,
        }

        if version:
            params["version"] = version
        if depth is not None:
            params["depth"] = depth
        if plugin_data:
            params["plugin_data"] = plugin_data

        response = await self.client.get(f"files/{file_key}/nodes", params=params)
        return FileNodesResponse(**response)

    async def get_images(
        self,
        file_key: str,
        node_ids: List[str],
        scale: float = 1.0,
        format: str = "png",
        svg_include_id: bool = False,
        svg_simplify_stroke: bool = True,
        use_absolute_bounds: bool = False,
        version: Optional[str] = None,
    ) -> ImagesResponse:
        """
        Render images from file nodes.

        Args:
            file_key: The file key
            node_ids: List of node IDs to render
            scale: Scale factor (0.01 to 4.0)
            format: Image format ("png", "jpg", "svg", "pdf")
            svg_include_id: Include id attributes in SVG
            svg_simplify_stroke: Simplify inside/outside strokes in SVG
            use_absolute_bounds: Use absolute bounding box for rendering
            version: Specific version ID (optional)

        Returns:
            ImagesResponse with URLs to rendered images

        Example:
            >>> images = await api.files.get_images(
            ...     "abc123",
            ...     ["1:2", "3:4"],
            ...     scale=2.0,
            ...     format="png"
            ... )
            >>> for node_id, url in images.images.items():
            >>>     print(f"{node_id}: {url}")
        """
        params: Dict[str, Any] = {
            "ids": ",".join(node_ids),
            "scale": scale,
            "format": format,
        }

        if svg_include_id:
            params["svg_include_id"] = "true"
        if not svg_simplify_stroke:
            params["svg_simplify_stroke"] = "false"
        if use_absolute_bounds:
            params["use_absolute_bounds"] = "true"
        if version:
            params["version"] = version

        response = await self.client.get(f"images/{file_key}", params=params)
        return ImagesResponse(**response)

    async def get_image_fills(self, file_key: str) -> ImageFillsResponse:
        """
        Get download URLs for all images in image fills.

        Args:
            file_key: The file key

        Returns:
            ImageFillsResponse with image URLs

        Example:
            >>> fills = await api.files.get_image_fills("abc123")
            >>> for image_ref, urls in fills.meta.items():
            >>>     print(f"{image_ref}: {urls}")
        """
        response = await self.client.get(f"files/{file_key}/images")
        return ImageFillsResponse(**response)

    async def get_versions(
        self,
        file_key: str,
        page_size: int = 30,
    ) -> List[Dict[str, Any]]:
        """
        Get version history for a file.

        Args:
            file_key: The file key
            page_size: Number of versions per page (default 30)

        Returns:
            List of version objects

        Example:
            >>> versions = await api.files.get_versions("abc123")
            >>> for version in versions:
            >>>     print(f"{version['id']}: {version['label']}")
        """
        return await self.client.get_paginated(
            f"files/{file_key}/versions",
            page_size=page_size,
        )
