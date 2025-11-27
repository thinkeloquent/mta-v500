"""
Database configuration and session management.
Uses async SQLAlchemy with asyncpg driver.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.logging_config import logger
from sqlalchemy import text

from app.config import settings

# Create async engine with connection pool settings matching Fastify
# Max 10, Min 0, Acquire timeout 30s, Idle timeout 10s
engine = create_async_engine(
    settings.database_url,
    echo=settings.is_development,
    pool_size=10,
    max_overflow=0,
    pool_pre_ping=True,
    pool_recycle=3600,
    connect_args={
        "server_settings": {"application_name": settings.app_name},
    },
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency for database sessions.

    Yields:
        AsyncSession: Database session

    Example:
        @router.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def test_connection() -> bool:
    """
    Test database connection.

    Returns:
        bool: True if connection successful

    Raises:
        Exception: If connection fails
    """
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection successful")
        return True
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise


async def close_database() -> None:
    """
    Close database connections gracefully.
    Called during application shutdown.
    """
    logger.info("Closing database connections...")
    await engine.dispose()
    logger.info("Database connections closed")
