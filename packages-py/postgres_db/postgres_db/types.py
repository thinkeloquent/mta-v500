"""Type definitions for postgres-db package."""

from typing import Optional
from pydantic import BaseModel, Field, field_validator


class DatabaseConfig(BaseModel):
    """Configuration for a PostgreSQL database connection."""

    host: str = Field(default="localhost", description="Database host")
    port: int = Field(default=5432, description="Database port")
    user: str = Field(description="Database user")
    password: str = Field(description="Database password")
    database: str = Field(description="Database name")
    schema: str = Field(default="public", description="Default schema")

    # Pool configuration
    pool_size: int = Field(default=10, description="Connection pool size")
    max_overflow: int = Field(default=0, description="Maximum overflow connections")
    pool_pre_ping: bool = Field(default=True, description="Enable connection health checks")
    pool_recycle: int = Field(default=3600, description="Connection recycle time in seconds")
    echo: bool = Field(default=False, description="Enable SQL echo for debugging")

    @field_validator('port')
    @classmethod
    def validate_port(cls, v: int) -> int:
        """Validate port is in valid range."""
        if not 1 <= v <= 65535:
            raise ValueError(f"Port must be between 1 and 65535, got {v}")
        return v

    @property
    def async_url(self) -> str:
        """Generate async database URL for asyncpg driver."""
        return (
            f"postgresql+asyncpg://{self.user}:{self.password}"
            f"@{self.host}:{self.port}/{self.database}"
        )

    @property
    def sync_url(self) -> str:
        """Generate sync database URL for psycopg2 driver."""
        return (
            f"postgresql+psycopg2://{self.user}:{self.password}"
            f"@{self.host}:{self.port}/{self.database}"
        )

    def mask_password(self) -> "DatabaseConfig":
        """Return a copy with masked password for safe display."""
        config_dict = self.model_dump()
        if config_dict['password']:
            pwd = config_dict['password']
            if len(pwd) <= 4:
                config_dict['password'] = "***"
            else:
                config_dict['password'] = f"{pwd[:2]}...{pwd[-2:]}"
        return DatabaseConfig(**config_dict)


class ConnectionInfo(BaseModel):
    """Information about a database connection."""

    namespace: str = Field(description="Namespace identifier")
    config: DatabaseConfig = Field(description="Database configuration")
    is_connected: bool = Field(default=False, description="Whether connection is established")
    async_engine_initialized: bool = Field(default=False, description="Async engine status")
    sync_engine_initialized: bool = Field(default=False, description="Sync engine status")
    error: Optional[str] = Field(default=None, description="Last error message if any")

    class Config:
        """Pydantic config."""
        arbitrary_types_allowed = True


class ConnectionTestResult(BaseModel):
    """Result of a connection test."""

    namespace: str = Field(description="Namespace tested")
    success: bool = Field(description="Whether connection test succeeded")
    latency_ms: Optional[float] = Field(default=None, description="Connection latency in milliseconds")
    error: Optional[str] = Field(default=None, description="Error message if test failed")
    timestamp: Optional[str] = Field(default=None, description="ISO timestamp of test")
