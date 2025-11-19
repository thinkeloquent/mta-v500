"""
LLM Defaults API routes.
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError, DataError

from app.database import get_db
from app.models.llm_default import LLMDefault
from app.schemas.llm_default import (
    LLMDefaultCreate,
    LLMDefaultUpdate,
    LLMDefaultResponse,
)
from app.schemas.enums import LLMDefaultCategory
from app.utils.id_generator import generate_llm_default_id
from app.exceptions import ResourceNotFoundError, ValidationError

router = APIRouter()


@router.get("", response_model=List[LLMDefaultResponse])
async def list_llm_defaults(
    category: Optional[LLMDefaultCategory] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve all LLM defaults, optionally filtered by category.

    Args:
        category: Optional category filter
        db: Database session

    Returns:
        List of LLM defaults ordered by category, then label
    """
    if category:
        stmt = (
            select(LLMDefault)
            .where(LLMDefault.category == category)
            .order_by(LLMDefault.name)
        )
    else:
        stmt = select(LLMDefault).order_by(LLMDefault.category, LLMDefault.name)

    result = await db.execute(stmt)
    defaults = result.scalars().all()
    return list(defaults)


@router.get("/category/{category}", response_model=List[LLMDefaultResponse])
async def list_llm_defaults_by_category(
    category: LLMDefaultCategory,
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve LLM defaults filtered by category.

    Args:
        category: Category to filter by
        db: Database session

    Returns:
        List of LLM defaults in the specified category
    """
    stmt = (
        select(LLMDefault)
        .where(LLMDefault.category == category)
        .order_by(LLMDefault.name)
    )
    result = await db.execute(stmt)
    defaults = result.scalars().all()
    return list(defaults)


@router.get("/{default_id}", response_model=LLMDefaultResponse)
async def get_llm_default(
    default_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get a single LLM default by ID.

    Args:
        default_id: LLM default ID
        db: Database session

    Returns:
        LLM default if found

    Raises:
        404: LLM default not found
    """
    stmt = select(LLMDefault).where(LLMDefault.id == default_id)
    result = await db.execute(stmt)
    llm_default = result.scalar_one_or_none()

    if not llm_default:
        raise ResourceNotFoundError(resource_type="LLMDefault", resource_id=default_id)

    return llm_default


@router.post("", response_model=LLMDefaultResponse, status_code=status.HTTP_201_CREATED)
async def create_llm_default(
    default_data: LLMDefaultCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new LLM default.

    - Generates unique ID (nanoid)
    - If is_default=true, unsets other defaults in same category
    - Validates required fields based on category

    Args:
        default_data: LLM default creation data
        db: Database session

    Returns:
        Created LLM default
    """
    try:
        # Generate ID
        default_id = generate_llm_default_id()

        # If this is set as default, unset other defaults in the same category
        if default_data.is_default:
            stmt = (
                select(LLMDefault)
                .where(
                    and_(
                        LLMDefault.category == default_data.category,
                        LLMDefault.is_default == True,
                    )
                )
            )
            result = await db.execute(stmt)
            existing_defaults = result.scalars().all()

            for existing in existing_defaults:
                existing.is_default = False

        # Create LLM default
        # Explicitly convert category to plain lowercase string
        # Force conversion to plain str to avoid any enum name/value confusion
        if isinstance(default_data.category, LLMDefaultCategory):
            category_str = str(default_data.category.value)
        else:
            category_str = str(default_data.category).lower()

        now = datetime.now()
        llm_default = LLMDefault(
            id=default_id,
            category=category_str,
            name=default_data.name,
            description=default_data.description,
            value=default_data.value,
            is_default=default_data.is_default,
            created_at=now,
            updated_at=now,
        )

        db.add(llm_default)
        await db.flush()  # Flush to ensure object is persisted
        await db.refresh(llm_default)  # Refresh to get any database-generated values
        # Let get_db() auto-commit after route completes

        return llm_default

    except IntegrityError as e:
        # Handle database constraint violations (e.g., duplicate IDs, foreign key violations)
        import traceback
        error_detail = f"Database integrity error: {str(e)}\n{traceback.format_exc()}"
        print(f"[ERROR] {error_detail}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Database constraint violation: {str(e.orig) if hasattr(e, 'orig') else str(e)}"
        )
    except DataError as e:
        # Handle data type errors (e.g., enum value mismatch, invalid JSON)
        import traceback
        error_detail = f"Database data error: {str(e)}\n{traceback.format_exc()}"
        print(f"[ERROR] {error_detail}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid data format: {str(e.orig) if hasattr(e, 'orig') else str(e)}"
        )
    except Exception as e:
        # Log unexpected errors and return a 500
        import traceback
        error_detail = f"Unexpected error creating LLM default: {str(e)}\n{traceback.format_exc()}"
        print(f"[ERROR] {error_detail}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create LLM default: {str(e)}"
        )


@router.put("/{default_id}", response_model=LLMDefaultResponse)
async def update_llm_default(
    default_id: str,
    default_data: LLMDefaultUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Update an existing LLM default.

    - Updates only provided fields
    - If is_default=true, unsets other defaults in same category
    - Category cannot be changed

    Args:
        default_id: LLM default ID to update
        default_data: Fields to update
        db: Database session

    Returns:
        Updated LLM default

    Raises:
        404: LLM default not found
        400: Attempting to change category
    """
    # Get existing LLM default
    stmt = select(LLMDefault).where(LLMDefault.id == default_id)
    result = await db.execute(stmt)
    llm_default = result.scalar_one_or_none()

    if not llm_default:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"LLM default with id '{default_id}' not found",
        )

    # Extract update data
    # Use mode='json' to properly serialize nested models for JSONB storage
    update_data = default_data.model_dump(exclude_unset=True, mode='json')

    # Explicitly ensure category is a string value (not enum name) if present
    if "category" in update_data and default_data.category is not None:
        category_value = default_data.category
        if hasattr(category_value, 'value'):
            category_value = category_value.value
        update_data['category'] = category_value

    # Prevent category changes (compare string values)
    if "category" in update_data and update_data["category"] != llm_default.category.value:
        raise ValidationError(message="Cannot change category of existing LLM default")

    # If setting as default, unset other defaults in the same category
    if update_data.get("is_default") is True and not llm_default.is_default:
        stmt = (
            select(LLMDefault)
            .where(
                and_(
                    LLMDefault.category == llm_default.category,
                    LLMDefault.is_default == True,
                    LLMDefault.id != default_id,
                )
            )
        )
        result = await db.execute(stmt)
        existing_defaults = result.scalars().all()

        for existing in existing_defaults:
            existing.is_default = False

    # Update fields
    for field, value in update_data.items():
        setattr(llm_default, field, value)

    # Update timestamp
    llm_default.updated_at = datetime.now()

    await db.flush()  # Flush to ensure updates are persisted
    # Let get_db() auto-commit after route completes

    return llm_default


@router.delete("/{default_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_llm_default(
    default_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Delete an LLM default.

    Args:
        default_id: LLM default ID to delete
        db: Database session

    Returns:
        204 No Content

    Raises:
        404: LLM default not found
    """
    # Get LLM default
    stmt = select(LLMDefault).where(LLMDefault.id == default_id)
    result = await db.execute(stmt)
    llm_default = result.scalar_one_or_none()

    if not llm_default:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"LLM default with id '{default_id}' not found",
        )

    # Delete LLM default
    await db.delete(llm_default)
    # Let get_db() auto-commit after route completes

    return None
