"""
Application configuration using Pydantic Settings.
Environment variables are loaded from system environment (not .env files).

Provider configuration is managed in get_api_key.py module.
"""

import os
from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings

# Import provider config from get_api_key module
from app.get_api_key import (
    get_api_key,
    get_provider_for_model,
    get_default_model,
    get_configured_providers,
    get_providers,
)

# Re-export PROVIDERS for backward compatibility
PROVIDERS = get_providers()


class Settings(BaseSettings):
    """
    Application settings loaded from system environment variables.
    """

    # Application Configuration
    APP_NAME: str = "App AI SDK Chat API"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.environ.get("ENVIRONMENT", os.environ.get("NODE_ENV", "development"))
    PORT: int = int(os.environ.get("PORT", "8080"))
    HOST: str = os.environ.get("HOST", "0.0.0.0")
    DEBUG: bool = ENVIRONMENT == "development"

    # API Configuration
    API_PREFIX: str = "/api"
    CORS_ORIGINS: list = ["*"]

    # AI Configuration - default to Gemini
    DEFAULT_CHAT_MODEL: str = os.environ.get(
        "APP_AI_INIT_CONFIG_DEFAULT_CHAT_MODEL", "gemini-2.0-flash-lite"
    )

    # API Keys (loaded from environment)
    GEMINI_API_KEY: Optional[str] = os.environ.get("GEMINI_API_KEY")
    OPENAI_API_KEY: Optional[str] = os.environ.get("OPENAI_API_KEY")

    class Config:
        case_sensitive = True
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
