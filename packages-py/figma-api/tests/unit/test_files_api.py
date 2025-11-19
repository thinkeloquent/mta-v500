"""Tests for Files API."""
import pytest
from unittest.mock import AsyncMock, Mock, patch

from figma_api.files import FilesAPI, File
from figma_api.client import FigmaHttpClient


class TestFilesAPI:
    """Test FilesAPI."""

    @pytest.mark.asyncio
    async def test_get_file(self, mock_file_response):
        """Test getting a file."""
        mock_client = Mock(spec=FigmaHttpClient)
        mock_client.get = AsyncMock(return_value=mock_file_response)

        files_api = FilesAPI(mock_client)
        file = await files_api.get("abc123")

        assert isinstance(file, File)
        assert file.name == "Test File"
        assert file.version == "123456"
        mock_client.get.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_file_with_params(self, mock_file_response):
        """Test getting a file with parameters."""
        mock_client = Mock(spec=FigmaHttpClient)
        mock_client.get = AsyncMock(return_value=mock_file_response)

        files_api = FilesAPI(mock_client)
        file = await files_api.get(
            "abc123",
            version="v1",
            ids=["1:2", "3:4"],
            depth=2,
        )

        assert file.name == "Test File"
        call_args = mock_client.get.call_args
        assert call_args[1]["params"]["version"] == "v1"
        assert call_args[1]["params"]["depth"] == 2

    @pytest.mark.asyncio
    async def test_get_images(self):
        """Test rendering images."""
        mock_response = {
            "err": None,
            "images": {
                "1:2": "https://example.com/image1.png",
                "3:4": "https://example.com/image2.png",
            },
            "status": 200,
        }
        mock_client = Mock(spec=FigmaHttpClient)
        mock_client.get = AsyncMock(return_value=mock_response)

        files_api = FilesAPI(mock_client)
        result = await files_api.get_images(
            "abc123",
            ["1:2", "3:4"],
            scale=2.0,
            format="png",
        )

        assert result.images["1:2"] is not None
        assert result.images["3:4"] is not None
        assert result.status == 200
