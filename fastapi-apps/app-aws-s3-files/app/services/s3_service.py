"""
S3 Service layer for bucket and file operations.

This service provides defensive programming patterns and extensive logging
for all S3 operations including:
- Comprehensive null/None checks
- Input validation at every layer
- Detailed operation logging with timing
- Structured error handling with custom exceptions
"""
import logging
import time
from typing import Any, Dict, List, Literal, Optional
from io import BytesIO
from botocore.exceptions import ClientError
from ..config import get_aws_clients, settings
from ..exceptions import (
    S3ServiceError,
    BucketNotFoundError,
    BucketNotEmptyError,
    BucketHasAccessPointsError,
    FileNotFoundError,
    ValidationError,
    S3AccessDeniedError,
)

logger = logging.getLogger(__name__)


class S3Service:
    """Service class for AWS S3 operations."""

    def __init__(self) -> None:
        """Initialize S3Service with AWS clients."""
        self.aws_clients = get_aws_clients()
        self.s3_client = self.aws_clients.s3
        self.s3_control_client = self.aws_clients.s3_control

    # ============================================
    # Bucket Operations
    # ============================================

    async def list_available_buckets(self) -> List[Dict[str, Any]]:
        """
        List all S3 buckets with minimal metadata (fast, lightweight call).
        This is optimized for quick initial loading - just names and creation dates.

        Returns:
            List of buckets with basic info (name, creation_date only)

        Raises:
            S3AccessDeniedError: If access to list buckets is denied
            S3ServiceError: If listing buckets fails for other reasons
        """
        start_time = time.time()
        logger.info("Starting list_available_buckets operation (lightweight)")

        try:
            # Defensive: Validate client is available
            if not self.s3_client:
                raise S3ServiceError("S3 client not initialized")

            # Call S3 API
            response = self.s3_client.list_buckets()

            # Defensive: Validate response structure
            if not response or not isinstance(response, dict):
                raise S3ServiceError("Invalid response from S3 list_buckets API")

            buckets = response.get("Buckets")

            # Defensive: Ensure buckets is a list
            if buckets is None:
                logger.warning("No 'Buckets' key in response, defaulting to empty list")
                buckets = []
            elif not isinstance(buckets, list):
                logger.error(f"Unexpected buckets type: {type(buckets)}")
                buckets = []

            logger.info(f"Found {len(buckets)} bucket(s) in account")

            available_buckets = []

            for idx, bucket in enumerate(buckets):
                # Defensive: Validate bucket structure
                if not bucket or not isinstance(bucket, dict):
                    logger.warning(f"Skipping invalid bucket at index {idx}: {bucket}")
                    continue

                bucket_name = bucket.get("Name")
                if not bucket_name:
                    logger.warning(f"Bucket at index {idx} has no name, skipping")
                    continue

                creation_date = bucket.get("CreationDate")

                # Return minimal info - just name and creation date
                available_buckets.append({
                    "name": bucket_name,
                    "creationDate": creation_date.isoformat() if creation_date else None,
                })

            duration_ms = (time.time() - start_time) * 1000
            logger.info(
                f"Completed list_available_buckets: {len(available_buckets)} buckets, "
                f"duration: {duration_ms:.2f}ms"
            )

            # Log bucket names for debugging
            bucket_names = [b["name"] for b in available_buckets]
            logger.info(f"Available buckets: {bucket_names}")

            return available_buckets

        except ClientError as e:
            duration_ms = (time.time() - start_time) * 1000
            error_code = e.response.get("Error", {}).get("Code") if e.response else "Unknown"

            logger.error(
                f"Failed to list available buckets: {error_code} - {e}, duration: {duration_ms:.2f}ms",
                exc_info=True
            )

            if error_code == "AccessDenied":
                raise S3AccessDeniedError(
                    resource="S3 buckets",
                    operation="ListBuckets"
                ) from e

            raise S3ServiceError(f"Failed to list available buckets: {error_code}") from e

        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            logger.error(
                f"Unexpected error in list_available_buckets, duration: {duration_ms:.2f}ms",
                exc_info=True
            )
            raise S3ServiceError(f"Failed to list available buckets: {str(e)}") from e

    async def list_buckets(self) -> List[Dict[str, Any]]:
        """
        List all S3 buckets with additional metadata.

        Returns:
            List of buckets with details (name, creation_date, region, object_count)

        Raises:
            S3AccessDeniedError: If access to list buckets is denied
            S3ServiceError: If listing buckets fails for other reasons
        """
        start_time = time.time()
        logger.info("Starting list_buckets operation")

        try:
            # Defensive: Validate client is available
            if not self.s3_client:
                raise S3ServiceError("S3 client not initialized")

            # Call S3 API
            response = self.s3_client.list_buckets()

            # Defensive: Validate response structure
            if not response or not isinstance(response, dict):
                raise S3ServiceError("Invalid response from S3 list_buckets API")

            buckets = response.get("Buckets")

            # Defensive: Ensure buckets is a list
            if buckets is None:
                logger.warning("No 'Buckets' key in response, defaulting to empty list")
                buckets = []
            elif not isinstance(buckets, list):
                logger.error(f"Unexpected buckets type: {type(buckets)}")
                buckets = []

            logger.info(f"Found {len(buckets)} bucket(s) in account")

            buckets_with_details = []
            failed_buckets = []

            for idx, bucket in enumerate(buckets):
                # Defensive: Validate bucket structure
                if not bucket or not isinstance(bucket, dict):
                    logger.warning(f"Skipping invalid bucket at index {idx}: {bucket}")
                    continue

                bucket_name = bucket.get("Name")
                if not bucket_name:
                    logger.warning(f"Bucket at index {idx} has no name, skipping")
                    continue

                creation_date = bucket.get("CreationDate")

                try:
                    logger.debug(f"Fetching details for bucket: {bucket_name}")

                    # Get bucket location with defensive checks
                    location_response = self.s3_client.get_bucket_location(Bucket=bucket_name)
                    if not location_response or not isinstance(location_response, dict):
                        logger.warning(f"Invalid location response for {bucket_name}")
                        region = "unknown"
                    else:
                        region = location_response.get("LocationConstraint") or "us-east-1"

                    # Get bucket object count (quick check)
                    objects_response = self.s3_client.list_objects_v2(
                        Bucket=bucket_name, MaxKeys=1
                    )

                    # Defensive: Validate objects response
                    if not objects_response or not isinstance(objects_response, dict):
                        logger.warning(f"Invalid objects response for {bucket_name}")
                        object_count = 0
                        has_objects = False
                    else:
                        object_count = objects_response.get("KeyCount", 0)
                        contents = objects_response.get("Contents")
                        has_objects = bool(contents and len(contents) > 0)

                    buckets_with_details.append(
                        {
                            "name": bucket_name,
                            "creationDate": creation_date.isoformat() if creation_date else None,
                            "region": region,
                            "objectCount": object_count,
                            "hasObjects": has_objects,
                        }
                    )
                    logger.debug(f"Successfully fetched details for bucket: {bucket_name}")

                except ClientError as e:
                    error_code = e.response.get("Error", {}).get("Code") if e.response else "Unknown"
                    logger.warning(
                        f"Failed to get details for bucket {bucket_name}: {error_code} - {e}",
                        exc_info=False
                    )
                    failed_buckets.append(bucket_name)

                    # Return basic info for this bucket
                    buckets_with_details.append(
                        {
                            "name": bucket_name,
                            "creationDate": creation_date.isoformat() if creation_date else None,
                            "region": "unknown",
                            "objectCount": 0,
                            "hasObjects": False,
                            "error": str(error_code),
                        }
                    )
                except Exception as e:
                    logger.warning(
                        f"Unexpected error getting details for bucket {bucket_name}: {e}",
                        exc_info=True
                    )
                    failed_buckets.append(bucket_name)

                    buckets_with_details.append(
                        {
                            "name": bucket_name,
                            "creationDate": creation_date.isoformat() if creation_date else None,
                            "region": "unknown",
                            "objectCount": 0,
                            "hasObjects": False,
                        }
                    )

            duration_ms = (time.time() - start_time) * 1000
            logger.info(
                f"Completed list_buckets: {len(buckets_with_details)} buckets, "
                f"{len(failed_buckets)} failures, duration: {duration_ms:.2f}ms"
            )

            if failed_buckets:
                logger.warning(f"Failed to get complete details for buckets: {', '.join(failed_buckets)}")

            # Log detailed bucket structure for debugging
            logger.debug(f"Returning bucket data structure: {buckets_with_details}")

            # Validate all buckets have required fields
            for bucket in buckets_with_details:
                if not bucket.get("name"):
                    logger.error(f"WARNING: Bucket missing 'name' field: {bucket}")

            return buckets_with_details

        except ClientError as e:
            duration_ms = (time.time() - start_time) * 1000
            error_code = e.response.get("Error", {}).get("Code") if e.response else "Unknown"

            logger.error(
                f"Failed to list buckets: {error_code} - {e}, duration: {duration_ms:.2f}ms",
                exc_info=True
            )

            if error_code == "AccessDenied":
                raise S3AccessDeniedError(
                    resource="S3 buckets",
                    operation="ListBuckets"
                ) from e

            raise S3ServiceError(f"Failed to list buckets: {error_code}") from e

        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            logger.error(
                f"Unexpected error in list_buckets, duration: {duration_ms:.2f}ms",
                exc_info=True
            )
            raise S3ServiceError(f"Unexpected error listing buckets: {str(e)}") from e

    async def create_bucket(self, bucket_name: str, region: Optional[str] = None) -> Dict[str, str]:
        """
        Create a new S3 bucket.

        Args:
            bucket_name: Name of the bucket to create
            region: AWS region (defaults to settings.aws_region)

        Returns:
            Dict with bucket name and region

        Raises:
            ValueError: If bucket name is invalid or bucket already exists
        """
        try:
            # Validate bucket name
            self.validate_bucket_name(bucket_name)

            region = region or settings.aws_region

            # Create bucket configuration
            create_params: Dict[str, Any] = {"Bucket": bucket_name}

            # LocationConstraint is not needed for us-east-1
            if region != "us-east-1":
                create_params["CreateBucketConfiguration"] = {"LocationConstraint": region}

            self.s3_client.create_bucket(**create_params)

            logger.info(f"Created bucket: {bucket_name} in region: {region}")
            return {"name": bucket_name, "region": region}
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            if error_code == "BucketAlreadyExists":
                raise ValueError("Bucket name already exists") from e
            elif error_code == "BucketAlreadyOwnedByYou":
                raise ValueError("Bucket already owned by you") from e
            raise Exception(f"Failed to create bucket: {e}") from e

    async def list_access_points(
        self, bucket_name: str, account_id: str
    ) -> List[Dict[str, Any]]:
        """
        List access points for a bucket.

        Args:
            bucket_name: S3 bucket name
            account_id: AWS account ID

        Returns:
            List of access points
        """
        try:
            response = self.s3_control_client.list_access_points(
                AccountId=account_id, Bucket=bucket_name
            )
            return response.get("AccessPointList", [])
        except Exception as e:
            logger.warning(f"Failed to list access points for bucket {bucket_name}: {e}")
            return []

    async def delete_access_point(self, access_point_name: str, account_id: str) -> Dict[str, Any]:
        """
        Delete an S3 access point.

        Args:
            access_point_name: Name of the access point
            account_id: AWS account ID

        Returns:
            Success message

        Raises:
            Exception: If deletion fails
        """
        try:
            self.s3_control_client.delete_access_point(
                AccountId=account_id, Name=access_point_name
            )
            logger.info(f"Deleted access point: {access_point_name}")
            return {
                "success": True,
                "message": f"Access point {access_point_name} deleted successfully",
            }
        except ClientError as e:
            error_msg = f"Failed to delete access point {access_point_name}: {e}"
            logger.error(error_msg)
            raise Exception(error_msg) from e

    async def delete_bucket(self, bucket_name: str) -> Dict[str, Any]:
        """
        Delete an S3 bucket (must be empty).

        Args:
            bucket_name: Name of the bucket to delete

        Returns:
            Success message

        Raises:
            ValidationError: If bucket name is invalid
            BucketNotFoundError: If bucket does not exist
            BucketNotEmptyError: If bucket contains objects
            BucketHasAccessPointsError: If bucket has access points attached
            S3ServiceError: For other errors
        """
        start_time = time.time()

        # Defensive: Validate input
        if not bucket_name or not isinstance(bucket_name, str):
            raise ValidationError("Bucket name is required and must be a string", field="bucket_name", value=bucket_name)

        if not bucket_name.strip():
            raise ValidationError("Bucket name cannot be empty or whitespace", field="bucket_name")

        bucket_name = bucket_name.strip()
        logger.info(f"Starting delete_bucket operation for: {bucket_name}")

        try:
            # Check if bucket is empty
            logger.debug(f"Checking if bucket {bucket_name} is empty")
            objects_response = self.s3_client.list_objects_v2(Bucket=bucket_name, MaxKeys=1)

            # Defensive: Validate response
            if not objects_response or not isinstance(objects_response, dict):
                logger.error(f"Invalid response from list_objects_v2 for {bucket_name}")
                raise S3ServiceError("Invalid response when checking bucket contents")

            contents = objects_response.get("Contents")
            key_count = objects_response.get("KeyCount", 0)

            if contents and len(contents) > 0:
                logger.warning(f"Bucket {bucket_name} is not empty (has {key_count} objects)")
                raise BucketNotEmptyError(bucket_name, object_count=key_count)

            # Try to delete bucket
            logger.debug(f"Attempting to delete bucket: {bucket_name}")
            try:
                self.s3_client.delete_bucket(Bucket=bucket_name)

                duration_ms = (time.time() - start_time) * 1000
                logger.info(f"Successfully deleted bucket: {bucket_name}, duration: {duration_ms:.2f}ms")

                return {"success": True, "message": "Bucket deleted successfully"}

            except ClientError as delete_error:
                error_code = delete_error.response.get("Error", {}).get("Code") if delete_error.response else "Unknown"
                error_msg = str(delete_error)

                logger.warning(f"Delete bucket failed for {bucket_name}: {error_code} - {error_msg}")

                # Check if error is due to access points
                if "access points attached" in error_msg.lower() or error_code == "BucketNotEmpty":
                    account_id = settings.aws_account_id

                    if not account_id:
                        logger.warning(f"AWS_ACCOUNT_ID not configured, cannot manage access points for {bucket_name}")
                        raise BucketHasAccessPointsError(
                            bucket_name=bucket_name,
                            access_points=None
                        ) from delete_error

                    # List access points to inform the user
                    logger.debug(f"Attempting to list access points for bucket: {bucket_name}")
                    try:
                        access_points = await self.list_access_points(bucket_name, account_id)

                        if access_points and len(access_points) > 0:
                            access_point_names = [ap.get("Name", "unknown") for ap in access_points if ap]
                            logger.warning(
                                f"Bucket {bucket_name} has {len(access_points)} access point(s): "
                                f"{', '.join(access_point_names)}"
                            )
                            raise BucketHasAccessPointsError(
                                bucket_name=bucket_name,
                                access_points=access_points
                            ) from delete_error
                        else:
                            # No access points found, re-raise original error
                            logger.warning(f"No access points found but delete still failed for {bucket_name}")
                            raise S3ServiceError(f"Failed to delete bucket: {error_msg}") from delete_error

                    except BucketHasAccessPointsError:
                        # Re-raise our custom exception
                        raise
                    except Exception as ap_error:
                        logger.error(
                            f"Failed to check access points for {bucket_name}: {ap_error}",
                            exc_info=True
                        )
                        raise S3ServiceError(f"Failed to check access points: {str(ap_error)}") from ap_error

                # Re-raise the delete error with appropriate wrapper
                raise S3ServiceError(f"Failed to delete bucket: {error_msg}") from delete_error

        except BucketNotEmptyError:
            # Re-raise our custom exceptions
            raise
        except BucketHasAccessPointsError:
            raise
        except ValidationError:
            raise
        except ClientError as e:
            duration_ms = (time.time() - start_time) * 1000
            error_code = e.response.get("Error", {}).get("Code") if e.response else "Unknown"

            logger.error(
                f"Failed to delete bucket {bucket_name}: {error_code} - {e}, duration: {duration_ms:.2f}ms",
                exc_info=True
            )

            if error_code == "NoSuchBucket":
                raise BucketNotFoundError(bucket_name) from e
            elif error_code == "AccessDenied":
                raise S3AccessDeniedError(resource=bucket_name, operation="DeleteBucket") from e

            raise S3ServiceError(f"Failed to delete bucket: {error_code}") from e

        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            logger.error(
                f"Unexpected error deleting bucket {bucket_name}, duration: {duration_ms:.2f}ms",
                exc_info=True
            )
            raise S3ServiceError(f"Unexpected error deleting bucket: {str(e)}") from e

    async def delete_bucket_with_access_points(
        self, bucket_name: str, account_id: str
    ) -> Dict[str, Any]:
        """
        Delete a bucket and all its access points.

        Args:
            bucket_name: Name of the bucket to delete
            account_id: AWS account ID

        Returns:
            Success message

        Raises:
            Exception: If deletion fails
        """
        try:
            # List and delete access points first
            access_points = await self.list_access_points(bucket_name, account_id)

            if access_points:
                for access_point in access_points:
                    await self.delete_access_point(access_point["Name"], account_id)

            # Now delete the bucket
            self.s3_client.delete_bucket(Bucket=bucket_name)

            message = (
                f"Bucket deleted successfully after removing {len(access_points)} access point(s)"
                if access_points
                else "Bucket deleted successfully"
            )

            logger.info(f"Deleted bucket with access points: {bucket_name}")
            return {"success": True, "message": message}
        except ClientError as e:
            error_msg = f"Failed to delete bucket with access points: {e}"
            logger.error(error_msg)
            raise Exception(error_msg) from e

    # ============================================
    # File Operations
    # ============================================

    async def list_files(
        self,
        bucket_name: str,
        prefix: str = "",
        max_keys: int = 1000,
        continuation_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        List files in an S3 bucket with pagination.

        Args:
            bucket_name: S3 bucket name
            prefix: File key prefix for filtering
            max_keys: Maximum number of keys to return (1-1000)
            continuation_token: Token for pagination

        Returns:
            Dict with files list and pagination info

        Raises:
            Exception: If listing files fails
        """
        try:
            params: Dict[str, Any] = {
                "Bucket": bucket_name,
                "Prefix": prefix,
                "MaxKeys": max_keys,
            }

            if continuation_token:
                params["ContinuationToken"] = continuation_token

            response = self.s3_client.list_objects_v2(**params)

            files = [
                {
                    "key": obj["Key"],
                    "size": obj["Size"],
                    "lastModified": obj["LastModified"].isoformat(),
                    "etag": obj.get("ETag", ""),
                    "storageClass": obj.get("StorageClass", "STANDARD"),
                }
                for obj in response.get("Contents", [])
            ]

            return {
                "files": files,
                "isTruncated": response.get("IsTruncated", False),
                "nextContinuationToken": response.get("NextContinuationToken"),
                "totalCount": response.get("KeyCount", 0),
            }
        except ClientError as e:
            error_msg = f"Failed to list files: {e}"
            logger.error(error_msg)
            raise Exception(error_msg) from e

    async def upload_file(
        self,
        bucket_name: str,
        key: str,
        file_buffer: bytes,
        content_type: str,
        metadata: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Upload a file to S3.

        Args:
            bucket_name: S3 bucket name
            key: Object key (file path)
            file_buffer: File content as bytes
            content_type: MIME type
            metadata: Optional metadata dict

        Returns:
            Dict with key, etag, and size

        Raises:
            Exception: If upload fails
        """
        try:
            params: Dict[str, Any] = {
                "Bucket": bucket_name,
                "Key": key,
                "Body": BytesIO(file_buffer),
                "ContentType": content_type,
            }

            if metadata:
                params["Metadata"] = metadata

            response = self.s3_client.put_object(**params)

            logger.info(f"Uploaded file: {key} to bucket: {bucket_name}")
            return {"key": key, "etag": response.get("ETag", ""), "size": len(file_buffer)}
        except ClientError as e:
            error_msg = f"Failed to upload file: {e}"
            logger.error(error_msg)
            raise Exception(error_msg) from e

    async def download_file(self, bucket_name: str, key: str) -> Dict[str, Any]:
        """
        Download a file from S3.

        Args:
            bucket_name: S3 bucket name
            key: Object key (file path)

        Returns:
            Dict with file body and metadata

        Raises:
            Exception: If download fails
        """
        try:
            response = self.s3_client.get_object(Bucket=bucket_name, Key=key)

            return {
                "body": response["Body"],
                "contentType": response.get("ContentType", "application/octet-stream"),
                "contentLength": response.get("ContentLength", 0),
                "lastModified": response.get("LastModified").isoformat()
                if response.get("LastModified")
                else None,
                "metadata": response.get("Metadata", {}),
            }
        except ClientError as e:
            error_msg = f"Failed to download file: {e}"
            logger.error(error_msg)
            raise Exception(error_msg) from e

    async def delete_file(self, bucket_name: str, key: str) -> Dict[str, bool | str]:
        """
        Delete a file from S3.

        Args:
            bucket_name: S3 bucket name
            key: Object key (file path)

        Returns:
            Success message

        Raises:
            Exception: If deletion fails
        """
        try:
            self.s3_client.delete_object(Bucket=bucket_name, Key=key)
            logger.info(f"Deleted file: {key} from bucket: {bucket_name}")
            return {"success": True, "message": "File deleted successfully"}
        except ClientError as e:
            error_msg = f"Failed to delete file: {e}"
            logger.error(error_msg)
            raise Exception(error_msg) from e

    async def get_file_metadata(self, bucket_name: str, key: str) -> Dict[str, Any]:
        """
        Get file metadata from S3 (HEAD request).

        Args:
            bucket_name: S3 bucket name
            key: Object key (file path)

        Returns:
            Dict with file metadata

        Raises:
            Exception: If getting metadata fails
        """
        try:
            response = self.s3_client.head_object(Bucket=bucket_name, Key=key)

            return {
                "key": key,
                "size": response.get("ContentLength", 0),
                "lastModified": response.get("LastModified").isoformat()
                if response.get("LastModified")
                else None,
                "contentType": response.get("ContentType", "application/octet-stream"),
                "etag": response.get("ETag", ""),
                "metadata": response.get("Metadata", {}),
            }
        except ClientError as e:
            error_msg = f"Failed to get file metadata: {e}"
            logger.error(error_msg)
            raise Exception(error_msg) from e

    async def generate_download_url(self, bucket_name: str, key: str) -> str:
        """
        Generate a presigned URL for downloading a file.

        Args:
            bucket_name: S3 bucket name
            key: Object key (file path)

        Returns:
            Presigned URL string

        Raises:
            Exception: If URL generation fails
        """
        try:
            url = self.aws_clients.generate_presigned_url(bucket_name, key, "get_object")
            logger.debug(f"Generated download URL for: {bucket_name}/{key}")
            return url
        except Exception as e:
            error_msg = f"Failed to generate download URL: {e}"
            logger.error(error_msg)
            raise Exception(error_msg) from e

    async def generate_upload_url(self, bucket_name: str, key: str) -> str:
        """
        Generate a presigned URL for uploading a file.

        Args:
            bucket_name: S3 bucket name
            key: Object key (file path)

        Returns:
            Presigned URL string

        Raises:
            Exception: If URL generation fails
        """
        try:
            url = self.aws_clients.generate_presigned_url(bucket_name, key, "put_object")
            logger.debug(f"Generated upload URL for: {bucket_name}/{key}")
            return url
        except Exception as e:
            error_msg = f"Failed to generate upload URL: {e}"
            logger.error(error_msg)
            raise Exception(error_msg) from e

    # ============================================
    # Validation Helpers
    # ============================================

    def validate_bucket_name(self, bucket_name: str) -> None:
        """
        Validate S3 bucket name according to AWS naming rules.

        Args:
            bucket_name: Bucket name to validate

        Raises:
            ValueError: If bucket name is invalid
        """
        if not bucket_name:
            raise ValueError("Bucket name is required")

        if len(bucket_name) < 3 or len(bucket_name) > 63:
            raise ValueError("Bucket name must be between 3 and 63 characters")

        if not bucket_name.replace(".", "").replace("-", "").replace("_", "").isalnum():
            raise ValueError(
                "Bucket name can only contain lowercase letters, numbers, dots, and hyphens"
            )

        if bucket_name.startswith(".") or bucket_name.endswith("."):
            raise ValueError("Bucket name cannot start or end with a dot")

        if ".." in bucket_name:
            raise ValueError("Bucket name cannot contain consecutive dots")

        if ".-" in bucket_name or "-." in bucket_name:
            raise ValueError("Bucket name cannot contain dots adjacent to hyphens")

    def validate_file_type(self, content_type: str) -> None:
        """
        Validate file MIME type against allowed types.

        Args:
            content_type: MIME type to validate

        Raises:
            ValueError: If file type is not allowed
        """
        allowed_types = settings.allowed_file_types_list

        if "*/*" not in allowed_types:
            is_allowed = any(
                content_type.startswith(allowed_type[:-2])
                if allowed_type.endswith("/*")
                else content_type == allowed_type
                for allowed_type in allowed_types
            )

            if not is_allowed:
                raise ValueError(f"File type {content_type} is not allowed")

    def validate_file_size(self, size: int) -> None:
        """
        Validate file size against maximum allowed size.

        Args:
            size: File size in bytes

        Raises:
            ValueError: If file size exceeds maximum
        """
        if size > settings.max_file_size:
            raise ValueError(
                f"File size exceeds maximum allowed size of {settings.max_file_size} bytes"
            )


# Global S3Service instance
s3_service = S3Service()


def get_s3_service() -> S3Service:
    """
    Dependency function to get S3Service instance.
    Useful for FastAPI dependency injection.
    """
    return s3_service
