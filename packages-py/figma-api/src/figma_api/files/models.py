"""Models for Files API."""
from typing import Dict, List, Optional, Any
from datetime import datetime
from pydantic import Field

from ..models import FigmaBaseModel, Node, User, Component, ComponentSet


class File(FigmaBaseModel):
    """Complete Figma file structure."""

    name: str
    role: Optional[str] = None
    last_modified: datetime = Field(alias="lastModified")
    editor_type: str = Field(alias="editorType")
    thumbnail_url: Optional[str] = Field(None, alias="thumbnailUrl")
    version: str
    document: Node
    components: Optional[Dict[str, Component]] = None
    component_sets: Optional[Dict[str, ComponentSet]] = Field(None, alias="componentSets")
    schema_version: int = Field(alias="schemaVersion")
    styles: Optional[Dict[str, Any]] = None
    main_file_key: Optional[str] = Field(None, alias="mainFileKey")
    branches: Optional[List[Dict[str, Any]]] = None


class FileNodesResponse(FigmaBaseModel):
    """Response from file nodes endpoint."""

    name: str
    role: Optional[str] = None
    last_modified: datetime = Field(alias="lastModified")
    editor_type: str = Field(alias="editorType")
    thumbnail_url: Optional[str] = Field(None, alias="thumbnailUrl")
    version: str
    nodes: Dict[str, Any]


class ImageFillsResponse(FigmaBaseModel):
    """Response from image fills endpoint."""

    error: bool = False
    status: int
    meta: Dict[str, Dict[str, str]]


class ImagesResponse(FigmaBaseModel):
    """Response from images endpoint."""

    err: Optional[str] = None
    images: Dict[str, Optional[str]]
    status: int = 200
