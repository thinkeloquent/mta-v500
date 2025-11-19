"""Tests for HTTP client."""
import pytest
from unittest.mock import AsyncMock, Mock, patch
import httpx

from figma_api.client import FigmaHttpClient, TokenBucket


class TestTokenBucket:
    """Test TokenBucket rate limiter."""

    @pytest.mark.asyncio
    async def test_consume_tokens(self):
        """Test consuming tokens."""
        bucket = TokenBucket(rate=10.0, capacity=10.0)

        # Should not block initially
        await bucket.consume(1.0)
        assert bucket.tokens < 10.0

    @pytest.mark.asyncio
    async def test_rate_limiting(self):
        """Test rate limiting behavior."""
        bucket = TokenBucket(rate=1.0, capacity=1.0)

        # First consume should work
        await bucket.consume(1.0)
        assert bucket.tokens == 0.0


class TestFigmaHttpClient:
    """Test FigmaHttpClient."""

    def test_initialization(self):
        """Test client initialization."""
        client = FigmaHttpClient(token="test-token")
        assert client.token == "test-token"
        assert client.max_retries == 3
        assert client.timeout == 30.0

    @pytest.mark.asyncio
    async def test_context_manager(self):
        """Test async context manager."""
        async with FigmaHttpClient(token="test-token") as client:
            assert client._client is not None

    @pytest.mark.asyncio
    async def test_get_request(self, mock_file_response):
        """Test GET request."""
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_file_response
            mock_response.raise_for_status = Mock()
            mock_client.request = AsyncMock(return_value=mock_response)
            mock_client_class.return_value = mock_client

            async with FigmaHttpClient(token="test-token") as client:
                result = await client.get("files/abc123")
                assert result["name"] == "Test File"
                assert result["version"] == "123456"

    def test_get_stats(self):
        """Test getting request statistics."""
        client = FigmaHttpClient(token="test-token")
        stats = client.get_stats()
        assert "requests" in stats
        assert "errors" in stats
        assert "retries" in stats
        assert "rate_limited" in stats
