"""Models for Dev Resources API."""
from typing import List
from pydantic import Field

from ..models import FigmaBaseModel, DevResource as BaseDevResource


class DevResourcesResponse(FigmaBaseModel):
    """Response from dev resources endpoint."""

    dev_resources: List[BaseDevResource] = Field(alias="dev_resources")
