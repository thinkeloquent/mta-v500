"""Debug routes for Vault/Environment secrets."""

import os
from pathlib import Path
from typing import Dict, Optional, List
from pydantic import BaseModel, Field

from fastapi import APIRouter, Depends, HTTPException

from auth import verify_debug_credentials, is_debug_auth_enabled


router = APIRouter(prefix="/debug/vault", tags=["debug"])

# Log debug endpoint status at module load time
if is_debug_auth_enabled():
    print("🔧 Debug endpoints ENABLED (DEBUG_AUTH credentials configured)")
else:
    print("🔧 Debug endpoints DISABLED (Set DEBUG_AUTH_USERNAME and DEBUG_AUTH_PASSWORD to enable)")


class VaultInfoResponse(BaseModel):
    """Response for vault configuration information."""

    environment: str
    env_file_checked: List[str]
    env_file_loaded: Optional[str] = None
    env_file_exists: bool
    working_directory: str


class SecretKeyInfo(BaseModel):
    """Information about a secret key."""

    key: str
    value_preview: str = Field(..., description="First and last 2 chars of value, rest masked")
    length: int
    in_environ: bool


class VaultSecretsResponse(BaseModel):
    """Response for vault secrets."""

    total_keys: int
    env_file: Optional[str] = None
    keys: List[SecretKeyInfo]


class GlobalEnvResponse(BaseModel):
    """Response for global environment variables."""

    total_keys: int
    keys: List[SecretKeyInfo]


def mask_value(value: str) -> str:
    """Mask a secret value, showing only first and last 2 characters."""
    if not value:
        return "***EMPTY***"
    if len(value) <= 4:
        return "***"
    return f"{value[:2]}***{value[-2:]}"


@router.get(
    "/vault-info",
    response_model=VaultInfoResponse,
    summary="Get vault configuration information",
    description="""
    Returns information about the vault/environment configuration.

    Shows which .env files were checked, which one was loaded, and the current environment.

    **Security:**
    This endpoint requires Basic Authentication with DEBUG_AUTH credentials.
    Returns 503 if credentials are not configured.
    """,
)
async def get_vault_info(
    _: bool = Depends(verify_debug_credentials),
) -> VaultInfoResponse:
    """Get vault configuration information."""

    # Detect environment
    env = (
        os.environ.get("NODE_ENV")
        or os.environ.get("PYTHON_ENV")
        or os.environ.get("ENVIRONMENT")
        or "development"
    )

    # Check env file locations
    env_files_to_check = [
        os.environ.get("ENV_SECRET_FILE", "/etc/secrets/MTA_DEV"),
        str(Path.cwd() / ".env"),
    ]

    # Find which one exists
    loaded_file = None
    file_exists = False
    for env_file in env_files_to_check:
        env_file_path = Path(env_file)
        if env_file_path.exists():
            loaded_file = str(env_file_path)
            file_exists = True
            break

    return VaultInfoResponse(
        environment=env,
        env_file_checked=env_files_to_check,
        env_file_loaded=loaded_file,
        env_file_exists=file_exists,
        working_directory=os.getcwd(),
    )


@router.get(
    "/vault-secrets",
    response_model=VaultSecretsResponse,
    summary="Get vault secrets information",
    description="""
    Returns information about secrets loaded from vault/environment files.

    Shows all keys from the .env file with masked values (only first and last 2 chars visible).
    Also indicates whether each key is present in os.environ.

    Uses `dotenv_values()` to read the file without modifying the environment.

    **Security:**
    This endpoint requires Basic Authentication with DEBUG_AUTH credentials.
    Returns 503 if credentials are not configured.
    All values are masked for security.
    """,
)
async def get_vault_secrets(
    _: bool = Depends(verify_debug_credentials),
) -> VaultSecretsResponse:
    """Get vault secrets information with masked values."""

    from dotenv import dotenv_values

    # Find the env file
    env_files_to_try = [
        os.environ.get("ENV_SECRET_FILE", "/etc/secrets/MTA_DEV"),
        Path.cwd() / ".env",
    ]

    loaded_file = None
    values = {}

    for env_file in env_files_to_try:
        env_file_path = Path(env_file)
        if env_file_path.exists():
            loaded_file = str(env_file_path)
            # Use dotenv_values to read without modifying os.environ
            values = dotenv_values(dotenv_path=env_file_path)
            break

    if not values:
        raise HTTPException(
            status_code=404,
            detail="No .env file found. Checked: " + ", ".join(str(f) for f in env_files_to_try)
        )

    # Create masked key information
    keys_info = []
    for key, value in values.items():
        if value is None:
            value = ""

        keys_info.append(
            SecretKeyInfo(
                key=key,
                value_preview=mask_value(str(value)),
                length=len(str(value)),
                in_environ=(key in os.environ),
            )
        )

    # Sort by key name
    keys_info.sort(key=lambda x: x.key)

    return VaultSecretsResponse(
        total_keys=len(keys_info),
        env_file=loaded_file,
        keys=keys_info,
    )


@router.get(
    "/global",
    response_model=GlobalEnvResponse,
    summary="Get all global environment variables",
    description="""
    Returns all environment variables from os.environ with masked values.

    Shows all keys currently set in the global environment (os.environ) with masked values
    (only first and last 2 chars visible).

    This endpoint shows what's actually loaded in the runtime environment, regardless of
    whether it came from .env files, system environment, or other sources.

    **Security:**
    This endpoint requires Basic Authentication with DEBUG_AUTH credentials.
    Returns 503 if credentials are not configured.
    All values are masked for security.
    """,
)
async def get_global_env(
    _: bool = Depends(verify_debug_credentials),
) -> GlobalEnvResponse:
    """Get all global environment variables with masked values."""

    # Create masked key information from os.environ
    keys_info = []
    for key, value in os.environ.items():
        keys_info.append(
            SecretKeyInfo(
                key=key,
                value_preview=mask_value(str(value)),
                length=len(str(value)),
                in_environ=True,  # Always True since we're reading from os.environ
            )
        )

    # Sort by key name
    keys_info.sort(key=lambda x: x.key)

    return GlobalEnvResponse(
        total_keys=len(keys_info),
        keys=keys_info,
    )
