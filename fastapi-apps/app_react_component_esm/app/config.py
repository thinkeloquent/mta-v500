"""
Application configuration using Pydantic Settings.
Environment variables are loaded from system environment (not .env files).
"""

import os
from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Application settings loaded from system environment variables.

    As per project requirements, use system env vars:
    - POSTGRES_HOST
    - POSTGRES_PORT
    - POSTGRES_USER
    - POSTGRES_PASSWORD
    - POSTGRES_DB
    - POSTGRES_SCHEMA
    """

    # Database Configuration
    POSTGRES_HOST: str = os.environ.get("POSTGRES_HOST", "localhost")
    POSTGRES_PORT: int = int(os.environ.get("POSTGRES_PORT", "5432"))
    POSTGRES_USER: str = os.environ.get("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.environ.get("POSTGRES_PASSWORD", "")
    POSTGRES_DB: str = os.environ.get("POSTGRES_DB", "react_component_esm")
    POSTGRES_SCHEMA: str = os.environ.get("POSTGRES_SCHEMA", "react_component_esm")

    # Application Configuration
    APP_NAME: str = "React Component ESM Editor API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.environ.get("ENVIRONMENT", os.environ.get("NODE_ENV", "development"))
    PORT: int = int(os.environ.get("PORT", "60174"))
    DEBUG: bool = ENVIRONMENT == "development"

    # Database Pool Configuration
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 0
    DB_POOL_PRE_PING: bool = True

    # API Configuration
    API_PREFIX: str = "/api"
    CORS_ORIGINS: list = ["*"]

    @property
    def database_url(self) -> str:
        """
        Construct async PostgreSQL database URL.
        Uses asyncpg driver for SQLAlchemy async operations.
        """
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def sync_database_url(self) -> str:
        """
        Construct sync PostgreSQL database URL for Alembic migrations.
        Uses psycopg2 driver.
        """
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    class Config:
        case_sensitive = True
        # Don't load from .env file - use system environment only
        env_file = None


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    Uses lru_cache to ensure singleton pattern.
    """
    return Settings()


# Export settings instance
settings = get_settings()
