"""Change LLM default category enum to lowercase

Revision ID: 003_lowercase_enum
Revises: f7c20f51b58f
Create Date: 2025-11-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '003_lowercase_enum'
down_revision: Union[str, Sequence[str], None] = 'f7c20f51b58f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Change enum values from uppercase to lowercase."""
    # Step 1: Create new enum type with lowercase values
    op.execute("""
        CREATE TYPE persona_editor_llm_default_category_new AS ENUM (
            'tools',
            'permissions',
            'goals',
            'prompts',
            'tones',
            'roles'
        )
    """)

    # Step 2: Alter the column to use the new enum type
    # Convert existing uppercase values to lowercase during migration
    op.execute("""
        ALTER TABLE persona_editor_llm_defaults
        ALTER COLUMN category TYPE persona_editor_llm_default_category_new
        USING (LOWER(category::text)::persona_editor_llm_default_category_new)
    """)

    # Step 3: Drop the old enum type
    op.execute("DROP TYPE persona_editor_llm_default_category")

    # Step 4: Rename the new enum type to the original name
    op.execute("""
        ALTER TYPE persona_editor_llm_default_category_new
        RENAME TO persona_editor_llm_default_category
    """)


def downgrade() -> None:
    """Revert enum values back to uppercase."""
    # Step 1: Create enum type with uppercase values
    op.execute("""
        CREATE TYPE persona_editor_llm_default_category_old AS ENUM (
            'TOOLS',
            'PERMISSIONS',
            'GOALS',
            'PROMPTS',
            'TONES',
            'ROLES'
        )
    """)

    # Step 2: Alter the column to use the old enum type
    # Convert existing lowercase values to uppercase during downgrade
    op.execute("""
        ALTER TABLE persona_editor_llm_defaults
        ALTER COLUMN category TYPE persona_editor_llm_default_category_old
        USING (UPPER(category::text)::persona_editor_llm_default_category_old)
    """)

    # Step 3: Drop the current enum type
    op.execute("DROP TYPE persona_editor_llm_default_category")

    # Step 4: Rename the old enum type back to the original name
    op.execute("""
        ALTER TYPE persona_editor_llm_default_category_old
        RENAME TO persona_editor_llm_default_category
    """)
