"""Models for Webhooks API."""
from typing import List
from pydantic import Field

from ..models import FigmaBaseModel, Webhook as BaseWebhook


class WebhookRequest(FigmaBaseModel):
    """Webhook creation request."""

    event_type: str = Field(alias="event_type")
    team_id: str = Field(alias="team_id")
    endpoint: str
    passcode: str
    description: str = ""


class WebhooksListResponse(FigmaBaseModel):
    """Response from webhooks list endpoint."""

    webhooks: List[BaseWebhook]
