"""
Application settings and configuration management using Pydantic.
"""
from typing import List
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    """

    # AWS Configuration
    aws_s3_access_key: str | None = Field(default=None, description="AWS S3 Access Key ID")
    aws_s3_secret_key: str | None = Field(default=None, description="AWS S3 Secret Access Key")
    aws_region: str = Field(default="us-east-1", description="AWS Region")
    aws_account_id: str = Field(default="", description="AWS Account ID for S3 Control operations")

    # Server Configuration
    port: int = Field(default=3001, ge=1, le=65535, description="Server port")
    host: str = Field(default="0.0.0.0", description="Server host")
    node_env: str = Field(default="development", description="Environment (development/production)")

    # CORS Configuration
    cors_origin: str = Field(
        default="*", description="Allowed CORS origin for frontend"
    )
    cors_allow_credentials: bool = Field(default=True, description="Allow credentials in CORS")

    # File Upload Configuration
    max_file_size: int = Field(
        default=104857600, description="Maximum file upload size in bytes (100MB)"
    )
    allowed_file_types: str = Field(
        default="image/*,application/pdf,text/*,video/*,audio/*,application/zip",
        description="Comma-separated list of allowed MIME type patterns",
    )

    # Presigned URL Configuration
    presigned_url_expiry: int = Field(
        default=3600, ge=60, le=604800, description="Presigned URL expiry in seconds (1 hour)"
    )

    # Rate Limiting
    rate_limit_per_minute: int = Field(
        default=500, ge=1, description="Rate limit per minute per IP"
    )

    # Logging
    log_level: str = Field(default="INFO", description="Logging level")
    log_format: str = Field(default="json", description="Log format (json/text)")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("node_env")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        """Validate environment value."""
        allowed = ["development", "production", "test"]
        if v.lower() not in allowed:
            raise ValueError(f"node_env must be one of {allowed}")
        return v.lower()

    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        """Validate log level."""
        allowed = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in allowed:
            raise ValueError(f"log_level must be one of {allowed}")
        return v.upper()

    @field_validator("log_format")
    @classmethod
    def validate_log_format(cls, v: str) -> str:
        """Validate log format."""
        allowed = ["json", "text"]
        if v.lower() not in allowed:
            raise ValueError(f"log_format must be one of {allowed}")
        return v.lower()

    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.node_env == "production"

    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.node_env == "development"

    @property
    def allowed_file_types_list(self) -> List[str]:
        """Get allowed file types as a list."""
        return [ft.strip() for ft in self.allowed_file_types.split(",")]

    @property
    def cors_origins(self) -> List[str]:
        """Get CORS origins as a list (supports comma-separated values)."""
        return [origin.strip() for origin in self.cors_origin.split(",")]


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """
    Dependency function to get settings instance.
    Useful for FastAPI dependency injection.
    """
    return settings
