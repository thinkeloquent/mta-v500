"""
Application configuration and AWS client setup.
"""
import logging
from typing import List, Literal
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError, NoCredentialsError
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


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


class AWSClients:
    """
    AWS client manager for S3 and S3 Control operations.
    """

    def __init__(self) -> None:
        """Initialize AWS clients with credentials from settings."""
        self._s3_client = None
        self._s3_control_client = None
        self._initialize_clients()

    def _initialize_clients(self) -> None:
        """Initialize S3 and S3 Control clients."""
        try:
            # Configure boto3 with explicit credentials
            session = boto3.Session(
                aws_access_key_id=settings.aws_s3_access_key,
                aws_secret_access_key=settings.aws_s3_secret_key,
                region_name=settings.aws_region,
            )

            # S3 Client configuration
            s3_config = Config(
                signature_version="s3v4",
                retries={"max_attempts": 3, "mode": "standard"},
            )

            self._s3_client = session.client("s3", config=s3_config)
            self._s3_control_client = session.client("s3control")

            logger.info(f"AWS clients initialized successfully for region: {settings.aws_region}")

        except NoCredentialsError as e:
            logger.error("AWS credentials not found")
            raise ValueError(
                "AWS credentials not configured. Please set AWS_S3_ACCESS_KEY "
                "and AWS_S3_SECRET_KEY environment variables."
            ) from e
        except Exception as e:
            logger.error(f"Failed to initialize AWS clients: {e}")
            raise

    @property
    def s3(self):
        """Get S3 client instance."""
        if self._s3_client is None:
            self._initialize_clients()
        return self._s3_client

    @property
    def s3_control(self):
        """Get S3 Control client instance."""
        if self._s3_control_client is None:
            self._initialize_clients()
        return self._s3_control_client

    def validate_credentials(self) -> bool:
        """
        Validate AWS credentials by making a test call.

        Returns:
            bool: True if credentials are valid

        Raises:
            ValueError: If credentials are invalid
        """
        try:
            # Simple call to verify credentials
            self.s3.list_buckets()
            logger.info("AWS credentials validated successfully")
            return True
        except NoCredentialsError as e:
            raise ValueError("No AWS credentials found") from e
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            if error_code in ["InvalidAccessKeyId", "SignatureDoesNotMatch"]:
                raise ValueError("Invalid AWS credentials") from e
            raise ValueError(f"AWS credential validation failed: {error_code}") from e
        except Exception as e:
            raise ValueError(f"Unexpected error during credential validation: {e}") from e

    def generate_presigned_url(
        self,
        bucket: str,
        key: str,
        operation: Literal["get_object", "put_object"] = "get_object",
        expiration: int | None = None,
    ) -> str:
        """
        Generate a presigned URL for S3 object operations.

        Args:
            bucket: S3 bucket name
            key: S3 object key
            operation: Operation type ('get_object' or 'put_object')
            expiration: URL expiration time in seconds (default from settings)

        Returns:
            str: Presigned URL

        Raises:
            ValueError: If URL generation fails
        """
        if expiration is None:
            expiration = settings.presigned_url_expiry

        try:
            url = self.s3.generate_presigned_url(
                ClientMethod=operation,
                Params={"Bucket": bucket, "Key": key},
                ExpiresIn=expiration,
            )
            logger.debug(
                f"Generated presigned URL for {operation} operation: "
                f"bucket={bucket}, key={key}, expiration={expiration}s"
            )
            return url
        except ClientError as e:
            error_msg = f"Failed to generate presigned URL: {e}"
            logger.error(error_msg)
            raise ValueError(error_msg) from e


# Global instances
settings = Settings()
aws_clients = AWSClients()


# Dependency functions for FastAPI
def get_settings() -> Settings:
    """Get settings instance for dependency injection."""
    return settings


def get_s3_client():
    """Get S3 client for dependency injection."""
    return aws_clients.s3


def get_s3_control_client():
    """Get S3 Control client for dependency injection."""
    return aws_clients.s3_control


def get_aws_clients() -> AWSClients:
    """Get AWS clients instance for dependency injection."""
    return aws_clients


def validate_aws_credentials() -> bool:
    """Validate AWS credentials on application startup."""
    return aws_clients.validate_credentials()
