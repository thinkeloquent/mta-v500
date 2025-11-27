"""Core connection management for postgres-db package."""

import os
from typing import Dict, Optional, Any
from contextlib import asynccontextmanager, contextmanager

from sqlalchemy import create_engine, text, Engine
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    create_async_engine,
    async_sessionmaker,
)
from sqlalchemy.orm import sessionmaker, Session

from .types import DatabaseConfig, ConnectionInfo
from .errors import (
    NamespaceNotFoundError,
    ConnectionError as DBConnectionError,
    ConfigurationError,
    NamespaceAlreadyExistsError,
)


class DBConnection:
    """Holds connection resources for a single database namespace."""

    def __init__(self, namespace: str, config: DatabaseConfig):
        """Initialize connection holder."""
        self.namespace = namespace
        self.config = config
        self.async_engine: Optional[AsyncEngine] = None
        self.sync_engine: Optional[Engine] = None
        self.async_session_maker: Optional[async_sessionmaker] = None
        self.sync_session_maker: Optional[sessionmaker] = None

    async def initialize_async(self) -> None:
        """Initialize async engine and session maker."""
        if self.async_engine is not None:
            return  # Already initialized

        try:
            self.async_engine = create_async_engine(
                self.config.async_url,
                echo=self.config.echo,
                pool_size=self.config.pool_size,
                max_overflow=self.config.max_overflow,
                pool_pre_ping=self.config.pool_pre_ping,
                pool_recycle=self.config.pool_recycle,
            )

            self.async_session_maker = async_sessionmaker(
                self.async_engine,
                class_=AsyncSession,
                expire_on_commit=False,
                autocommit=False,
                autoflush=False,
            )
        except Exception as e:
            raise DBConnectionError(
                namespace=self.namespace, reason=f"Failed to initialize async engine: {str(e)}"
            )

    def initialize_sync(self) -> None:
        """Initialize sync engine and session maker."""
        if self.sync_engine is not None:
            return  # Already initialized

        try:
            self.sync_engine = create_engine(
                self.config.sync_url,
                echo=self.config.echo,
                pool_size=self.config.pool_size,
                max_overflow=self.config.max_overflow,
                pool_pre_ping=self.config.pool_pre_ping,
                pool_recycle=self.config.pool_recycle,
            )

            self.sync_session_maker = sessionmaker(
                self.sync_engine,
                class_=Session,
                expire_on_commit=False,
                autocommit=False,
                autoflush=False,
            )
        except Exception as e:
            raise DBConnectionError(
                namespace=self.namespace, reason=f"Failed to initialize sync engine: {str(e)}"
            )

    async def close_async(self) -> None:
        """Close async engine."""
        if self.async_engine is not None:
            await self.async_engine.dispose()
            self.async_engine = None
            self.async_session_maker = None

    def close_sync(self) -> None:
        """Close sync engine."""
        if self.sync_engine is not None:
            self.sync_engine.dispose()
            self.sync_engine = None
            self.sync_session_maker = None

    async def close(self) -> None:
        """Close all connections."""
        await self.close_async()
        self.close_sync()

    @asynccontextmanager
    async def get_async_session(self):
        """Get async session context manager."""
        if self.async_session_maker is None:
            await self.initialize_async()

        async with self.async_session_maker() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    @contextmanager
    def get_sync_session(self):
        """Get sync session context manager."""
        if self.sync_session_maker is None:
            self.initialize_sync()

        with self.sync_session_maker() as session:
            try:
                yield session
                session.commit()
            except Exception:
                session.rollback()
                raise
            finally:
                session.close()


# Global storage for database connections
_db_connections: Dict[str, DBConnection] = {}


def get_default_namespace() -> str:
    """Get the default database namespace from environment or use 'app_db'."""
    return os.environ.get("DB_DEFAULT_NAMESPACE", "app_db")


def register_namespace(
    namespace: str,
    config: DatabaseConfig,
    replace: bool = False,
) -> None:
    """
    Register a database namespace with its configuration.

    Args:
        namespace: Unique identifier for this database connection
        config: Database configuration
        replace: If True, replace existing namespace; if False, raise error if exists

    Raises:
        NamespaceAlreadyExistsError: If namespace exists and replace=False
    """
    if namespace in _db_connections and not replace:
        raise NamespaceAlreadyExistsError(namespace)

    _db_connections[namespace] = DBConnection(namespace=namespace, config=config)


def get_namespace_connection(namespace: Optional[str] = None) -> DBConnection:
    """
    Get database connection for a namespace.

    Args:
        namespace: Namespace identifier, or None to use default

    Returns:
        DBConnection instance

    Raises:
        NamespaceNotFoundError: If namespace not found
    """
    ns = namespace or get_default_namespace()

    if ns not in _db_connections:
        raise NamespaceNotFoundError(
            namespace=ns, available_namespaces=list(_db_connections.keys())
        )

    return _db_connections[ns]


def list_namespaces() -> list[str]:
    """List all registered namespaces."""
    return list(_db_connections.keys())


def get_connection_info(namespace: Optional[str] = None) -> ConnectionInfo:
    """
    Get connection information for a namespace.

    Args:
        namespace: Namespace identifier, or None to use default

    Returns:
        ConnectionInfo with status details
    """
    conn = get_namespace_connection(namespace)
    return ConnectionInfo(
        namespace=conn.namespace,
        config=conn.config,
        is_connected=(conn.async_engine is not None or conn.sync_engine is not None),
        async_engine_initialized=(conn.async_engine is not None),
        sync_engine_initialized=(conn.sync_engine is not None),
    )


def get_all_connection_info() -> Dict[str, ConnectionInfo]:
    """Get connection info for all registered namespaces."""
    return {ns: get_connection_info(ns) for ns in list_namespaces()}


async def test_connection(namespace: Optional[str] = None) -> tuple[bool, Optional[str]]:
    """
    Test database connection by executing SELECT 1.

    Args:
        namespace: Namespace to test, or None for default

    Returns:
        Tuple of (success: bool, error_message: Optional[str])
    """
    try:
        conn = get_namespace_connection(namespace)
        if conn.async_engine is None:
            await conn.initialize_async()

        async with conn.get_async_session() as session:
            result = await session.execute(text("SELECT 1"))
            result.scalar()
            return (True, None)
    except Exception as e:
        return (False, str(e))


async def close_all_connections() -> None:
    """Close all database connections."""
    for conn in _db_connections.values():
        await conn.close()
    _db_connections.clear()


async def close_namespace(namespace: str) -> None:
    """
    Close and unregister a specific namespace.

    Args:
        namespace: Namespace to close
    """
    if namespace in _db_connections:
        await _db_connections[namespace].close()
        del _db_connections[namespace]
