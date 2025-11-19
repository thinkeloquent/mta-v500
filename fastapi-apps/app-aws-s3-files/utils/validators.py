"""
Validation utilities for S3 operations.
"""
import re
from typing import Optional


def validate_bucket_name(bucket_name: str) -> tuple[bool, Optional[str]]:
    """
    Validate S3 bucket name according to AWS naming rules.

    Args:
        bucket_name: Bucket name to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not bucket_name:
        return False, "Bucket name is required"

    if len(bucket_name) < 3:
        return False, "Bucket name must be at least 3 characters long"

    if len(bucket_name) > 63:
        return False, "Bucket name must be at most 63 characters long"

    if not re.match(r"^[a-z0-9.-]+$", bucket_name):
        return (
            False,
            "Bucket name can only contain lowercase letters, numbers, dots, and hyphens",
        )

    if bucket_name.startswith(".") or bucket_name.endswith("."):
        return False, "Bucket name cannot start or end with a dot"

    if ".." in bucket_name:
        return False, "Bucket name cannot contain consecutive dots"

    if ".-" in bucket_name or "-." in bucket_name:
        return False, "Bucket name cannot contain dots adjacent to hyphens"

    return True, None


def validate_file_key(file_key: str) -> tuple[bool, Optional[str]]:
    """
    Validate S3 file key.

    Args:
        file_key: File key to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not file_key:
        return False, "File key cannot be empty"

    if len(file_key) < 1:
        return False, "File key must be at least 1 character long"

    if len(file_key) > 1024:
        return False, "File key is too long (max 1024 characters)"

    if re.search(r'[<>:"|?*]', file_key):
        return False, "File key contains invalid characters"

    return True, None


def validate_file_size(size: int, max_size: int) -> tuple[bool, Optional[str]]:
    """
    Validate file size.

    Args:
        size: File size in bytes
        max_size: Maximum allowed size in bytes

    Returns:
        Tuple of (is_valid, error_message)
    """
    if size > max_size:
        return False, f"File size exceeds maximum allowed size of {max_size} bytes"

    return True, None


def validate_file_type(content_type: str, allowed_types: list[str]) -> tuple[bool, Optional[str]]:
    """
    Validate file MIME type.

    Args:
        content_type: MIME type to validate
        allowed_types: List of allowed MIME type patterns (e.g., 'image/*', 'application/pdf')

    Returns:
        Tuple of (is_valid, error_message)
    """
    if "*/*" in allowed_types:
        return True, None

    is_allowed = any(
        content_type.startswith(allowed_type[:-2])
        if allowed_type.endswith("/*")
        else content_type == allowed_type
        for allowed_type in allowed_types
    )

    if not is_allowed:
        return False, f"File type {content_type} is not allowed"

    return True, None


def validate_region(region: str) -> tuple[bool, Optional[str]]:
    """
    Validate AWS region name.

    Args:
        region: AWS region to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    # Common AWS regions
    valid_regions = [
        "us-east-1",
        "us-east-2",
        "us-west-1",
        "us-west-2",
        "eu-west-1",
        "eu-west-2",
        "eu-west-3",
        "eu-central-1",
        "eu-north-1",
        "ap-northeast-1",
        "ap-northeast-2",
        "ap-northeast-3",
        "ap-southeast-1",
        "ap-southeast-2",
        "ap-south-1",
        "ca-central-1",
        "sa-east-1",
    ]

    if region not in valid_regions:
        return False, f"Invalid AWS region: {region}"

    return True, None


def validate_max_keys(max_keys: int) -> tuple[bool, Optional[str]]:
    """
    Validate max_keys parameter for list operations.

    Args:
        max_keys: Number of keys to return

    Returns:
        Tuple of (is_valid, error_message)
    """
    if max_keys < 1:
        return False, "max_keys must be at least 1"

    if max_keys > 1000:
        return False, "max_keys cannot exceed 1000"

    return True, None
