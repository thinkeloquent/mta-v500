"""Models for Library Analytics API."""
from typing import List
from pydantic import Field

from ..models import FigmaBaseModel, ComponentUsage


class ComponentAnalyticsResponse(FigmaBaseModel):
    """Response from component analytics endpoint."""

    component_usages: List[ComponentUsage] = Field(alias="component_usages")
