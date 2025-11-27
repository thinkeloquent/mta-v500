"""
Application configuration using pydantic-settings.
Reads from system environment variables (POSTGRES_*, FIGMA_TOKEN).
"""

import os
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from system environment variables.
    Uses POSTGRES_* pattern as specified in global instructions.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application settings
    app_name: str = "figma-component-inspector"
    node_env: Literal["development", "production"] = "development"
    port: int = 3001
    host: str = "0.0.0.0"
    log_level: str = "info"

    # Database settings - using POSTGRES_* system environment variables
    postgres_host: str = os.getenv("POSTGRES_HOST", "localhost")
    postgres_port: int = int(os.getenv("POSTGRES_PORT", "5432"))
    postgres_db: str = os.getenv("POSTGRES_DB", "figma_inspector")
    postgres_user: str = os.getenv("POSTGRES_USER", "postgres")
    postgres_password: str = os.getenv("POSTGRES_PASSWORD", "")
    postgres_schema: str | None = os.getenv("POSTGRES_SCHEMA", None)

    # Figma API settings
    figma_token: str = os.getenv("FIGMA_TOKEN", "")
    figma_file_id: str | None = None

    # CORS settings
    frontend_url: str | None = None

    @property
    def database_url(self) -> str:
        """Build async PostgreSQL connection URL."""
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.node_env == "development"

    @property
    def cors_origins(self) -> list[str]:
        """Get CORS allowed origins."""
        return ["*"]


# Global settings instance
settings = Settings()
