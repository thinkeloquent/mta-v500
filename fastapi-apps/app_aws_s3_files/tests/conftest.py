"""
Pytest configuration and fixtures.
"""
import os
import sys
from pathlib import Path
import pytest
from unittest.mock import MagicMock, patch

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

# Set environment variables before importing app
os.environ.setdefault("AWS_S3_ACCESS_KEY", "test_access_key")
os.environ.setdefault("AWS_S3_SECRET_KEY", "test_secret_key")
os.environ.setdefault("AWS_REGION", "us-east-1")
os.environ.setdefault("AWS_ACCOUNT_ID", "123456789012")
os.environ.setdefault("PORT", "3001")

# Mock boto3 before importing app
with patch.dict('sys.modules', {
    'boto3': MagicMock(),
    'botocore': MagicMock(),
    'botocore.client': MagicMock(),
    'botocore.exceptions': MagicMock(),
    'slowapi': MagicMock(),
    'slowapi.util': MagicMock(),
    'slowapi.errors': MagicMock(),
}):
    from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """
    Create a test client for the FastAPI application.

    Returns:
        TestClient instance
    """
    # Mock app for testing
    from fastapi import FastAPI
    app = FastAPI()
    return TestClient(app)


@pytest.fixture
def mock_aws_credentials(monkeypatch):
    """
    Mock AWS credentials for testing.

    Args:
        monkeypatch: Pytest monkeypatch fixture
    """
    monkeypatch.setenv("AWS_S3_ACCESS_KEY", "test_access_key")
    monkeypatch.setenv("AWS_S3_SECRET_KEY", "test_secret_key")
    monkeypatch.setenv("AWS_REGION", "us-east-1")
    monkeypatch.setenv("AWS_ACCOUNT_ID", "123456789012")


@pytest.fixture
def sample_bucket_data():
    """
    Sample bucket data for testing.

    Returns:
        Dict with sample bucket information
    """
    return {
        "name": "test-bucket",
        "region": "us-east-1",
    }


@pytest.fixture
def sample_file_data():
    """
    Sample file data for testing.

    Returns:
        Dict with sample file information
    """
    return {
        "key": "test-file.txt",
        "content": b"Hello, World!",
        "content_type": "text/plain",
    }
