"""FastAPI dependency injection functions for postgres-db."""

from typing import Optional, AsyncGenerator, Generator, Callable

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from ..connection import get_namespace_connection, get_default_namespace
from ..errors import NamespaceNotFoundError


async def get_db_session(namespace: Optional[str] = None) -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides an async database session.

    Usage:
        @app.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db_session)):
            result = await db.execute(select(Item))
            return result.scalars().all()

    Args:
        namespace: Database namespace to use, or None for default

    Yields:
        AsyncSession instance

    Raises:
        NamespaceNotFoundError: If namespace not found
    """
    ns = namespace or get_default_namespace()
    conn = get_namespace_connection(ns)

    # Ensure async engine is initialized
    if conn.async_engine is None:
        await conn.initialize_async()

    async with conn.get_async_session() as session:
        yield session


def get_sync_db_session(namespace: Optional[str] = None) -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a sync database session.

    Useful for Alembic migrations or other sync operations.

    Usage:
        @app.get("/items")
        def get_items(db: Session = Depends(get_sync_db_session)):
            result = db.execute(select(Item))
            return result.scalars().all()

    Args:
        namespace: Database namespace to use, or None for default

    Yields:
        Session instance

    Raises:
        NamespaceNotFoundError: If namespace not found
    """
    ns = namespace or get_default_namespace()
    conn = get_namespace_connection(ns)

    # Ensure sync engine is initialized
    if conn.sync_engine is None:
        conn.initialize_sync()

    with conn.get_sync_session() as session:
        yield session


def get_db_namespace(namespace: str) -> Callable[[], AsyncGenerator[AsyncSession, None]]:
    """
    Create a FastAPI dependency for a specific namespace.

    This is a dependency factory that creates a dependency bound to a specific namespace.

    Usage:
        # Create namespace-specific dependency
        get_analytics_db = get_db_namespace("analytics_db")

        @app.get("/analytics")
        async def get_analytics(db: AsyncSession = Depends(get_analytics_db)):
            result = await db.execute(select(Analytics))
            return result.scalars().all()

    Args:
        namespace: Database namespace to bind to

    Returns:
        Dependency function that yields AsyncSession

    Raises:
        NamespaceNotFoundError: If namespace not found when dependency is called
    """

    async def _dependency() -> AsyncGenerator[AsyncSession, None]:
        async for session in get_db_session(namespace):
            yield session

    return _dependency
