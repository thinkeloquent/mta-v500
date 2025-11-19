"""
Unit tests for AWS S3 Files migration and integration.

Tests verify:
- Proper module imports with relative paths
- FastAPI app structure and configuration
- All routes are registered correctly
- Middleware is properly configured
- Frontend static files are served
"""

import os
import sys
from pathlib import Path
import pytest
from unittest.mock import Mock, patch, MagicMock

# Add project root to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))


class TestMigrationStructure:
    """Test the migrated directory structure and files."""

    def test_directory_structure_exists(self):
        """Verify all required directories exist."""
        base_path = Path(__file__).parent.parent

        required_dirs = [
            "config",
            "models",
            "routers",
            "services",
            "middleware",
            "frontend",
        ]

        for dir_name in required_dirs:
            dir_path = base_path / dir_name
            assert dir_path.exists(), f"Directory {dir_name} should exist"
            assert dir_path.is_dir(), f"{dir_name} should be a directory"

    def test_init_files_exist(self):
        """Verify __init__.py files exist for all packages."""
        base_path = Path(__file__).parent.parent

        required_init_files = [
            "__init__.py",
            "config/__init__.py",
            "models/__init__.py",
            "routers/__init__.py",
            "services/__init__.py",
            "middleware/__init__.py",
        ]

        for init_file in required_init_files:
            file_path = base_path / init_file
            assert file_path.exists(), f"Init file {init_file} should exist"

    def test_main_files_exist(self):
        """Verify main application files exist."""
        base_path = Path(__file__).parent.parent

        required_files = [
            "main.py",
            "requirements.txt",
            ".env.example",
            "README.md",
        ]

        for file_name in required_files:
            file_path = base_path / file_name
            assert file_path.exists(), f"File {file_name} should exist"

    def test_frontend_build_exists(self):
        """Verify frontend build directory exists."""
        base_path = Path(__file__).parent.parent
        frontend_dist = base_path / "frontend" / "dist"

        assert frontend_dist.exists(), "Frontend dist directory should exist"
        assert (frontend_dist / "index.html").exists(), "index.html should exist in dist"


class TestImports:
    """Test that all imports use relative paths correctly."""

    @patch.dict(os.environ, {
        "AWS_S3_ACCESS_KEY": "test-key",
        "AWS_S3_SECRET_KEY": "test-secret",
        "AWS_REGION": "us-east-1",
        "PORT": "3001",
    })
    def test_main_imports(self):
        """Test main.py can be imported with relative imports."""
        # Mock boto3 to avoid AWS dependency
        with patch.dict('sys.modules', {
            'boto3': MagicMock(),
            'botocore': MagicMock(),
            'botocore.client': MagicMock(),
            'botocore.exceptions': MagicMock(),
            'slowapi': MagicMock(),
            'slowapi.util': MagicMock(),
            'slowapi.errors': MagicMock(),
        }):
            # Import should work without errors
            from app.aws_s3_files import config
            from app.aws_s3_files import models
            from app.aws_s3_files import routers
            from app.aws_s3_files import services
            from app.aws_s3_files import middleware

            # All imports should succeed
            assert config is not None
            assert models is not None
            assert routers is not None
            assert services is not None
            assert middleware is not None


class TestFastAPIApp:
    """Test FastAPI application configuration."""

    @patch.dict(os.environ, {
        "AWS_S3_ACCESS_KEY": "test-key",
        "AWS_S3_SECRET_KEY": "test-secret",
        "AWS_REGION": "us-east-1",
    })
    @patch('boto3.Session')
    def test_app_creation(self, mock_session):
        """Test that FastAPI app is created correctly."""
        # Mock AWS clients
        mock_s3 = MagicMock()
        mock_s3.list_buckets.return_value = {}
        mock_session.return_value.client.return_value = mock_s3

        with patch.dict('sys.modules', {
            'slowapi': MagicMock(),
            'slowapi.util': MagicMock(),
            'slowapi.errors': MagicMock(),
        }):
            from app.aws_s3_files.main import app

            assert app.title == "AWS S3 Admin API"
            assert app.version == "1.0.0"
            assert app.docs_url == "/docs"
            assert app.redoc_url == "/redoc"

    @patch.dict(os.environ, {
        "AWS_S3_ACCESS_KEY": "test-key",
        "AWS_S3_SECRET_KEY": "test-secret",
        "AWS_REGION": "us-east-1",
    })
    @patch('boto3.Session')
    def test_routes_registered(self, mock_session):
        """Test that all routes are registered."""
        # Mock AWS clients
        mock_s3 = MagicMock()
        mock_s3.list_buckets.return_value = {}
        mock_session.return_value.client.return_value = mock_s3

        with patch.dict('sys.modules', {
            'slowapi': MagicMock(),
            'slowapi.util': MagicMock(),
            'slowapi.errors': MagicMock(),
        }):
            from app.aws_s3_files.main import app

            # Get all route paths
            route_paths = []
            for route in app.routes:
                if hasattr(route, 'path'):
                    route_paths.append(route.path)

            # Verify key routes exist
            assert "/health" in route_paths
            assert "/api/buckets" in route_paths
            assert any("/api/buckets/{bucket}/files" in path for path in route_paths)


class TestConfiguration:
    """Test configuration and environment variables."""

    def test_env_example_has_required_vars(self):
        """Test .env.example contains all required variables."""
        base_path = Path(__file__).parent.parent
        env_example = base_path / ".env.example"

        assert env_example.exists(), ".env.example should exist"

        content = env_example.read_text()
        required_vars = [
            "AWS_S3_ACCESS_KEY",
            "AWS_S3_SECRET_KEY",
            "AWS_REGION",
            "AWS_ACCOUNT_ID",
            "PORT",
            "CORS_ORIGIN",
        ]

        for var in required_vars:
            assert var in content, f"{var} should be in .env.example"


class TestOrchestratorIntegration:
    """Test integration with the orchestrator."""

    def test_reference_route_exists(self):
        """Test reference route file exists in orchestrator."""
        route_file = Path(__file__).parent.parent.parent / "routes" / "aws-s3-files.routes.py"
        assert route_file.exists(), "Reference route file should exist in app/routes/"

    def test_reference_route_has_router(self):
        """Test reference route has proper APIRouter."""
        from app.routes.aws_s3_files_routes import router

        assert router is not None
        assert hasattr(router, 'prefix')
        assert router.prefix == "/s3-admin"


class TestFrontendIntegration:
    """Test frontend integration."""

    def test_frontend_build_complete(self):
        """Test frontend build output is complete."""
        base_path = Path(__file__).parent.parent
        dist_path = base_path / "frontend" / "dist"

        # Check essential build files
        assert (dist_path / "index.html").exists()
        assert (dist_path / "assets").exists()
        assert (dist_path / "assets").is_dir()

        # Check that assets were built
        assets = list((dist_path / "assets").glob("*"))
        assert len(assets) > 0, "Should have built assets"

    def test_api_url_updated(self):
        """Test that frontend API URL is updated."""
        base_path = Path(__file__).parent.parent
        api_file = base_path / "frontend" / "src" / "services" / "api.js"

        assert api_file.exists()
        content = api_file.read_text()

        # Verify API base URL is updated to new mount path
        assert "/api/apps/aws-s3-files/api" in content, \
            "API base URL should be updated to /api/apps/aws-s3-files/api"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
