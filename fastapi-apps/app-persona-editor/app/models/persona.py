"""
Persona SQLAlchemy model.
"""

from datetime import datetime
from sqlalchemy import Column, String, Text, Float, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.database import Base


class Persona(Base):
    """
    Persona model representing AI agent configurations.

    Attributes:
        id: Unique identifier (format: 'persona-{uuid}')
        name: Persona name (min 3 chars)
        description: Detailed description (min 10 chars)
        role: Persona role (assistant, architect, developer, analyst)
        tone: Communication tone (neutral, analytical, friendly, professional, casual)
        llm_provider: LLM provider name (e.g., 'openai', 'anthropic')
        llm_temperature: Temperature setting (0.0-1.0)
        llm_parameters: Additional LLM parameters (JSONB dict)
        goals: Persona goals (JSONB array, max 10 items)
        tools: Available tools (JSONB array of enums)
        permitted_to: Permissions (JSONB array)
        prompt_system_template: System prompt template (JSONB array)
        prompt_user_template: User prompt template (JSONB array)
        prompt_context_template: Context prompt template (JSONB array)
        prompt_instruction: Instruction prompt (JSONB array)
        agent_delegate: Agent delegation config (JSONB array)
        agent_call: Agent call config (JSONB array)
        context_files: Context files (JSONB array)
        memory: Memory configuration (JSONB nested object with scope/storage_id)
        version: Persona version (default: '1.0.0')
        last_updated: Last update timestamp (auto-updated)
    """

    __tablename__ = "persona_editor_personas"

    # Primary key
    id = Column(String, primary_key=True, index=True)

    # Basic fields
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=False)
    role = Column(String, nullable=False)
    tone = Column(String, nullable=False)

    # LLM configuration
    llm_provider = Column(String, nullable=False, default="openai")
    llm_temperature = Column(Float, nullable=False, default=0.7)
    llm_parameters = Column(JSONB, nullable=False, default=dict)

    # Persona configuration (JSONB arrays)
    goals = Column(JSONB, nullable=False, default=list)
    tools = Column(JSONB, nullable=False, default=list)
    permitted_to = Column(JSONB, nullable=False, default=list)

    # Prompt templates (JSONB arrays)
    prompt_system_template = Column(JSONB, nullable=False, default=list)
    prompt_user_template = Column(JSONB, nullable=False, default=list)
    prompt_context_template = Column(JSONB, nullable=False, default=list)
    prompt_instruction = Column(JSONB, nullable=False, default=list)

    # Agent configuration (JSONB arrays)
    agent_delegate = Column(JSONB, nullable=False, default=list)
    agent_call = Column(JSONB, nullable=False, default=list)

    # Context and memory
    context_files = Column(JSONB, nullable=False, default=list)
    memory = Column(JSONB, nullable=False)

    # Metadata
    version = Column(String, nullable=False, default="1.0.0")
    last_updated = Column(DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)

    # Relationships
    audit_logs = relationship(
        "AuditLog",
        back_populates="persona",
        cascade="all, delete-orphan",
        lazy="noload",  # Changed from "selectin" to prevent auto-loading during response serialization
    )

    def __repr__(self) -> str:
        return f"<Persona(id='{self.id}', name='{self.name}', role='{self.role}')>"
