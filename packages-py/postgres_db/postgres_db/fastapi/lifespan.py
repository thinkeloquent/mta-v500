"""FastAPI lifespan handlers for postgres-db."""

import os
from typing import Optional, Callable, Any
from contextlib import asynccontextmanager

from ..types import DatabaseConfig
from ..connection import (
    register_namespace,
    close_all_connections,
    close_namespace,
)
from ..errors import ConfigurationError


def load_namespace_from_env(
    env_namespace: dict[str, str],
    namespace_key: str,
    pool_size: Optional[int] = None,
    max_overflow: Optional[int] = None,
    pool_pre_ping: Optional[bool] = None,
    pool_recycle: Optional[int] = None,
    echo: Optional[bool] = None,
) -> DatabaseConfig:
    """
    Load database configuration from environment namespace.

    Reads configuration from env_secrets namespace or os.environ.

    Args:
        env_namespace: Dictionary of environment variables (from get_env_namespace())
        namespace_key: Identifier for this database namespace
        pool_size: Override pool size (default: from env or 10)
        max_overflow: Override max overflow (default: from env or 0)
        pool_pre_ping: Override pool pre-ping (default: from env or True)
        pool_recycle: Override pool recycle (default: from env or 3600)
        echo: Override echo (default: from env or False)

    Returns:
        DatabaseConfig instance

    Raises:
        ConfigurationError: If required fields are missing
    """
    # Required fields
    required_fields = ["POSTGRES_HOST", "POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB"]
    missing_fields = [field for field in required_fields if not env_namespace.get(field)]

    if missing_fields:
        raise ConfigurationError(
            namespace=namespace_key, missing_fields=missing_fields
        )

    # Build config
    config = DatabaseConfig(
        host=env_namespace.get("POSTGRES_HOST", "localhost"),
        port=int(env_namespace.get("POSTGRES_PORT", "5432")),
        user=env_namespace.get("POSTGRES_USER"),
        password=env_namespace.get("POSTGRES_PASSWORD"),
        database=env_namespace.get("POSTGRES_DB"),
        schema=env_namespace.get("POSTGRES_SCHEMA", "public"),
        pool_size=pool_size or int(env_namespace.get("DB_POOL_SIZE", "10")),
        max_overflow=max_overflow or int(env_namespace.get("DB_MAX_OVERFLOW", "0")),
        pool_pre_ping=pool_pre_ping
        if pool_pre_ping is not None
        else env_namespace.get("DB_POOL_PRE_PING", "true").lower() == "true",
        pool_recycle=pool_recycle or int(env_namespace.get("DB_POOL_RECYCLE", "3600")),
        echo=echo if echo is not None else env_namespace.get("DB_ECHO", "false").lower() == "true",
    )

    return config


def create_db_lifespan_handler(
    namespaces: Optional[list[str]] = None,
    configs: Optional[dict[str, DatabaseConfig]] = None,
    load_from_env: bool = True,
    auto_initialize: bool = True,
) -> Callable:
    """
    Create a FastAPI lifespan context manager for database connections.

    This handles startup (registering namespaces, initializing connections) and
    shutdown (closing all connections).

    Usage:
        # Simple: Load from env_secrets namespaces
        lifespan = create_db_lifespan_handler(namespaces=["app_db", "analytics_db"])
        app = FastAPI(lifespan=lifespan)

        # Advanced: Provide explicit configs
        configs = {
            "app_db": DatabaseConfig(host="localhost", user="user", ...),
            "analytics_db": DatabaseConfig(host="analytics-host", user="user", ...),
        }
        lifespan = create_db_lifespan_handler(configs=configs)
        app = FastAPI(lifespan=lifespan)

    Args:
        namespaces: List of namespace keys to load from env_secrets
        configs: Explicit configs for namespaces (bypasses env loading)
        load_from_env: If True, load config from env_secrets or os.environ
        auto_initialize: If True, initialize async engines at startup (eager loading)

    Returns:
        Async context manager for FastAPI lifespan
    """

    @asynccontextmanager
    async def lifespan(app: Any):
        """Lifespan context manager."""
        # Startup
        initialized_namespaces = []

        try:
            # Register namespaces with explicit configs
            if configs:
                for ns_key, config in configs.items():
                    register_namespace(ns_key, config, replace=True)
                    initialized_namespaces.append(ns_key)

            # Register namespaces from env
            elif namespaces and load_from_env:
                # Try to import env_secrets if available
                try:
                    from env_secrets.fastapi import get_env_namespace

                    for ns_key in namespaces:
                        try:
                            env_vars = get_env_namespace(ns_key)
                            config = load_namespace_from_env(env_vars, ns_key)
                            register_namespace(ns_key, config, replace=True)
                            initialized_namespaces.append(ns_key)
                        except Exception as e:
                            print(
                                f"Warning: Failed to load database namespace '{ns_key}' from env_secrets: {e}"
                            )
                            # Try fallback to os.environ
                            try:
                                config = load_namespace_from_env(dict(os.environ), ns_key)
                                register_namespace(ns_key, config, replace=True)
                                initialized_namespaces.append(ns_key)
                                print(f"Loaded database namespace '{ns_key}' from os.environ")
                            except Exception as fallback_error:
                                print(
                                    f"Error: Failed to load database namespace '{ns_key}': {fallback_error}"
                                )
                                raise

                except ImportError:
                    # env_secrets not available, use os.environ
                    for ns_key in namespaces:
                        config = load_namespace_from_env(dict(os.environ), ns_key)
                        register_namespace(ns_key, config, replace=True)
                        initialized_namespaces.append(ns_key)

            # Auto-initialize async engines (eager loading)
            if auto_initialize:
                from ..connection import get_namespace_connection

                for ns_key in initialized_namespaces:
                    try:
                        conn = get_namespace_connection(ns_key)
                        await conn.initialize_async()
                        print(f"Initialized async connection for namespace '{ns_key}'")
                    except Exception as e:
                        print(f"Warning: Failed to initialize namespace '{ns_key}': {e}")
                        raise

            print(f"Database namespaces initialized: {', '.join(initialized_namespaces)}")

        except Exception as e:
            print(f"Error during database startup: {e}")
            # Clean up any partially initialized connections
            await close_all_connections()
            raise

        # Yield control to application
        yield

        # Shutdown
        print("Closing database connections...")
        await close_all_connections()
        print("Database connections closed")

    return lifespan


def create_namespace_lifespan_handler(
    namespace: str, config: Optional[DatabaseConfig] = None, load_from_env: bool = True
) -> Callable:
    """
    Create a lifespan handler for a single namespace.

    Simpler version of create_db_lifespan_handler for single-namespace use cases.

    Args:
        namespace: Namespace key
        config: Explicit config (optional)
        load_from_env: Load from env_secrets if config not provided

    Returns:
        Async context manager for FastAPI lifespan
    """
    if config:
        return create_db_lifespan_handler(configs={namespace: config})
    else:
        return create_db_lifespan_handler(namespaces=[namespace], load_from_env=load_from_env)
