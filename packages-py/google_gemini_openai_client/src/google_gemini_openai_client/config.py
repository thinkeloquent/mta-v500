"""
google_gemini_openai_client - Configuration

Centralized configuration constants and environment variable handling.
"""

from __future__ import annotations

import os

# =============================================================================
# API Configuration
# =============================================================================

DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai"
DEFAULT_MODEL = "gemini-2.0-flash"

# =============================================================================
# Client Configuration
# =============================================================================

DEFAULT_TIMEOUT = 60.0  # seconds
DEFAULT_KEEP_ALIVE_TIMEOUT = 5.0  # seconds
DEFAULT_MAX_CONNECTIONS = 10

# =============================================================================
# Display Configuration
# =============================================================================

SEPARATOR = "=" * 60
THIN_SEPARATOR = "-" * 60

# =============================================================================
# Environment Variables
# =============================================================================

ENV_API_KEY = "GEMINI_API_KEY"


def get_api_key(api_key: str | None = None) -> str | None:
    """
    Resolve API key from argument or GEMINI_API_KEY environment variable.

    Args:
        api_key: Optional explicit API key (takes precedence)

    Returns:
        Resolved API key or None if not found
    """
    return api_key or os.environ.get(ENV_API_KEY)
