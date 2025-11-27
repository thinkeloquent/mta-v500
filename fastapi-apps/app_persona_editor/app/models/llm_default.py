"""
LLMDefault SQLAlchemy model.
"""

from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, Index, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB

from app.database import Base
from app.schemas.enums import LLMDefaultCategory


class LLMDefault(Base):
    """
    LLM defaults model for storing default configurations.

    Attributes:
        id: Unique identifier (nanoid format)
        category: Category enum (tools, permissions, goals, prompts, tones, roles) - indexed
        name: Default name (min 3 chars)
        description: Default description (min 5 chars)
        value: Default value (JSONB, any type)
        is_default: Whether this is the default for the category (indexed, ensure only one per category)
        created_at: Creation timestamp
        updated_at: Last update timestamp (auto-updated)
    """

    __tablename__ = "persona_editor_llm_defaults"

    # Primary key
    id = Column(String, primary_key=True, index=True)

    # Category (enum)
    # Use values_callable to ensure enum values (lowercase) are used, not names (uppercase)
    category = Column(
        SQLEnum(
            LLMDefaultCategory,
            name="persona_editor_llm_default_category",
            create_type=False,
            values_callable=lambda x: [e.value for e in x]
        ),
        nullable=False,
        index=True,
    )

    # Basic fields
    name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    value = Column(JSONB, nullable=False)

    # Default flag
    is_default = Column(Boolean, nullable=False, default=False, index=True)

    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.now)
    updated_at = Column(
        DateTime, nullable=False, default=datetime.now, onupdate=datetime.now
    )

    # Composite index for filtering
    __table_args__ = (
        Index("idx_llm_defaults_category_is_default", "category", "is_default"),
    )

    def __repr__(self) -> str:
        return f"<LLMDefault(id='{self.id}', category='{self.category.value}', name='{self.name}')>"
