"""
Environment configuration with defaults.

This module provides default environment variable values and utilities
for configuration management across the application.
"""

import os
from typing import Optional


def get_env(key: str, default: Optional[str] = None) -> Optional[str]:
    """
    Get environment variable with a default fallback.

    Args:
        key: Environment variable name
        default: Default value if not set

    Returns:
        Environment variable value or default
    """
    return os.environ.get(key, default)


# ============================================================================
# Application Configuration
# ============================================================================

# Build and deployment
BUILD_ID = get_env("BUILD_ID", "dev")
MTA_ENV = get_env("MTA_ENV")  # Controls static file mounting

# Server configuration
HOST = get_env("HOST", "0.0.0.0")
PORT = int(get_env("PORT", "8080"))

# CORS configuration
CORS_ALLOW_ORIGINS = get_env("CORS_ALLOW_ORIGINS")  # Comma-delimited list

# ============================================================================
# Database Configuration
# ============================================================================

POSTGRES_USER = get_env("POSTGRES_USER")
POSTGRES_PASSWORD = get_env("POSTGRES_PASSWORD")
POSTGRES_DB = get_env("POSTGRES_DB")
POSTGRES_HOST = get_env("POSTGRES_HOST", "localhost")
POSTGRES_PORT = get_env("POSTGRES_PORT", "5432")
POSTGRES_SCHEMA = get_env("POSTGRES_SCHEMA", "public")

# ============================================================================
# Secrets and Security
# ============================================================================

FIGMA_TOKEN = get_env("FIGMA_TOKEN")

# ============================================================================
# API URLs
# ============================================================================

VITE_API_URL = get_env("VITE_API_URL", "http://localhost:8080")


# ============================================================================
# Helper Functions
# ============================================================================

def get_postgres_connection_string() -> str:
    """
    Build PostgreSQL connection string from environment variables.

    Returns:
        PostgreSQL connection URL

    Raises:
        ValueError: If required environment variables are missing
    """
    if not all([POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB]):
        raise ValueError(
            "Missing required PostgreSQL environment variables: "
            "POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB"
        )

    return (
        f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}"
        f"@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
        f"?schema={POSTGRES_SCHEMA}"
    )


def is_production() -> bool:
    """Check if running in production environment."""
    return MTA_ENV is not None and MTA_ENV.lower() in ("production", "prod")


def is_development() -> bool:
    """Check if running in development environment."""
    return not is_production()


# ============================================================================
# Configuration Summary
# ============================================================================

def print_config_summary():
    """Print a summary of current configuration (with secrets redacted)."""
    print("\n" + "="*60)
    print("Configuration Summary")
    print("="*60)
    print(f"BUILD_ID: {BUILD_ID}")
    print(f"MTA_ENV: {MTA_ENV or '(not set)'}")
    print(f"HOST: {HOST}")
    print(f"PORT: {PORT}")
    print(f"CORS_ALLOW_ORIGINS: {CORS_ALLOW_ORIGINS or '(allow all)'}")
    print(f"FIGMA_TOKEN: {'***SET***' if FIGMA_TOKEN else '(not set)'}")
    print(f"POSTGRES_HOST: {POSTGRES_HOST}")
    print(f"POSTGRES_PORT: {POSTGRES_PORT}")
    print(f"POSTGRES_DB: {POSTGRES_DB or '(not set)'}")
    print("="*60 + "\n")


__all__ = [
    "get_env",
    "BUILD_ID",
    "MTA_ENV",
    "HOST",
    "PORT",
    "CORS_ALLOW_ORIGINS",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "POSTGRES_DB",
    "POSTGRES_HOST",
    "POSTGRES_PORT",
    "POSTGRES_SCHEMA",
    "FIGMA_TOKEN",
    "VITE_API_URL",
    "get_postgres_connection_string",
    "is_production",
    "is_development",
    "print_config_summary",
]
