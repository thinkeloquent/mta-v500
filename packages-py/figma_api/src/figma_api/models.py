"""
Common Pydantic models and base classes for Figma API.
"""
from datetime import datetime
from typing import Optional, Any, Dict, List, Union
from pydantic import BaseModel, Field, ConfigDict


class FigmaBaseModel(BaseModel):
    """Base model for all Figma API models."""

    model_config = ConfigDict(
        populate_by_name=True,
        validate_assignment=True,
        arbitrary_types_allowed=True,
    )


class User(FigmaBaseModel):
    """Figma user model."""

    id: str
    handle: str
    img_url: Optional[str] = None
    email: Optional[str] = None


class PaginationMeta(FigmaBaseModel):
    """Pagination metadata."""

    cursor: Optional[str] = None
    next_cursor: Optional[str] = None
    has_more: bool = False
    total: Optional[int] = None


class PaginatedResponse(FigmaBaseModel):
    """Base paginated response."""

    cursor: Optional[str] = None
    next_cursor: Optional[str] = None


class ErrorResponse(FigmaBaseModel):
    """API error response."""

    status: int
    error: str
    message: Optional[str] = None


# File-related models
class Vector(FigmaBaseModel):
    """2D vector."""

    x: float
    y: float


class Rectangle(FigmaBaseModel):
    """Rectangle bounds."""

    x: float
    y: float
    width: float
    height: float


class Color(FigmaBaseModel):
    """RGBA color."""

    r: float
    g: float
    b: float
    a: float = 1.0


class Paint(FigmaBaseModel):
    """Paint style."""

    type: str
    visible: bool = True
    opacity: float = 1.0
    color: Optional[Color] = None


class TypeStyle(FigmaBaseModel):
    """Text type style."""

    font_family: str = Field(alias="fontFamily")
    font_post_script_name: Optional[str] = Field(None, alias="fontPostScriptName")
    font_weight: Optional[int] = Field(None, alias="fontWeight")
    font_size: float = Field(alias="fontSize")
    line_height_px: Optional[float] = Field(None, alias="lineHeightPx")
    letter_spacing: Optional[float] = Field(None, alias="letterSpacing")
    text_align_horizontal: Optional[str] = Field(None, alias="textAlignHorizontal")
    text_align_vertical: Optional[str] = Field(None, alias="textAlignVertical")


class Effect(FigmaBaseModel):
    """Effect style."""

    type: str
    visible: bool = True
    radius: Optional[float] = None
    color: Optional[Color] = None
    offset: Optional[Vector] = None


class Constraint(FigmaBaseModel):
    """Layout constraint."""

    type: str
    value: float


class ExportSetting(FigmaBaseModel):
    """Export settings."""

    suffix: str = ""
    format: str
    constraint: Optional[Constraint] = None


# Node types
class Node(FigmaBaseModel):
    """Base node in Figma document."""

    id: str
    name: str
    type: str
    visible: bool = True
    locked: bool = False
    children: Optional[List["Node"]] = None
    background_color: Optional[Color] = Field(None, alias="backgroundColor")
    absolute_bounding_box: Optional[Rectangle] = Field(None, alias="absoluteBoundingBox")
    constraints: Optional[Dict[str, Any]] = None
    opacity: Optional[float] = 1.0
    blend_mode: Optional[str] = Field(None, alias="blendMode")
    fills: Optional[List[Paint]] = None
    strokes: Optional[List[Paint]] = None
    stroke_weight: Optional[float] = Field(None, alias="strokeWeight")
    effects: Optional[List[Effect]] = None
    export_settings: Optional[List[ExportSetting]] = Field(None, alias="exportSettings")


class Document(Node):
    """Document node."""

    type: str = "DOCUMENT"
    children: List[Node]


class Canvas(Node):
    """Canvas node."""

    type: str = "CANVAS"
    children: List[Node]


class Frame(Node):
    """Frame node."""

    type: str = "FRAME"
    children: Optional[List[Node]] = None


