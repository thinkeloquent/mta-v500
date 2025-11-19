"""Simplified SDK for Figma Webhooks API."""
from typing import List, Dict, Any, Optional

from ..client import FigmaHttpClient
from .models import WebhookRequest
from ..models import Webhook


class WebhooksAPI:
    """
    Simplified SDK for Figma Webhooks API.

    Provides methods for:
    - Creating webhooks
    - Listing webhooks
    - Updating webhooks
    - Deleting webhooks
    """

    def __init__(self, client: FigmaHttpClient):
        """
        Initialize Webhooks API.

        Args:
            client: Shared HTTP client
        """
        self.client = client

    async def create(
        self,
        event_type: str,
        team_id: str,
        endpoint: str,
        passcode: str,
        description: str = "",
    ) -> Webhook:
        """
        Create a new webhook.

        Args:
            event_type: Event type to subscribe to (e.g., "FILE_UPDATE", "FILE_VERSION_UPDATE")
            team_id: Team ID to create webhook for
            endpoint: HTTPS URL to receive webhook events
            passcode: Secret passcode for webhook verification
            description: Optional description

        Returns:
            Created Webhook object

        Example:
            >>> webhook = await api.webhooks.create(
            ...     event_type="FILE_UPDATE",
            ...     team_id="123456",
            ...     endpoint="https://example.com/webhook",
            ...     passcode="secret123",
            ...     description="File update notifications"
            ... )
        """
        body = {
            "event_type": event_type,
            "team_id": team_id,
            "endpoint": endpoint,
            "passcode": passcode,
            "description": description,
        }
        response = await self.client.post("webhooks", json=body)
        return Webhook(**response)

    async def list(self, team_id: str) -> List[Webhook]:
        """
        List all webhooks for a team.

        Args:
            team_id: Team ID

        Returns:
            List of Webhook objects

        Example:
            >>> webhooks = await api.webhooks.list("123456")
            >>> for webhook in webhooks:
            >>>     print(f"{webhook.id}: {webhook.event_type} -> {webhook.endpoint}")
        """
        response = await self.client.get(f"teams/{team_id}/webhooks")
        return [Webhook(**w) for w in response.get("webhooks", [])]

    async def update(
        self,
        webhook_id: str,
        endpoint: Optional[str] = None,
        passcode: Optional[str] = None,
        description: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Webhook:
        """
        Update a webhook.

        Args:
            webhook_id: Webhook ID
            endpoint: New endpoint URL (optional)
            passcode: New passcode (optional)
            description: New description (optional)
            status: New status: "ACTIVE" or "PAUSED" (optional)

        Returns:
            Updated Webhook object

        Example:
            >>> webhook = await api.webhooks.update(
            ...     "webhook123",
            ...     status="PAUSED"
            ... )
        """
        body: Dict[str, Any] = {}
        if endpoint:
            body["endpoint"] = endpoint
        if passcode:
            body["passcode"] = passcode
        if description is not None:
            body["description"] = description
        if status:
            body["status"] = status

        response = await self.client.patch(f"webhooks/{webhook_id}", json=body)
        return Webhook(**response)

    async def delete(self, webhook_id: str) -> Dict[str, Any]:
        """
        Delete a webhook.

        Args:
            webhook_id: Webhook ID

        Returns:
            Success response

        Example:
            >>> await api.webhooks.delete("webhook123")
        """
        return await self.client.delete(f"webhooks/{webhook_id}")
