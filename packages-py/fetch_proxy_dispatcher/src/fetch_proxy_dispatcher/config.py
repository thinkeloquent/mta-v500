"""
Environment detection and proxy URL mapping.

Reads APP_ENV environment variable to determine the current environment
and maps to appropriate proxy URLs.
"""
import os
from typing import Literal, Optional

# Type alias for valid environments
AppEnv = Literal["DEV", "STAGE", "QA", "PROD"]


class Environment:
    """Environment constants."""
    DEV: Literal["DEV"] = "DEV"
    STAGE: Literal["STAGE"] = "STAGE"
    QA: Literal["QA"] = "QA"
    PROD: Literal["PROD"] = "PROD"


# All valid environment values
ENVIRONMENTS: list[AppEnv] = [
    Environment.DEV,
    Environment.STAGE,
    Environment.QA,
    Environment.PROD,
]


def get_app_env() -> AppEnv:
    """
    Get the current application environment.

    Reads APP_ENV, normalizes to uppercase, defaults to 'DEV'.
    """
    raw = os.environ.get("APP_ENV", "").upper()
    if raw in ENVIRONMENTS:
        return raw  # type: ignore
    return Environment.DEV


def is_dev() -> bool:
    """Check if current environment is development."""
    return get_app_env() == Environment.DEV


def is_prod() -> bool:
    """Check if current environment is production."""
    return get_app_env() == Environment.PROD


def get_proxy_url() -> Optional[str]:
    """
    Get the proxy URL for the current environment.

    Reads PROXY_DEV_URL, PROXY_STAGE_URL, PROXY_QA_URL, or PROXY_PROD_URL.
    """
    env = get_app_env()
    return os.environ.get(f"PROXY_{env}_URL")


def get_agent_proxy_url() -> Optional[str]:
    """
    Get agent proxy URL (HTTP_PROXY or HTTPS_PROXY override).

    HTTPS_PROXY takes precedence over HTTP_PROXY.
    """
    return os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY")


def get_effective_proxy_url() -> Optional[str]:
    """
    Determine the effective proxy URL to use.

    Priority: Agent proxy > Environment-specific proxy
    """
    return get_agent_proxy_url() or get_proxy_url()


def is_proxy_configured() -> bool:
    """Check if any proxy is configured."""
    return get_effective_proxy_url() is not None
