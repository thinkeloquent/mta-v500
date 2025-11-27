"""
Pydantic schemas for Persona model.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator

from app.schemas.enums import (
    MemoryScope,
    PersonaPermission,
    PersonaRole,
    PersonaTone,
    PersonaTool,
)


class MemoryConfig(BaseModel):
    """
    Memory configuration schema.
    """

    enabled: bool
    scope: MemoryScope
    storage_id: str

    model_config = {"use_enum_values": True}


class PersonaBase(BaseModel):
    """
    Base persona schema with common fields.
    """

    name: str = Field(..., min_length=3, description="Persona name")
    description: str = Field(..., min_length=10, description="Persona description")
    role: PersonaRole
    tone: PersonaTone
    llm_provider: str = Field(..., min_length=1, description="LLM provider name")
    llm_temperature: float = Field(..., ge=0, le=1, description="LLM temperature (0.0-1.0)")
    llm_parameters: Dict[str, Any] = Field(default_factory=dict, description="Additional LLM parameters")
    goals: List[str] = Field(default_factory=list, max_length=10, description="Persona goals (max 10)")
    tools: List[PersonaTool] = Field(..., min_length=1, description="Available tools (at least one required)")
    permitted_to: List[PersonaPermission] = Field(default_factory=list, description="Permissions")
    prompt_system_template: List[str] = Field(default_factory=list, description="System prompt template")
    prompt_user_template: List[str] = Field(default_factory=list, description="User prompt template")
    prompt_context_template: List[str] = Field(default_factory=list, description="Context prompt template")
    prompt_instruction: List[str] = Field(default_factory=list, description="Instruction prompt")
    agent_delegate: List[str] = Field(default_factory=list, description="Agent delegation config")
    agent_call: List[str] = Field(default_factory=list, description="Agent call config")
    context_files: List[str] = Field(default_factory=list, description="Context files")
    memory: MemoryConfig = Field(..., description="Memory configuration")
    version: str = Field(default="1.0.0", description="Persona version")

    model_config = {"use_enum_values": True}


class PersonaCreate(PersonaBase):
    """
    Schema for creating a new persona.
    Excludes id and last_updated (generated automatically).
    """

    pass


class PersonaUpdate(BaseModel):
    """
    Schema for updating a persona.
    All fields are optional.
    """

    name: Optional[str] = Field(None, min_length=3)
    description: Optional[str] = Field(None, min_length=10)
    role: Optional[PersonaRole] = None
    tone: Optional[PersonaTone] = None
    llm_provider: Optional[str] = Field(None, min_length=1)
    llm_temperature: Optional[float] = Field(None, ge=0, le=1)
    llm_parameters: Optional[Dict[str, Any]] = None
    goals: Optional[List[str]] = Field(None, max_length=10)
    tools: Optional[List[PersonaTool]] = Field(None, min_length=1)
    permitted_to: Optional[List[PersonaPermission]] = None
    prompt_system_template: Optional[List[str]] = None
    prompt_user_template: Optional[List[str]] = None
    prompt_context_template: Optional[List[str]] = None
    prompt_instruction: Optional[List[str]] = None
    agent_delegate: Optional[List[str]] = None
    agent_call: Optional[List[str]] = None
    context_files: Optional[List[str]] = None
    memory: Optional[MemoryConfig] = None
    version: Optional[str] = None

    model_config = {"use_enum_values": True}


class PersonaResponse(PersonaBase):
    """
    Schema for persona responses.
    Includes id and last_updated fields.
    """

    id: str
    last_updated: datetime

    model_config = {
        "from_attributes": True,  # Enable ORM mode for SQLAlchemy models
        "use_enum_values": True,
    }

    @field_validator("last_updated", mode="before")
    @classmethod
    def serialize_datetime(cls, value):
        """Ensure datetime is properly serialized"""
        if isinstance(value, datetime):
            return value
        return value
