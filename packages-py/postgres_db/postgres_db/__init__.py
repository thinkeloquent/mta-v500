"""PostgreSQL connection manager with namespace-based pooling."""

from .types import DatabaseConfig, ConnectionInfo, ConnectionTestResult
from .errors import (
    PostgresDBError,
    NamespaceNotFoundError,
    ConnectionError,
    ConfigurationError,
    NamespaceAlreadyExistsError,
)
from .connection import (
    register_namespace,
    get_namespace_connection,
    list_namespaces,
    get_connection_info,
    get_all_connection_info,
    test_connection,
    close_all_connections,
    close_namespace,
    get_default_namespace,
)

__version__ = "1.0.0"

__all__ = [
    # Version
    "__version__",
    # Types
    "DatabaseConfig",
    "ConnectionInfo",
    "ConnectionTestResult",
    # Errors
    "PostgresDBError",
    "NamespaceNotFoundError",
    "ConnectionError",
    "ConfigurationError",
    "NamespaceAlreadyExistsError",
    # Core functions
    "register_namespace",
    "get_namespace_connection",
    "list_namespaces",
    "get_connection_info",
    "get_all_connection_info",
    "test_connection",
    "close_all_connections",
    "close_namespace",
    "get_default_namespace",
]
