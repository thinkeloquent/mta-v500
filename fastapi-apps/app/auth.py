"""Basic authentication for debug/sensitive endpoints."""

import os
import secrets
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

# Initialize HTTP Basic security
security = HTTPBasic()


def is_debug_auth_enabled() -> bool:
    """
    Check if debug authentication credentials are configured.

    Returns:
        True if both DEBUG_AUTH_USERNAME and DEBUG_AUTH_PASSWORD are set
    """
    return bool(
        os.environ.get("DEBUG_AUTH_USERNAME") and
        os.environ.get("DEBUG_AUTH_PASSWORD")
    )


def is_docs_auth_enabled() -> bool:
    """
    Check if docs authentication credentials are configured.

    Returns:
        True if both DOCS_AUTH_USERNAME and DOCS_AUTH_PASSWORD are set
    """
    return bool(
        os.environ.get("DOCS_AUTH_USERNAME") and
        os.environ.get("DOCS_AUTH_PASSWORD")
    )


def verify_debug_credentials(
    credentials: HTTPBasicCredentials = Depends(security),
) -> bool:
    """
    Verify basic auth credentials for debug endpoints.

    Reads credentials from environment variables:
    - DEBUG_AUTH_USERNAME: Username for basic auth (required)
    - DEBUG_AUTH_PASSWORD: Password for basic auth (required)

    Args:
        credentials: HTTP Basic credentials from request

    Returns:
        True if authentication is successful

    Raises:
        HTTPException: If authentication fails (401) or credentials not configured (503)
    """
    # Get expected credentials from environment
    expected_username = os.environ.get("DEBUG_AUTH_USERNAME")
    expected_password = os.environ.get("DEBUG_AUTH_PASSWORD")

    # If credentials are not configured, return 503 Service Unavailable
    if not expected_username or not expected_password:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Debug endpoints are disabled. Set DEBUG_AUTH_USERNAME and DEBUG_AUTH_PASSWORD environment variables to enable.",
        )

    # Use constant-time comparison to prevent timing attacks
    username_correct = secrets.compare_digest(
        credentials.username.encode("utf8"),
        expected_username.encode("utf8")
    )
    password_correct = secrets.compare_digest(
        credentials.password.encode("utf8"),
        expected_password.encode("utf8")
    )

    if not (username_correct and password_correct):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )

    return True


def verify_docs_credentials(
    credentials: HTTPBasicCredentials = Depends(security),
) -> bool:
    """
    Verify basic auth credentials for documentation endpoints (/docs, /redoc, /openapi.json).

    Reads credentials from environment variables:
    - DOCS_AUTH_USERNAME: Username for basic auth (required)
    - DOCS_AUTH_PASSWORD: Password for basic auth (required)

    Args:
        credentials: HTTP Basic credentials from request

    Returns:
        True if authentication is successful

    Raises:
        HTTPException: If authentication fails (401) or credentials not configured (503)
    """
    # Get expected credentials from environment
    expected_username = os.environ.get("DOCS_AUTH_USERNAME")
    expected_password = os.environ.get("DOCS_AUTH_PASSWORD")

    # If credentials are not configured, return 503 Service Unavailable
    if not expected_username or not expected_password:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Documentation endpoints are disabled. Set DOCS_AUTH_USERNAME and DOCS_AUTH_PASSWORD environment variables to enable.",
        )

    # Use constant-time comparison to prevent timing attacks
    username_correct = secrets.compare_digest(
        credentials.username.encode("utf8"),
        expected_username.encode("utf8")
    )
    password_correct = secrets.compare_digest(
        credentials.password.encode("utf8"),
        expected_password.encode("utf8")
    )

    if not (username_correct and password_correct):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )

    return True


def verify_construction_credentials(credentials: HTTPBasicCredentials, construction_key: str) -> bool:
    """
    Verify basic auth credentials for under construction mode.

    Both username and password must match the UNDER_CONSTRUCTION_KEY value.

    Args:
        credentials: HTTP Basic credentials from request
        construction_key: Expected value for both username and password

    Returns:
        True if both username and password match the construction_key
    """
    # Use constant-time comparison to prevent timing attacks
    username_correct = secrets.compare_digest(
        credentials.username.encode("utf8"),
        construction_key.encode("utf8")
    )
    password_correct = secrets.compare_digest(
        credentials.password.encode("utf8"),
        construction_key.encode("utf8")
    )

    return username_correct and password_correct
