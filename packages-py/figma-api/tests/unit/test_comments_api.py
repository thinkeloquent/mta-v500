"""Tests for Comments API."""
import pytest
from unittest.mock import AsyncMock, Mock

from figma_api.comments import CommentsAPI, Comment
from figma_api.client import FigmaHttpClient


class TestCommentsAPI:
    """Test CommentsAPI."""

    @pytest.mark.asyncio
    async def test_list_comments(self, mock_comments_response):
        """Test listing comments."""
        mock_client = Mock(spec=FigmaHttpClient)
        mock_client.get = AsyncMock(return_value=mock_comments_response)

        comments_api = CommentsAPI(mock_client)
        comments = await comments_api.list("abc123")

        assert len(comments) == 1
        assert isinstance(comments[0], Comment)
        assert comments[0].message == "Test comment"
        assert comments[0].user.handle == "testuser"

    @pytest.mark.asyncio
    async def test_create_comment(self):
        """Test creating a comment."""
        mock_response = {
            "id": "new123",
            "file_key": "abc123",
            "parent_id": None,
            "user": {
                "id": "user1",
                "handle": "testuser",
                "img_url": "https://example.com/avatar.png",
            },
            "created_at": "2024-01-01T00:00:00Z",
            "resolved_at": None,
            "message": "New comment",
        }
        mock_client = Mock(spec=FigmaHttpClient)
        mock_client.post = AsyncMock(return_value=mock_response)

        comments_api = CommentsAPI(mock_client)
        comment = await comments_api.create(
            "abc123",
            "New comment",
            client_meta={"x": 100, "y": 200},
        )

        assert isinstance(comment, Comment)
        assert comment.id == "new123"
        assert comment.message == "New comment"

    @pytest.mark.asyncio
    async def test_delete_comment(self):
        """Test deleting a comment."""
        mock_client = Mock(spec=FigmaHttpClient)
        mock_client.delete = AsyncMock(return_value={"status": "success"})

        comments_api = CommentsAPI(mock_client)
        result = await comments_api.delete("abc123", "comment123")

        assert result["status"] == "success"
        mock_client.delete.assert_called_once()

    @pytest.mark.asyncio
    async def test_add_reaction(self):
        """Test adding a reaction."""
        mock_client = Mock(spec=FigmaHttpClient)
        mock_client.post = AsyncMock(return_value={"status": "success"})

        comments_api = CommentsAPI(mock_client)
        result = await comments_api.add_reaction("abc123", "comment123", "👍")

        assert result["status"] == "success"
        call_args = mock_client.post.call_args
        assert call_args[1]["json"]["emoji"] == "👍"