# File models
class FileVersion(FigmaBaseModel):
    """File version information."""

    id: str
    created_at: datetime = Field(alias="createdAt")
    label: Optional[str] = None
    description: Optional[str] = None
    user: Optional[User] = None


class FileMetadata(FigmaBaseModel):
    """File metadata."""

    key: str
    name: str
    thumbnail_url: Optional[str] = Field(None, alias="thumbnailUrl")
    last_modified: datetime = Field(alias="lastModified")
    version: Optional[str] = None


# Component models
class Component(FigmaBaseModel):
    """Component definition."""

    key: str
    name: str
    description: Optional[str] = None
    containing_frame: Optional[Dict[str, Any]] = Field(None, alias="containingFrame")
    containing_page: Optional[Dict[str, Any]] = Field(None, alias="containingPage")


class ComponentSet(FigmaBaseModel):
    """Component set definition."""

    key: str
    name: str
    description: Optional[str] = None


# Comment models
class CommentUser(FigmaBaseModel):
    """User in comment context."""

    id: str
    handle: str
    img_url: str = Field(alias="imgUrl")


class ClientMeta(FigmaBaseModel):
    """Client metadata for comments."""

    x: Optional[float] = None
    y: Optional[float] = None
    node_id: Optional[Union[str, List[str]]] = Field(None, alias="nodeId")
    node_offset: Optional[Vector] = Field(None, alias="nodeOffset")


# Project models
class Project(FigmaBaseModel):
    """Project information."""

    id: str
    name: str


# Variable models
class VariableAlias(FigmaBaseModel):
    """Variable alias."""

    type: str = "VARIABLE_ALIAS"
    id: str


class Variable(FigmaBaseModel):
    """Variable definition."""

    id: str
    name: str
    key: str
    variable_collection_id: str = Field(alias="variableCollectionId")
    resolved_type: str = Field(alias="resolvedType")
    value_by_mode: Dict[str, Any] = Field(alias="valuesByMode")
    remote: bool = False
    description: Optional[str] = None
    hidden_from_publishing: bool = Field(False, alias="hiddenFromPublishing")


class VariableCollection(FigmaBaseModel):
    """Variable collection."""

    id: str
    name: str
    key: str
    modes: List[Dict[str, Any]]
    default_mode_id: str = Field(alias="defaultModeId")
    remote: bool = False
    hidden_from_publishing: bool = Field(False, alias="hiddenFromPublishing")
    variable_ids: List[str] = Field(alias="variableIds")


# Webhook models
class WebhookEvent(FigmaBaseModel):
    """Webhook event types."""

    event_type: str = Field(alias="event_type")
    file_key: Optional[str] = Field(None, alias="file_key")
    team_id: Optional[str] = Field(None, alias="team_id")
    timestamp: datetime
    passcode: Optional[str] = None


class Webhook(FigmaBaseModel):
    """Webhook configuration."""

    id: str
    event_type: str = Field(alias="event_type")
    team_id: str = Field(alias="team_id")
    status: str
    description: Optional[str] = None
    endpoint: str
    passcode: str


# Dev Resources models
class DevResource(FigmaBaseModel):
    """Dev resource link."""

    id: str
    name: str
    url: str
    file_key: str = Field(alias="file_key")
    node_id: str = Field(alias="node_id")
    created_at: Optional[datetime] = Field(None, alias="created_at")


# Library Analytics models
class ComponentUsage(FigmaBaseModel):
    """Component usage analytics."""

    component_key: str = Field(alias="component_key")
    component_name: str = Field(alias="component_name")
    user_count: int = Field(alias="user_count")
    instance_count: int = Field(alias="instance_count")
    insert_count: int = Field(alias="insert_count")
    detach_count: int = Field(alias="detach_count")


# Update forward references for recursive models
Node.model_rebuild()
Document.model_rebuild()
Canvas.model_rebuild()
Frame.model_rebuild()
