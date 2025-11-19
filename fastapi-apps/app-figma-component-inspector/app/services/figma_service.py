"""
Figma Service

Service layer for interacting with Figma REST API.
Implements defensive programming with comprehensive error handling and validation.
"""

import math
from typing import Any, Optional

import httpx

from app.config import settings
from app.logging_config import logger
from app.schemas.figma import (
    ComponentProperty,
    DesignVariable,
    FigmaFileResponse,
    FigmaImagesResponse,
    FigmaNode,
    RGBAColor,
)

# Figma API Base URL
FIGMA_API_BASE = "https://api.figma.com/v1"


class FigmaService:
    """Service for Figma API interactions"""

    def __init__(self):
        """Initialize Figma service with token validation"""
        self.token = self._validate_token()
        self.client = httpx.AsyncClient(
            headers={"X-Figma-Token": self.token},
            timeout=30.0,
        )

    def _validate_token(self) -> str:
        """
        Validate Figma token from settings.

        Returns:
            Figma API token

        Raises:
            ValueError: If token is not set or invalid
        """
        if not settings.figma_token or not settings.figma_token.strip():
            raise ValueError("FIGMA_TOKEN environment variable is not set")
        return settings.figma_token

    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()

    async def get_figma_file(self, file_id: str) -> FigmaFileResponse:
        """
        Get Figma file structure and metadata.

        Args:
            file_id: Figma file ID

        Returns:
            Figma file response with document tree

        Raises:
            ValueError: If file_id is invalid
            httpx.HTTPError: If API request fails
        """
        # Defensive validation
        if not file_id or not isinstance(file_id, str) or not file_id.strip():
            raise ValueError("Invalid fileId: must be a non-empty string")

        url = f"{FIGMA_API_BASE}/files/{file_id}"

        try:
            response = await self.client.get(url)
            response.raise_for_status()
            data = response.json()
            return FigmaFileResponse(**data)
        except httpx.HTTPStatusError as e:
            error_data = {}
            try:
                error_data = e.response.json()
            except Exception:
                pass
            error_msg = error_data.get("err") or error_data.get("message") or ""
            raise ValueError(
                f"Figma API error: {e.response.status_code} {e.response.reason_phrase}. {error_msg}"
            ) from e
        except Exception as e:
            logger.error(f"Error fetching Figma file {file_id}: {e}")
            raise

    async def get_component_images(
        self,
        file_id: str,
        node_ids: list[str],
        scale: float = 2.0,
        format: str = "png",
    ) -> FigmaImagesResponse:
        """
        Get rendered component images.

        Args:
            file_id: Figma file ID
            node_ids: List of node IDs to render
            scale: Image scale (0.01-4.0)
            format: Image format (jpg, png, svg, pdf)

        Returns:
            Figma images response with image URLs

        Raises:
            ValueError: If parameters are invalid
            httpx.HTTPError: If API request fails
        """
        # Defensive validation
        if not file_id or not isinstance(file_id, str) or not file_id.strip():
            raise ValueError("Invalid fileId: must be a non-empty string")

        if not isinstance(node_ids, list) or len(node_ids) == 0:
            raise ValueError("Invalid nodeIds: must be a non-empty array")

        if not isinstance(scale, (int, float)) or scale < 0.01 or scale > 4:
            raise ValueError("Invalid scale: must be a number between 0.01 and 4")

        if format not in ["jpg", "png", "svg", "pdf"]:
            raise ValueError("Invalid format: must be one of jpg, png, svg, pdf")

        node_ids_param = ",".join(node_ids)
        url = f"{FIGMA_API_BASE}/images/{file_id}"
        params = {"ids": node_ids_param, "scale": scale, "format": format}

        try:
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            return FigmaImagesResponse(**data)
        except httpx.HTTPStatusError as e:
            error_data = {}
            try:
                error_data = e.response.json()
            except Exception:
                pass
            error_msg = error_data.get("err") or error_data.get("message") or ""
            raise ValueError(
                f"Figma API error: {e.response.status_code} {e.response.reason_phrase}. {error_msg}"
            ) from e
        except Exception as e:
            logger.error(f"Error fetching component images for {file_id}: {e}")
            raise

    async def get_file_variables(self, file_id: str) -> list[DesignVariable]:
        """
        Get design tokens/variables from file.

        Args:
            file_id: Figma file ID

        Returns:
            List of design variables

        Note:
            Returns empty list if variables endpoint is not available
        """
        # Defensive validation
        if not file_id or not isinstance(file_id, str) or not file_id.strip():
            raise ValueError("Invalid fileId: must be a non-empty string")

        url = f"{FIGMA_API_BASE}/files/{file_id}/variables/local"

        try:
            response = await self.client.get(url)
            response.raise_for_status()
            data = response.json()

            # Transform Figma variables to simplified format
            variables: list[DesignVariable] = []

            if data.get("meta") and data["meta"].get("variables"):
                for variable in data["meta"]["variables"].values():
                    # Get the first mode value
                    values_by_mode = variable.get("valuesByMode", {})
                    if not values_by_mode:
                        continue

                    first_mode = list(values_by_mode.keys())[0]
                    value = values_by_mode[first_mode]

                    # Convert value to string
                    if isinstance(value, dict) and "r" in value:
                        # Color value
                        r = round(value["r"] * 255)
                        g = round(value["g"] * 255)
                        b = round(value["b"] * 255)
                        a = value.get("a", 1)
                        string_value = f"rgba({r}, {g}, {b}, {a})"
                    else:
                        string_value = str(value)

                    variables.append(
                        DesignVariable(
                            name=variable["name"],
                            value=string_value,
                            type=variable["resolvedType"],
                        )
                    )

            return variables
        except Exception as e:
            # Variables endpoint might not be available for all files
            logger.warning(f"Could not fetch variables for file {file_id}: {e}")
            return []

    def extract_component_properties(self, node: FigmaNode) -> dict[str, ComponentProperty]:
        """
        Extract CSS-like properties from a Figma node.

        Args:
            node: Figma node

        Returns:
            Dictionary of component properties
        """
        properties: dict[str, ComponentProperty] = {}

        # Extract dimensions
        if node.absolute_bounding_box:
            bbox = node.absolute_bounding_box
            properties["width"] = ComponentProperty(
                value=f"{round(bbox.width)}px", type="dimension"
            )
            properties["height"] = ComponentProperty(
                value=f"{round(bbox.height)}px", type="dimension"
            )

        # Extract background color
        if node.background_color:
            bg = node.background_color
            r_int = round(bg.r * 255)
            g_int = round(bg.g * 255)
            b_int = round(bg.b * 255)

            # Convert to hex
            hex_color = f"#{r_int:02x}{g_int:02x}{b_int:02x}"

            properties["backgroundColor"] = ComponentProperty(
                value=hex_color if bg.a == 1 else f"rgba({r_int}, {g_int}, {b_int}, {bg.a})",
                type="color",
            )

        return properties

    def find_node_by_id(self, root: FigmaNode, node_id: str) -> Optional[FigmaNode]:
        """
        Recursively search document tree for a node with given ID.

        Args:
            root: Root node to start search
            node_id: Node ID to find

        Returns:
            Found node or None
        """
        if not node_id or not isinstance(node_id, str):
            raise ValueError("Invalid nodeId: must be a non-empty string")

        if root.id == node_id:
            return root

        if root.children:
            for child in root.children:
                found = self.find_node_by_id(child, node_id)
                if found:
                    return found

        return None

    def get_all_component_nodes(self, root: FigmaNode) -> list[FigmaNode]:
        """
        Extract all COMPONENT type nodes from document tree.

        Args:
            root: Root node to start extraction

        Returns:
            List of all component nodes
        """
        components: list[FigmaNode] = []

        if root.type.value == "COMPONENT":
            components.append(root)

        if root.children:
            for child in root.children:
                components.extend(self.get_all_component_nodes(child))

        return components


# Singleton instance
_figma_service: Optional[FigmaService] = None


def get_figma_service() -> FigmaService:
    """
    Get singleton Figma service instance.

    Returns:
        FigmaService instance
    """
    global _figma_service
    if _figma_service is None:
        _figma_service = FigmaService()
    return _figma_service
