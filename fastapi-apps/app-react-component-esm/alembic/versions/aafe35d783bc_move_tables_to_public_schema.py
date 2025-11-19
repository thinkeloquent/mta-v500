"""move_tables_to_public_schema

Revision ID: aafe35d783bc
Revises: 001_initial_schema
Create Date: 2025-11-17 12:08:56.916342

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'aafe35d783bc'
down_revision: Union[str, Sequence[str], None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Move tables from react_component_esm schema to public schema if they exist."""
    # Check if react_component_esm schema exists
    from sqlalchemy import text
    conn = op.get_bind()

    schema_exists = conn.execute(text("""
        SELECT EXISTS(
            SELECT 1 FROM information_schema.schemata
            WHERE schema_name = 'react_component_esm'
        )
    """)).scalar()

    if schema_exists:
        # Check if tables exist in the old schema
        projects_exists = conn.execute(text("""
            SELECT EXISTS(
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'react_component_esm'
                AND table_name = 'react_component_esm_projects'
            )
        """)).scalar()

        files_exists = conn.execute(text("""
            SELECT EXISTS(
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'react_component_esm'
                AND table_name = 'react_component_esm_files'
            )
        """)).scalar()

        # Move tables if they exist
        if projects_exists:
            op.execute('ALTER TABLE react_component_esm.react_component_esm_projects SET SCHEMA public')
        if files_exists:
            op.execute('ALTER TABLE react_component_esm.react_component_esm_files SET SCHEMA public')

        # Drop empty schema if no tables remain
        remaining_tables = conn.execute(text("""
            SELECT COUNT(*) FROM information_schema.tables
            WHERE table_schema = 'react_component_esm'
        """)).scalar()

        if remaining_tables == 0:
            op.execute('DROP SCHEMA react_component_esm')

    # If schema doesn't exist, tables are already in public schema (or will be created there by 001_initial_schema)
    # This is a no-op for clean installations


def downgrade() -> None:
    """Move tables back to react_component_esm schema."""
    # Recreate schema if it doesn't exist
    op.execute('CREATE SCHEMA IF NOT EXISTS react_component_esm')

    # Move tables back
    op.execute('ALTER TABLE public.react_component_esm_files SET SCHEMA react_component_esm')
    op.execute('ALTER TABLE public.react_component_esm_projects SET SCHEMA react_component_esm')
