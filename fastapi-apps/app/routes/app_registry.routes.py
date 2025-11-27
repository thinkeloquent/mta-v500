"""App Registry API - Serves application metadata from app-registry.json."""

import json
from pathlib import Path
from typing import Dict, List
from pydantic import BaseModel, Field

from fastapi import APIRouter, HTTPException


router = APIRouter(prefix="/api/registry", tags=["registry"])


class AppMetadata(BaseModel):
    """Metadata for a single application."""

    name: str = Field(..., description="App identifier", example="ask-ai")
    displayName: str = Field(..., description="Human-readable app name", example="Ask AI")
    description: str = Field(..., description="App description", example="AI chat application")
    port: int = Field(..., description="App port number", example=3001)
    type: str = Field(..., description="App type", example="fastapi")
    hasBackend: bool = Field(..., description="Whether app has backend API")
    hasFrontend: bool = Field(..., description="Whether app has frontend UI")
    routes: List[str] = Field(..., description="App route paths", example=["/ask-ai"])
    database: bool = Field(False, description="Whether app uses database")


class AppRegistryResponse(BaseModel):
    """Response containing all registered applications."""

    version: str = Field(..., description="Registry version", example="5.0.0")
    apps: Dict[str, AppMetadata] = Field(..., description="Dictionary of app metadata keyed by app name")


def load_app_registry() -> dict:
    """Load app registry from JSON file."""
    registry_path = Path(__file__).parent.parent.parent / "common" / "config" / "app-registry.json"

    if not registry_path.exists():
        raise HTTPException(
            status_code=500,
            detail=f"App registry not found at {registry_path}"
        )

    try:
        with open(registry_path, 'r') as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse app registry: {str(e)}"
        )


@router.get(
    "/apps",
    response_model=AppRegistryResponse,
    summary="Get all registered applications",
    description="""
    Returns metadata for all registered applications in the monorepo.

    This endpoint reads from the central app-registry.json configuration file
    and provides information about each app including:
    - Display name and description
    - Port configuration
    - Backend/frontend availability
    - Route paths
    - Database requirements

    Use this endpoint to dynamically discover available applications and
    build navigation menus or app launchers.
    """
)
async def get_apps():
    """Get list of all registered applications with their metadata."""
    registry = load_app_registry()
    return registry


@router.get(
    "/apps/{app_name}",
    response_model=AppMetadata,
    summary="Get metadata for a specific application",
    description="""
    Returns metadata for a single application by name.

    **Parameters:**
    - `app_name`: The app identifier (e.g., "ask-ai", "persona-editor")

    **Returns:**
    - Complete metadata for the specified application

    **Errors:**
    - 404: Application not found in registry
    """
)
async def get_app(app_name: str):
    """Get metadata for a specific application."""
    registry = load_app_registry()

    if app_name not in registry.get("apps", {}):
        raise HTTPException(
            status_code=404,
            detail=f"Application '{app_name}' not found in registry"
        )

    return registry["apps"][app_name]
