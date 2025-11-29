"""
Pydantic Response Models for FastAPI Orchestrator.

Extracted from main.py to support the launch/server pattern.
These models define the OpenAPI schema for orchestrator endpoints.
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


# =============================================================================
# System Response Models
# =============================================================================

class RootResponse(BaseModel):
    """Response model for the root endpoint."""
    status: str = Field(..., description="Welcome message", example="Multi-App Orchestrator")
    message: str = Field(..., description="Welcome message", example="Multi-App Orchestrator")
    BUILD_COMMIT: str = Field(..., description="Welcome message", example="Multi-App Orchestrator")
    BUILD_DATE: str = Field(..., description="Welcome message", example="Multi-App Orchestrator")
    BUILD_ID: str = Field(..., description="Welcome message", example="Multi-App Orchestrator")
    BUILD_VERSION: str = Field(..., description="Welcome message", example="Multi-App Orchestrator")
    id: str = Field(..., description="Build ID from environment variable", example="v1.0.0//prod//2024-01-01")
    build: List[str] = Field(..., description="Build ID parts split by '//'", example=["v1.0.0", "prod", "2024-01-01"])


class SubAppInfo(BaseModel):
    """Information about a mounted sub-application."""
    name: str = Field(..., description="Sub-app name", example="hello")
    path: str = Field(..., description="Mount path for the sub-app", example="/hello")
    docs: str = Field(..., description="Documentation URL for the sub-app", example="/hello/docs")
    health: str = Field(..., description="Health check URL for the sub-app", example="/hello/health")


class AppsMetadataResponse(BaseModel):
    """Response model for apps metadata endpoint."""
    message: str = Field(..., description="Service name", example="Multi-App Orchestrator")
    docs: str = Field(..., description="Main documentation URL", example="/docs")
    health: str = Field(..., description="Main health check URL", example="/health")
    sub_apps: List[SubAppInfo] = Field(..., description="List of mounted sub-applications")


# =============================================================================
# Health Response Models
# =============================================================================

class HealthResponse(BaseModel):
    """Response model for health check endpoint."""
    status: str = Field(..., description="Health status", example="healthy")
    service: str = Field(..., description="Service name", example="orchestrator")
    sub_apps: Dict[str, str] = Field(..., description="Status of mounted sub-apps", example={"hello": "mounted"})


# =============================================================================
# Configuration/Secrets Response Models
# =============================================================================

class ConfigSuccessResponse(BaseModel):
    """Successful response when vault secrets are configured."""
    class Config:
        extra = "allow"

    def __init__(self, **data):
        super().__init__(**data)


class ConfigErrorResponse(BaseModel):
    """Error response when vault secrets are not configured."""
    message: str = Field(..., description="Error message", example="Vault secrets not configured")
    hint: str = Field(..., description="Helpful hint for resolution", example="Set VAULT_SECRET_FILE environment variable to load secrets")


class SecretsSuccessResponse(BaseModel):
    """Successful response with secrets metadata."""
    properties_count: int = Field(..., description="Number of properties loaded", example=10)
    files_count: int = Field(..., description="Number of files loaded", example=2)


class SecretsErrorResponse(BaseModel):
    """Error response when vault secrets are not configured."""
    message: str = Field(..., description="Error message", example="Vault secrets not configured")
    hint: str = Field(..., description="Helpful hint for resolution", example="Set VAULT_SECRET_FILE environment variable to load secrets")


class ParsingErrorModel(BaseModel):
    """Represents a parsing error."""
    key: Optional[str] = Field(None, description="The key that caused the error (if applicable)")
    message: str = Field(..., description="The error message")
    error_type: str = Field(..., description="The type of error", example="Base64DecodingError")


class CombinedSecretsResponse(BaseModel):
    """Combined response with redacted config properties and metadata."""
    properties: Dict[str, str] = Field(..., description="Configuration properties with redacted values", example={"API_KEY": "sk***45", "DATABASE_URL": "po***db"})
    properties_count: int = Field(..., description="Number of properties loaded", example=10)
    files: Dict[str, str] = Field(..., description="File names with redacted content indicators", example={"cert.pem": "***FILE CONTENT REDACTED***", "key.pem": "***FILE CONTENT REDACTED***"})
    files_count: int = Field(..., description="Number of files loaded", example=2)
    errors: List[ParsingErrorModel] = Field(default_factory=list, description="Parsing errors encountered during secret loading")
