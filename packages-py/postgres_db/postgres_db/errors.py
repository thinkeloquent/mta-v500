"""Custom exceptions for postgres-db package."""


class PostgresDBError(Exception):
    """Base exception for all postgres-db errors."""
    pass


class NamespaceNotFoundError(PostgresDBError):
    """Raised when a database namespace is not found."""

    def __init__(self, namespace: str, available_namespaces: list[str] = None):
        self.namespace = namespace
        self.available_namespaces = available_namespaces or []
        message = f"Database namespace '{namespace}' not found."
        if self.available_namespaces:
            message += f" Available namespaces: {', '.join(self.available_namespaces)}"
        super().__init__(message)


class ConnectionError(PostgresDBError):
    """Raised when database connection fails."""

    def __init__(self, namespace: str, reason: str):
        self.namespace = namespace
        self.reason = reason
        super().__init__(f"Failed to connect to database namespace '{namespace}': {reason}")


class ConfigurationError(PostgresDBError):
    """Raised when database configuration is invalid or missing."""

    def __init__(self, namespace: str, missing_fields: list[str] = None, message: str = None):
        self.namespace = namespace
        self.missing_fields = missing_fields or []
        if message:
            error_message = message
        elif self.missing_fields:
            error_message = (
                f"Invalid configuration for namespace '{namespace}'. "
                f"Missing required fields: {', '.join(self.missing_fields)}"
            )
        else:
            error_message = f"Invalid configuration for namespace '{namespace}'"
        super().__init__(error_message)


class NamespaceAlreadyExistsError(PostgresDBError):
    """Raised when attempting to register a namespace that already exists."""

    def __init__(self, namespace: str):
        self.namespace = namespace
        super().__init__(f"Database namespace '{namespace}' is already registered.")
