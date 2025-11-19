"""FastAPI integration for postgres-db package."""

from .dependencies import (
    get_db_session,
    get_sync_db_session,
    get_db_namespace,
)
from .lifespan import (
    create_db_lifespan_handler,
    load_namespace_from_env,
)

__all__ = [
    "get_db_session",
    "get_sync_db_session",
    "get_db_namespace",
    "create_db_lifespan_handler",
    "load_namespace_from_env",
]
