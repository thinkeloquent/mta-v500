"""Simplified SDK for Figma Variables API."""
from typing import Dict, Any

from ..client import FigmaHttpClient
from .models import LocalVariablesResponse, PublishedVariablesResponse


class VariablesAPI:
    """
    Simplified SDK for Figma Variables API.

    Provides methods for:
    - Getting local variables from a file
    - Getting published variables from a file
    """

    def __init__(self, client: FigmaHttpClient):
        """
        Initialize Variables API.

        Args:
            client: Shared HTTP client
        """
        self.client = client

    async def get_local(self, file_key: str) -> LocalVariablesResponse:
        """
        Get all local variables from a file.

        Args:
            file_key: The file key

        Returns:
            LocalVariablesResponse with variables and collections

        Example:
            >>> vars_data = await api.variables.get_local("abc123")
            >>> for var_id, var_data in vars_data.meta.get("variables", {}).items():
            >>>     print(f"{var_id}: {var_data}")
        """
        response = await self.client.get(f"files/{file_key}/variables/local")
        return LocalVariablesResponse(**response)

    async def get_published(self, file_key: str) -> PublishedVariablesResponse:
        """
        Get all published variables from a file.

        Args:
            file_key: The file key

        Returns:
            PublishedVariablesResponse with published variables and collections

        Example:
            >>> vars_data = await api.variables.get_published("abc123")
            >>> for var_id, variable in vars_data.variables.items():
            >>>     print(f"{variable.name}: {variable.resolved_type}")
        """
        response = await self.client.get(f"files/{file_key}/variables/published")
        return PublishedVariablesResponse(**response)
