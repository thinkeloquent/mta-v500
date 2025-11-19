"""
Pydantic schemas for LLMDefault model.
"""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.schemas.enums import LLMDefaultCategory


class LLMDefaultBase(BaseModel):
    """
    Base LLM default schema.
    """

    category: LLMDefaultCategory
    name: str = Field(..., min_length=3, description="Default name")
    description: str = Field(..., min_length=5, description="Default description")
    value: Any = Field(..., description="Default value (any JSON-serializable type)")
    is_default: bool = Field(default=False, description="Whether this is the default for the category")

    model_config = {"use_enum_values": True}


class LLMDefaultCreate(LLMDefaultBase):
    """
    Schema for creating a new LLM default.
    """

    pass


class LLMDefaultUpdate(BaseModel):
    """
    Schema for updating an LLM default.
    All fields are optional.
    """

    category: Optional[LLMDefaultCategory] = None
    name: Optional[str] = Field(None, min_length=3)
    description: Optional[str] = Field(None, min_length=5)
    value: Optional[Any] = None
    is_default: Optional[bool] = None

    model_config = {"use_enum_values": True}


class LLMDefaultResponse(LLMDefaultBase):
    """
    Schema for LLM default responses.
    Includes id, created_at, and updated_at fields.
    """

    id: str
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,  # Enable ORM mode for SQLAlchemy models
        "use_enum_values": True,
    }
