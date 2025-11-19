"""
AWS S3 client configuration and utilities.
"""
import logging
from typing import Literal
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError, NoCredentialsError
from .settings import settings

logger = logging.getLogger(__name__)


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


# Global AWS clients instance
aws_clients = AWSClients()


def get_s3_client():
    """
    Dependency function to get S3 client.
    Useful for FastAPI dependency injection.
    """
    return aws_clients.s3


def get_s3_control_client():
    """
    Dependency function to get S3 Control client.
    Useful for FastAPI dependency injection.
    """
    return aws_clients.s3_control


def get_aws_clients() -> AWSClients:
    """
    Dependency function to get AWS clients instance.
    Useful for FastAPI dependency injection.
    """
    return aws_clients


def validate_aws_credentials() -> bool:
    """
    Validate AWS credentials on application startup.

    Returns:
        bool: True if credentials are valid

    Raises:
        ValueError: If credentials are invalid
    """
    return aws_clients.validate_credentials()
