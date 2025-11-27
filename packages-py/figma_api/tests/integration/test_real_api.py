"""
Integration tests with real Figma API.

These tests require a valid FIGMA_TOKEN environment variable and will make real API calls.
Use with caution to avoid rate limits.

To run: pytest tests/integration/ -v
To skip: pytest tests/unit/ -v
"""
import os
import pytest

from figma_api import FigmaAPI, AuthenticationError


# Skip all integration tests if no token is available
pytestmark = pytest.mark.skipif(
    not os.environ.get("FIGMA_TOKEN"),
    reason="FIGMA_TOKEN environment variable not set"
)


@pytest.mark.integration
class TestRealAPI:
    """Test with real Figma API (requires valid token)."""

    @pytest.mark.asyncio
    async def test_api_initialization(self):
        """Test that API can be initialized and connected."""
        async with FigmaAPI() as api:
            assert api._client._client is not None

    @pytest.mark.asyncio
    async def test_invalid_token(self):
        """Test that invalid token raises authentication error."""
        with pytest.raises(AuthenticationError):
            async with FigmaAPI(token="invalid-token-123") as api:
                # This should raise when we try to make a request
                await api.files.get("test")

    # Add more integration tests here with real file keys
    # Example:
    # @pytest.mark.asyncio
    # async def test_get_real_file(self):
    #     """Test getting a real Figma file."""
    #     async with FigmaAPI() as api:
    #         file = await api.files.get("YOUR_FILE_KEY")
    #         assert file.name is not None
