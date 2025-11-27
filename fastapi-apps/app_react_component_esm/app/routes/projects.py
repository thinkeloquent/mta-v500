"""
Project API routes.
"""

from typing import List
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.project import Project
from app.repositories.project import ProjectRepository
from app.schemas.project import (
    Project as ProjectSchema,
    ProjectCreate,
    ProjectUpdate,
    ProjectWithFiles,
)

router = APIRouter()


@router.get("", response_model=List[ProjectSchema])
async def list_projects(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """
    List all projects.
    """
    repo = ProjectRepository(db)
    projects = await repo.get_all(skip=skip, limit=limit)
    return projects


@router.get("/{project_id}", response_model=ProjectWithFiles)
async def get_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a single project by ID with files.
    """
    repo = ProjectRepository(db)
    project = await repo.get_by_id_with_files(str(project_id))

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found"
        )

    return project


@router.post("", response_model=ProjectSchema, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new project.
    """
    repo = ProjectRepository(db)

    # Create project instance
    project = Project(
        name=project_data.name,
        description=project_data.description,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    # Save to database
    project = await repo.create(project)
    return project


@router.put("/{project_id}", response_model=ProjectSchema)
async def update_project(
    project_id: UUID,
    project_data: ProjectUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update a project.
    """
    repo = ProjectRepository(db)

    # Get existing project
    project = await repo.get_by_id(str(project_id))
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found"
        )

    # Update fields (only if provided)
    if project_data.name is not None:
        project.name = project_data.name
    if project_data.description is not None:
        project.description = project_data.description

    project.updated_at = datetime.utcnow()

    # Save changes
    project = await repo.update(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a project (and all its files).
    """
    repo = ProjectRepository(db)

    deleted = await repo.delete(str(project_id))
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {project_id} not found"
        )

    return None
