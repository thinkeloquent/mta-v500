"""
Figma API Pydantic Schemas

Validation schemas for Figma API types and responses.
Matches Zod schemas from TypeScript backend.
"""

from enum import Enum
from typing import Any, Optional, Union

from pydantic import BaseModel, ConfigDict, Field


class FigmaNodeType(str, Enum):
    """Figma node types"""

    DOCUMENT = "DOCUMENT"
    CANVAS = "CANVAS"
    FRAME = "FRAME"
    GROUP = "GROUP"
    VECTOR = "VECTOR"
    BOOLEAN_OPERATION = "BOOLEAN_OPERATION"
    STAR = "STAR"
    LINE = "LINE"
    ELLIPSE = "ELLIPSE"
    REGULAR_POLYGON = "REGULAR_POLYGON"
    RECTANGLE = "RECTANGLE"
    TEXT = "TEXT"
    SLICE = "SLICE"
    COMPONENT = "COMPONENT"
    COMPONENT_SET = "COMPONENT_SET"
    INSTANCE = "INSTANCE"


class RGBAColor(BaseModel):
    """RGBA color model"""

    r: float
    g: float
    b: float
    a: float

    model_config = ConfigDict(from_attributes=True)


class BoundingBox(BaseModel):
    """Absolute bounding box"""

    x: float
    y: float
    width: float
    height: float

    model_config = ConfigDict(from_attributes=True)


class FigmaNode(BaseModel):
    """Figma node structure (recursive)"""

    id: str
    name: str
    type: FigmaNodeType
    visible: Optional[bool] = None
    locked: Optional[bool] = None
    children: Optional[list["FigmaNode"]] = None
    background_color: Optional[RGBAColor] = Field(None, alias="backgroundColor")
    absolute_bounding_box: Optional[BoundingBox] = Field(None, alias="absoluteBoundingBox")
    styles: Optional[dict[str, str]] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class FigmaComponent(BaseModel):
    """Figma component metadata"""

    key: str
    name: str
    description: Optional[str] = None
    component_set_id: Optional[str] = Field(None, alias="componentSetId")
    documentation_links: Optional[list[str]] = Field(None, alias="documentationLinks")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class FigmaComponentSet(BaseModel):
    """Figma component set"""

    key: str
    name: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class FigmaStyle(BaseModel):
    """Figma style"""

    key: str
    name: str
    style_type: str = Field(..., alias="styleType")
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class FigmaFileResponse(BaseModel):
    """Figma file response"""

    name: str
    last_modified: str = Field(..., alias="lastModified")
    thumbnail_url: Optional[str] = Field(None, alias="thumbnailUrl")
    version: str
    document: FigmaNode
    components: Optional[dict[str, FigmaComponent]] = None
    component_sets: Optional[dict[str, FigmaComponentSet]] = Field(None, alias="componentSets")
    schema_version: Optional[int] = Field(None, alias="schemaVersion")
    styles: Optional[dict[str, FigmaStyle]] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class FigmaImagesResponse(BaseModel):
    """Figma images response"""

    err: Optional[str] = None
    images: dict[str, Optional[str]]
    status: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class FigmaVariableType(str, Enum):
    """Figma variable types"""

    COLOR = "COLOR"
    FLOAT = "FLOAT"
    STRING = "STRING"
    BOOLEAN = "BOOLEAN"


class FigmaVariable(BaseModel):
    """Figma variable"""

    id: str
    name: str
    key: str
    variable_collection_id: str = Field(..., alias="variableCollectionId")
    resolved_type: FigmaVariableType = Field(..., alias="resolvedType")
    values_by_mode: dict[str, Union[str, float, bool, RGBAColor]] = Field(..., alias="valuesByMode")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class FigmaMode(BaseModel):
    """Figma mode"""

    mode_id: str = Field(..., alias="modeId")
    name: str

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class FigmaVariableCollection(BaseModel):
    """Figma variable collection"""

    id: str
    name: str
    key: str
    modes: list[FigmaMode]
    default_mode_id: str = Field(..., alias="defaultModeId")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class FigmaVariablesResponse(BaseModel):
    """Figma variables response"""

    status: int
    error: bool
    meta: dict[str, Any]

    model_config = ConfigDict(from_attributes=True)


class DesignVariable(BaseModel):
    """Processed design variable/token"""

    name: str
    value: str
    type: str

    model_config = ConfigDict(from_attributes=True)


class ComponentProperty(BaseModel):
    """Component property (extracted)"""

    value: str
    type: str  # color | dimension | spacing | typography | other
    token: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# Update forward refs for recursive model
FigmaNode.model_rebuild()
