"""Simplified SDK for Figma Comments API."""
from typing import List, Optional, Dict, Any

from ..client import FigmaHttpClient
from .models import Comment, CommentReaction


class CommentsAPI:
    """
    Simplified SDK for Figma Comments API.

    Provides methods for:
    - Listing comments on files
    - Creating comments
    - Deleting comments
    - Getting comment reactions
    - Adding/removing reactions
    """

    def __init__(self, client: FigmaHttpClient):
        """
        Initialize Comments API.

        Args:
            client: Shared HTTP client
        """
        self.client = client

    async def list(
        self,
        file_key: str,
        as_md: bool = False,
    ) -> List[Comment]:
        """
        List all comments on a file.

        Args:
            file_key: The file key
            as_md: Return message as markdown (default False)

        Returns:
            List of Comment objects

        Example:
            >>> comments = await api.comments.list("abc123")
            >>> for comment in comments:
            >>>     print(f"{comment.user.handle}: {comment.message}")
        """
        params = {}
        if as_md:
            params["as_md"] = "true"

        response = await self.client.get(f"files/{file_key}/comments", params=params)
        return [Comment(**c) for c in response.get("comments", [])]

    async def create(
        self,
        file_key: str,
        message: str,
        comment_id: Optional[str] = None,
        client_meta: Optional[Dict[str, Any]] = None,
    ) -> Comment:
        """
        Create a new comment or reply.

        Args:
            file_key: The file key
            message: Comment text
            comment_id: Parent comment ID for replies (optional)
            client_meta: Position metadata (optional)
                - x, y: Absolute canvas coordinates
                - node_id: List of node IDs
                - node_offset: Offset within node

        Returns:
            Created Comment object

        Example:
            >>> # Create top-level comment at position
            >>> comment = await api.comments.create(
            ...     "abc123",
            ...     "This needs work",
            ...     client_meta={"x": 100, "y": 200}
            ... )
            >>>
            >>> # Reply to comment
            >>> reply = await api.comments.create(
            ...     "abc123",
            ...     "Agreed",
            ...     comment_id=comment.id
            ... )
        """
        body: Dict[str, Any] = {"message": message}

        if comment_id:
            body["comment_id"] = comment_id
        if client_meta:
            body["client_meta"] = client_meta

        response = await self.client.post(f"files/{file_key}/comments", json=body)
        return Comment(**response)

    async def delete(self, file_key: str, comment_id: str) -> Dict[str, Any]:
        """
        Delete a comment.

        Args:
            file_key: The file key
            comment_id: The comment ID to delete

        Returns:
            Success response

        Example:
            >>> result = await api.comments.delete("abc123", "123456")
        """
        return await self.client.delete(f"files/{file_key}/comments/{comment_id}")

    async def get_reactions(
        self,
        file_key: str,
        comment_id: str,
    ) -> List[CommentReaction]:
        """
        Get reactions for a comment.

        Args:
            file_key: The file key
            comment_id: The comment ID

        Returns:
            List of CommentReaction objects

        Example:
            >>> reactions = await api.comments.get_reactions("abc123", "123456")
            >>> for reaction in reactions:
            >>>     print(f"{reaction.user.handle}: {reaction.emoji}")
        """
        response = await self.client.get(
            f"files/{file_key}/comments/{comment_id}/reactions"
        )
        return [CommentReaction(**r) for r in response.get("reactions", [])]

    async def add_reaction(
        self,
        file_key: str,
        comment_id: str,
        emoji: str,
    ) -> Dict[str, Any]:
        """
        Add reaction to a comment.

        Args:
            file_key: The file key
            comment_id: The comment ID
            emoji: Emoji to react with (e.g., "👍", "❤️", "🎉")

        Returns:
            Success response

        Example:
            >>> await api.comments.add_reaction("abc123", "123456", "👍")
        """
        body = {"emoji": emoji}
        return await self.client.post(
            f"files/{file_key}/comments/{comment_id}/reactions",
            json=body,
        )

    async def remove_reaction(
        self,
        file_key: str,
        comment_id: str,
        emoji: str,
    ) -> Dict[str, Any]:
        """
        Remove reaction from a comment.

        Args:
            file_key: The file key
            comment_id: The comment ID
            emoji: Emoji to remove

        Returns:
            Success response

        Example:
            >>> await api.comments.remove_reaction("abc123", "123456", "👍")
        """
        return await self.client.delete(
            f"files/{file_key}/comments/{comment_id}/reactions",
            params={"emoji": emoji},
        )
