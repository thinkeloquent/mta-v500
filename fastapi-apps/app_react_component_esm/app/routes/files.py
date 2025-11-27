"""
File API routes.
"""

from typing import List
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.file import File
from app.repositories.file import FileRepository
from app.repositories.project import ProjectRepository
from app.schemas.file import (
    File as FileSchema,
    FileCreate,
    FileUpdate,
)

router = APIRouter()


@router.get("", response_model=List[FileSchema])
async def list_files(
    project_id: UUID = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """
    List all files, optionally filtered by project.
    """
    repo = FileRepository(db)

    if project_id:
        files = await repo.get_files_by_project(
            str(project_id),
            skip=skip,
            limit=limit
        )
    else:
        files = await repo.get_all(skip=skip, limit=limit)

    return files


@router.get("/{file_id}", response_model=FileSchema)
async def get_file(
    file_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a single file by ID.
    """
    repo = FileRepository(db)
    file = await repo.get_by_id(str(file_id))

    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File {file_id} not found"
        )

    return file


@router.post("", response_model=FileSchema, status_code=status.HTTP_201_CREATED)
async def create_file(
    file_data: FileCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new file.
    """
    file_repo = FileRepository(db)
    project_repo = ProjectRepository(db)

    # Verify project exists
    project = await project_repo.get_by_id(str(file_data.project_id))
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project {file_data.project_id} not found"
        )

    # Check if file already exists in project
    existing_file = await file_repo.get_file_by_name_and_project(
        str(file_data.project_id),
        file_data.name,
        file_data.path
    )
    if existing_file:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"File {file_data.name} already exists in this project/path"
        )

    # Create file instance
    file = File(
        project_id=file_data.project_id,
        name=file_data.name,
        path=file_data.path,
        content=file_data.content,
        language=file_data.language,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    # Save to database
    file = await file_repo.create(file)
    return file


@router.put("/{file_id}", response_model=FileSchema)
async def update_file(
    file_id: UUID,
    file_data: FileUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update a file.
    """
    repo = FileRepository(db)

    # Get existing file
    file = await repo.get_by_id(str(file_id))
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File {file_id} not found"
        )

    # Update fields (only if provided)
    if file_data.name is not None:
        file.name = file_data.name
    if file_data.path is not None:
        file.path = file_data.path
    if file_data.content is not None:
        file.content = file_data.content
    if file_data.language is not None:
        file.language = file_data.language

    file.updated_at = datetime.utcnow()

    # Save changes
    file = await repo.update(file)
    return file


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a file.
    """
    repo = FileRepository(db)

    deleted = await repo.delete(str(file_id))
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File {file_id} not found"
        )

    return None
