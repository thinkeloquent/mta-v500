"""Simplified SDK for Figma Library Analytics API."""
from typing import List
from datetime import datetime

from ..client import FigmaHttpClient
from ..models import ComponentUsage


class LibraryAnalyticsAPI:
    """
    Simplified SDK for Figma Library Analytics API.

    Provides methods for:
    - Getting component usage analytics
    """

    def __init__(self, client: FigmaHttpClient):
        """
        Initialize Library Analytics API.

        Args:
            client: Shared HTTP client
        """
        self.client = client

    async def get_component_usage(
        self,
        file_key: str,
        start_date: datetime,
        end_date: datetime,
    ) -> List[ComponentUsage]:
        """
        Get component usage analytics for a file.

        Args:
            file_key: The file key
            start_date: Start date for analytics period
            end_date: End date for analytics period

        Returns:
            List of ComponentUsage objects

        Example:
            >>> from datetime import datetime, timedelta
            >>> end = datetime.now()
            >>> start = end - timedelta(days=30)
            >>> usage = await api.library_analytics.get_component_usage(
            ...     "abc123",
            ...     start,
            ...     end
            ... )
            >>> for comp in usage:
            >>>     print(f"{comp.component_name}: {comp.instance_count} instances")
        """
        params = {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
        }

        response = await self.client.get(
            f"files/{file_key}/library_analytics/component_usages",
            params=params,
        )
        return [ComponentUsage(**u) for u in response.get("component_usages", [])]
