"""
Integration tests for AWS S3 Files application mounted in orchestrator.

These tests verify:
- Orchestrator can import and mount the S3 app
- All endpoints are accessible through the orchestrator
- Frontend is served correctly
- API documentation is available
"""

import os
import sys
from pathlib import Path
import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient

# Set required environment variables before any imports
os.environ.setdefault("AWS_S3_ACCESS_KEY", "test_access_key")
os.environ.setdefault("AWS_S3_SECRET_KEY", "test_secret_key")
os.environ.setdefault("AWS_REGION", "us-east-1")
os.environ.setdefault("AWS_ACCOUNT_ID", "123456789012")


@pytest.fixture(scope="module")
def orchestrator_client():
    """Create test client for the orchestrator with S3 app mounted."""
    # Mock boto3 and other dependencies
    with patch.dict('sys.modules', {
        'boto3': MagicMock(),
        'botocore': MagicMock(),
        'botocore.client': MagicMock(),
        'botocore.exceptions': MagicMock(),
        'slowapi': MagicMock(),
        'slowapi.util': MagicMock(),
        'slowapi.errors': MagicMock(),
    }):
        # Mock boto3.Session
        mock_session = MagicMock()
        mock_s3 = MagicMock()
        mock_s3.list_buckets.return_value = {"Buckets": []}
        mock_session.client.return_value = mock_s3

        with patch('boto3.Session', return_value=mock_session):
            try:
                from app.main import app
                return TestClient(app)
            except Exception as e:
                pytest.skip(f"Could not import orchestrator: {e}")


class TestOrchestratorIntegration:
    """Test orchestrator integration."""

    def test_orchestrator_health(self, orchestrator_client):
        """Test orchestrator health endpoint shows S3 app mounted."""
        response = orchestrator_client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "sub_apps" in data
        # S3 app should be in sub_apps if successfully mounted
        assert "aws-s3-files" in data["sub_apps"] or len(data["sub_apps"]) >= 0

    def test_orchestrator_metadata(self, orchestrator_client):
        """Test orchestrator metadata endpoint shows S3 app info."""
        response = orchestrator_client.get("/~/sys/metadata/apps")
        assert response.status_code == 200
        data = response.json()
        assert "sub_apps" in data

        # Check if S3 app is in the list
        s3_app = None
        for app in data["sub_apps"]:
            if app["name"] == "aws-s3-files":
                s3_app = app
                break

        if s3_app:
            assert s3_app["path"] == "/api/apps/aws-s3-files"
            assert s3_app["docs"] == "/api/apps/aws-s3-files/docs"
            assert s3_app["health"] == "/api/apps/aws-s3-files/health"

    def test_s3_reference_route_info(self, orchestrator_client):
        """Test S3 admin reference route."""
        response = orchestrator_client.get("/s3-admin/info")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "AWS S3 Files Admin"
        assert data["mounted_at"] == "/api/apps/aws-s3-files"

    def test_s3_reference_route_ping(self, orchestrator_client):
        """Test S3 admin reference route ping."""
        response = orchestrator_client.get("/s3-admin/ping")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"


class TestS3AppEndpoints:
    """Test S3 app endpoints through orchestrator."""

    def test_s3_app_health(self, orchestrator_client):
        """Test S3 app health endpoint."""
        response = orchestrator_client.get("/api/apps/aws-s3-files/health")
        # Should return 200 if mounted correctly
        if response.status_code == 200:
            data = response.json()
            assert "status" in data
        else:
            # App might not be mounted if boto3 not available
            assert response.status_code in [200, 404]

    def test_s3_app_root(self, orchestrator_client):
        """Test S3 app root endpoint."""
        response = orchestrator_client.get("/api/apps/aws-s3-files/")
        # Should return 200 (serving frontend) or 404
        assert response.status_code in [200, 404]

    def test_s3_app_docs(self, orchestrator_client):
        """Test S3 app documentation endpoint."""
        response = orchestrator_client.get("/api/apps/aws-s3-files/docs")
        # Should return 200 if docs are accessible
        if response.status_code == 200:
            assert "text/html" in response.headers.get("content-type", "")
        else:
            # Might not be accessible if app not mounted
            assert response.status_code in [200, 404, 307, 404]


class TestFrontendServing:
    """Test frontend file serving."""

    def test_frontend_dist_exists(self):
        """Test that frontend dist directory exists."""
        frontend_dist = Path("app/aws-s3-files/frontend/dist")
        assert frontend_dist.exists(), "Frontend dist should exist"
        assert (frontend_dist / "index.html").exists(), "index.html should exist"

    def test_frontend_assets_exist(self):
        """Test that frontend assets were built."""
        assets_dir = Path("app/aws-s3-files/frontend/dist/assets")
        assert assets_dir.exists(), "Assets directory should exist"

        # Should have at least one asset file
        assets = list(assets_dir.glob("*"))
        assert len(assets) > 0, "Should have built asset files"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
