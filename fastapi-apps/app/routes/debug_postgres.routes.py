"""Debug routes for PostgreSQL database connections."""

import time
from datetime import datetime
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from auth import verify_debug_credentials

# Import postgres_db package
try:
    from postgres_db import (
        list_namespaces,
        get_connection_info,
        get_all_connection_info,
        test_connection,
        get_default_namespace,
    )
    from postgres_db.errors import NamespaceNotFoundError
    from postgres_db.connection import get_namespace_connection
    from postgres_db.fastapi import load_namespace_from_env

    POSTGRES_DB_AVAILABLE = True
except ImportError:
    POSTGRES_DB_AVAILABLE = False


router = APIRouter(prefix="/debug/db", tags=["debug"])


class NamespaceListResponse(BaseModel):
    """Response for listing namespaces."""

    default_namespace: str
    namespaces: list[str]
    namespace_count: int


class ConnectionTestResponse(BaseModel):
    """Response for connection test."""

    namespace: str
    success: bool
    latency_ms: Optional[float] = None
    error: Optional[str] = None
    timestamp: str


class ConnectionConfigResponse(BaseModel):
    """Response for connection configuration."""

    namespace: str
    host: str
    port: int
    user: str
    password: str  # Masked
    database: str
    schema: str
    pool_size: int
    max_overflow: int
    pool_pre_ping: bool


class LazyLoadResponse(BaseModel):
    """Response for lazy loading a namespace."""

    namespace: str
    success: bool
    message: str
    error: Optional[str] = None


@router.get(
    "/namespaces",
    response_model=NamespaceListResponse,
    summary="List all database namespaces",
    description="""
    Returns a list of all registered database namespaces.

    Shows the default namespace (from DB_DEFAULT_NAMESPACE env var or 'app_db')
    and all currently registered namespaces.

    **Security:**
    This endpoint requires Basic Authentication.
    """,
)
async def list_db_namespaces(
    _: bool = Depends(verify_debug_credentials),
) -> NamespaceListResponse:
    """List all registered database namespaces."""
    if not POSTGRES_DB_AVAILABLE:
        raise HTTPException(status_code=500, detail="postgres_db package not available")

    return NamespaceListResponse(
        default_namespace=get_default_namespace(),
        namespaces=list_namespaces(),
        namespace_count=len(list_namespaces()),
    )


@router.get(
    "/test/{namespace_key}",
    response_model=ConnectionTestResponse,
    summary="Test database connection",
    description="""
    Tests the database connection for a specific namespace by executing SELECT 1.

    Returns connection status, latency, and any error messages.

    **Security:**
    This endpoint requires Basic Authentication.
    """,
)
async def test_db_connection(
    namespace_key: str, _: bool = Depends(verify_debug_credentials)
) -> ConnectionTestResponse:
    """Test database connection for a namespace."""
    if not POSTGRES_DB_AVAILABLE:
        raise HTTPException(status_code=500, detail="postgres_db package not available")

    start_time = time.time()
    success, error = await test_connection(namespace_key)
    latency_ms = (time.time() - start_time) * 1000

    return ConnectionTestResponse(
        namespace=namespace_key,
        success=success,
        latency_ms=latency_ms if success else None,
        error=error,
        timestamp=datetime.utcnow().isoformat(),
    )


@router.get(
    "/config/{namespace_key}",
    response_model=ConnectionConfigResponse,
    summary="Get database configuration",
    description="""
    Returns the database configuration for a specific namespace.

    Password is masked for security (shows first and last 2 chars).

    **Security:**
    This endpoint requires Basic Authentication.
    """,
)
async def get_db_config(
    namespace_key: str, _: bool = Depends(verify_debug_credentials)
) -> ConnectionConfigResponse:
    """Get database configuration for a namespace."""
    if not POSTGRES_DB_AVAILABLE:
        raise HTTPException(status_code=500, detail="postgres_db package not available")

    try:
        conn_info = get_connection_info(namespace_key)
        masked_config = conn_info.config.mask_password()

        return ConnectionConfigResponse(
            namespace=namespace_key,
            host=masked_config.host,
            port=masked_config.port,
            user=masked_config.user,
            password=masked_config.password,
            database=masked_config.database,
            schema=masked_config.schema,
            pool_size=masked_config.pool_size,
            max_overflow=masked_config.max_overflow,
            pool_pre_ping=masked_config.pool_pre_ping,
        )
    except NamespaceNotFoundError as e:
        raise HTTPException(
            status_code=404,
            detail=f"Namespace '{namespace_key}' not found. Available: {', '.join(e.available_namespaces)}",
        )


@router.get(
    "/info",
    summary="Get all connection information",
    description="""
    Returns detailed information about all registered database connections.

    Includes connection status, engine initialization status, and configuration.

    **Security:**
    This endpoint requires Basic Authentication.
    """,
)
async def get_all_db_info(_: bool = Depends(verify_debug_credentials)) -> Dict:
    """Get information about all database connections."""
    if not POSTGRES_DB_AVAILABLE:
        raise HTTPException(status_code=500, detail="postgres_db package not available")

    all_info = get_all_connection_info()

    # Format response with masked passwords
    formatted_info = {}
    for ns, info in all_info.items():
        masked_config = info.config.mask_password()
        formatted_info[ns] = {
            "namespace": info.namespace,
            "is_connected": info.is_connected,
            "async_engine_initialized": info.async_engine_initialized,
            "sync_engine_initialized": info.sync_engine_initialized,
            "config": {
                "host": masked_config.host,
                "port": masked_config.port,
                "user": masked_config.user,
                "password": masked_config.password,
                "database": masked_config.database,
                "schema": masked_config.schema,
                "pool_size": masked_config.pool_size,
            },
        }

    return {
        "default_namespace": get_default_namespace(),
        "namespace_count": len(all_info),
        "namespaces": formatted_info,
    }


@router.post(
    "/connect/{namespace_key}",
    response_model=LazyLoadResponse,
    summary="Lazy-load a namespace connection",
    description="""
    Lazy-load a database namespace by reading configuration from os.environ
    and registering the connection.

    This is useful for on-demand connection creation without requiring
    eager initialization at startup.

    **Security:**
    This endpoint requires Basic Authentication.
    """,
)
async def lazy_load_namespace(
    namespace_key: str,
    env_namespace: Optional[str] = Query(None, description="Env namespace to load from (unused, kept for compatibility)"),
    _: bool = Depends(verify_debug_credentials),
) -> LazyLoadResponse:
    """Lazy-load a database namespace from os.environ."""
    if not POSTGRES_DB_AVAILABLE:
        raise HTTPException(status_code=500, detail="postgres_db package not available")

    try:
        import os
        from postgres_db import register_namespace

        config = load_namespace_from_env(dict(os.environ), namespace_key)
        register_namespace(namespace_key, config, replace=True)

        # Initialize connection
        conn = get_namespace_connection(namespace_key)
        await conn.initialize_async()

        return LazyLoadResponse(
            namespace=namespace_key,
            success=True,
            message=f"Successfully loaded namespace '{namespace_key}' from os.environ",
        )
    except Exception as e:
        return LazyLoadResponse(
            namespace=namespace_key, success=False, message="Failed to load namespace", error=str(e)
        )
