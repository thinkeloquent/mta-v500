"""Initial schema with projects and files

Revision ID: 001_initial_schema
Revises:
Create Date: 2025-11-06

"""
from typing import Sequence, Union
import sys
from pathlib import Path

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from app.config import settings

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLE_INDEXES = {
    'react_component_esm_projects': [
        'ix_react_component_esm_react_component_esm_projects_name',
    ],
    'react_component_esm_files': [
        'ix_react_component_esm_react_component_esm_files_name',
        'ix_react_component_esm_react_component_esm_files_project_id',
    ],
}


def upgrade() -> None:
    """Upgrade schema."""
    # Get schema from settings (uses POSTGRES_SCHEMA env var, defaults to 'public')
    schema = settings.POSTGRES_SCHEMA if settings.POSTGRES_SCHEMA != 'react_component_esm' else 'public'

    # Create schema if not public
    if schema != 'public':
        op.execute(f'CREATE SCHEMA IF NOT EXISTS {schema}')

    # Create projects table
    op.create_table(
        'react_component_esm_projects',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        schema=schema
    )
    op.create_index(op.f('ix_react_component_esm_react_component_esm_projects_name'), 'react_component_esm_projects', ['name'], unique=False, schema=schema)

    # Create files table
    op.create_table(
        'react_component_esm_files',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('path', sa.String(length=512), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('language', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], [f'{schema}.react_component_esm_projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        schema=schema
    )
    op.create_index(op.f('ix_react_component_esm_react_component_esm_files_name'), 'react_component_esm_files', ['name'], unique=False, schema=schema)
    op.create_index(op.f('ix_react_component_esm_react_component_esm_files_project_id'), 'react_component_esm_files', ['project_id'], unique=False, schema=schema)


def downgrade() -> None:
    """Downgrade schema - safely tear down only the tables created here."""
    # Get schema from settings
    schema = settings.POSTGRES_SCHEMA if settings.POSTGRES_SCHEMA != 'react_component_esm' else 'public'

    # Drop dependent tables first to respect FK relationships
    teardown_order = (
        'react_component_esm_files',      # Child table (has FK to projects)
        'react_component_esm_projects',   # Parent table
    )

    for table_name in teardown_order:
        # Drop indexes first
        for index_name in TABLE_INDEXES.get(table_name, []):
            op.drop_index(index_name, table_name=table_name, schema=schema)
        # Then drop table
        op.drop_table(table_name, schema=schema)

    # Drop schema last (only if empty and not public)
    if schema != 'public':
        op.execute(f'DROP SCHEMA IF EXISTS {schema}')
