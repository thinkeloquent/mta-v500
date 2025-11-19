"""
Persona API routes.
"""

from typing import List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.persona import Persona
from app.schemas.persona import PersonaCreate, PersonaUpdate, PersonaResponse
from app.schemas.audit_log import AuditLogResponse
from app.services.audit_service import create_audit_log, get_persona_audit_logs
from app.utils.id_generator import generate_persona_id
from app.exceptions import ResourceNotFoundError

router = APIRouter()


@router.get("", response_model=List[PersonaResponse])
async def list_personas(db: AsyncSession = Depends(get_db)):
    """
    Retrieve all personas ordered by last_updated (descending).

    Returns:
        List of all personas
    """
    stmt = select(Persona).order_by(desc(Persona.last_updated))
    result = await db.execute(stmt)
    personas = result.scalars().all()
    return list(personas)


@router.post("", response_model=PersonaResponse, status_code=status.HTTP_201_CREATED)
async def create_persona(
    persona_data: PersonaCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new persona.

    - Generates unique ID (persona-{uuid})
    - Sets last_updated timestamp
    - Creates audit log entry

    Args:
        persona_data: Persona creation data
        request: FastAPI request (for IP address)
        db: Database session

    Returns:
        Created persona
    """
    try:
        # Generate persona ID
        persona_id = generate_persona_id()

        # Create persona model
        # Use mode='json' to properly serialize nested models (like MemoryConfig) for JSONB storage
        persona_dict = persona_data.model_dump(mode='json')
        persona = Persona(
            id=persona_id,
            **persona_dict,
            last_updated=datetime.now(),
        )

        # Save to database
        db.add(persona)
        await db.flush()  # Flush to ensure persona exists before audit log

        # Create audit log
        await create_audit_log(
            db=db,
            persona_id=persona_id,
            action="CREATE",
            changes=persona_dict,
            user_id="system",
            ip_address=request.client.host if request.client else None,
        )

        # Let get_db() auto-commit after route completes
        return persona

    except Exception as e:
        # Log the error and return a 500 with details
        import traceback
        error_detail = f"Failed to create persona: {str(e)}\n{traceback.format_exc()}"
        print(f"[ERROR] {error_detail}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create persona: {str(e)}"
        )


@router.get("/{persona_id}", response_model=PersonaResponse)
async def get_persona(persona_id: str, db: AsyncSession = Depends(get_db)):
    """
    Get a single persona by ID.

    Args:
        persona_id: Persona ID
        db: Database session

    Returns:
        Persona if found

    Raises:
        404: Persona not found
    """
    stmt = select(Persona).where(Persona.id == persona_id)
    result = await db.execute(stmt)
    persona = result.scalar_one_or_none()

    if not persona:
        raise ResourceNotFoundError(resource_type="Persona", resource_id=persona_id)

    return persona


@router.put("/{persona_id}", response_model=PersonaResponse)
async def update_persona(
    persona_id: str,
    persona_data: PersonaUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Update an existing persona.

    - Updates only provided fields
    - Updates last_updated timestamp
    - Creates audit log entry

    Args:
        persona_id: Persona ID to update
        persona_data: Fields to update
        request: FastAPI request (for IP address)
        db: Database session

    Returns:
        Updated persona

    Raises:
        404: Persona not found
    """
    # Get existing persona
    stmt = select(Persona).where(Persona.id == persona_id)
    result = await db.execute(stmt)
    persona = result.scalar_one_or_none()

    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Persona with id '{persona_id}' not found",
        )

    # Update fields (only non-None values)
    # Use mode='json' to properly serialize nested models for JSONB storage
    update_data = persona_data.model_dump(exclude_unset=True, mode='json')
    for field, value in update_data.items():
        setattr(persona, field, value)

    # Update timestamp
    persona.last_updated = datetime.now()

    await db.flush()

    # Create audit log
    await create_audit_log(
        db=db,
        persona_id=persona_id,
        action="UPDATE",
        changes=update_data,
        user_id="system",
        ip_address=request.client.host if request.client else None,
    )

    # Let get_db() auto-commit after route completes
    return persona


@router.delete("/{persona_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_persona(
    persona_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a persona.

    - Deletes persona and all associated audit logs (CASCADE)
    - Creates audit log entry before deletion

    Args:
        persona_id: Persona ID to delete
        request: FastAPI request (for IP address)
        db: Database session

    Returns:
        204 No Content

    Raises:
        404: Persona not found
    """
    # Get persona
    stmt = select(Persona).where(Persona.id == persona_id)
    result = await db.execute(stmt)
    persona = result.scalar_one_or_none()

    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Persona with id '{persona_id}' not found",
        )

    # Create audit log before deletion
    await create_audit_log(
        db=db,
        persona_id=persona_id,
        action="DELETE",
        changes={"id": persona_id, "name": persona.name},
        user_id="system",
        ip_address=request.client.host if request.client else None,
    )

    # Delete persona (audit logs will cascade delete)
    await db.delete(persona)
    # Let get_db() auto-commit after route completes

    return None


@router.get("/{persona_id}/audit-logs", response_model=List[AuditLogResponse])
async def get_persona_audit_history(
    persona_id: str,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """
    Get audit log history for a persona.

    Args:
        persona_id: Persona ID
        limit: Maximum number of logs to return (default: 100)
        db: Database session

    Returns:
        List of audit logs ordered by timestamp DESC

    Raises:
        404: Persona not found
    """
    # Verify persona exists
    stmt = select(Persona).where(Persona.id == persona_id)
    result = await db.execute(stmt)
    persona = result.scalar_one_or_none()

    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Persona with id '{persona_id}' not found",
        )

    # Get audit logs
    audit_logs = await get_persona_audit_logs(db, persona_id, limit)
    return audit_logs
