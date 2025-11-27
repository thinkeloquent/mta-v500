"""Tests for main FigmaAPI class."""
import pytest
import os
from unittest.mock import patch

from figma_api import FigmaAPI
from figma_api.files import FilesAPI
from figma_api.comments import CommentsAPI


class TestFigmaAPI:
    """Test FigmaAPI main class."""

    def test_initialization_with_token(self):
        """Test initialization with explicit token."""
        api = FigmaAPI(token="test-token")
        assert api._client.token == "test-token"

    def test_initialization_from_env(self):
        """Test initialization from environment variable."""
        with patch.dict(os.environ, {"FIGMA_TOKEN": "env-token"}):
            api = FigmaAPI()
            assert api._client.token == "env-token"

    def test_initialization_no_token(self):
        """Test initialization fails without token."""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ValueError, match="Figma API token is required"):
                FigmaAPI()

    def test_api_modules_initialized(self):
        """Test that all API modules are initialized."""
        api = FigmaAPI(token="test-token")

        assert isinstance(api.files, FilesAPI)
        assert isinstance(api.comments, CommentsAPI)
        assert api.components is not None
        assert api.projects is not None
        assert api.variables is not None
        assert api.webhooks is not None
        assert api.dev_resources is not None
        assert api.library_analytics is not None

    @pytest.mark.asyncio
    async def test_context_manager(self):
        """Test async context manager."""
        async with FigmaAPI(token="test-token") as api:
            assert api._client._client is not None

    def test_get_stats(self):
        """Test getting statistics."""
        api = FigmaAPI(token="test-token")
        stats = api.get_stats()

        assert "requests" in stats
        assert "errors" in stats
        assert stats["requests"] == 0
