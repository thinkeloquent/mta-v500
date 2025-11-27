"""Models for Components API."""
from typing import List, Dict, Any, Optional
from pydantic import Field

from ..models import FigmaBaseModel, Component as BaseComponent, ComponentSet


class ComponentMetadata(BaseComponent):
    """Component with full metadata."""

    file_key: str = Field(alias="file_key")
    node_id: str = Field(alias="node_id")
    thumbnail_url: Optional[str] = Field(None, alias="thumbnail_url")
    created_at: Optional[str] = Field(None, alias="created_at")
    updated_at: Optional[str] = Field(None, alias="updated_at")


class TeamComponentsResponse(FigmaBaseModel):
    """Response from team components endpoint."""

    status: int
    error: bool
    meta: Dict[str, Any]
