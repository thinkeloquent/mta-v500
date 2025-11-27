"""Models for Comments API."""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import Field

from ..models import FigmaBaseModel, CommentUser, ClientMeta


class Comment(FigmaBaseModel):
    """Figma comment."""

    id: str
    file_key: str = Field(alias="file_key")
    parent_id: Optional[str] = Field(None, alias="parent_id")
    user: CommentUser
    created_at: datetime = Field(alias="created_at")
    resolved_at: Optional[datetime] = Field(None, alias="resolved_at")
    message: str
    client_meta: Optional[ClientMeta] = Field(None, alias="client_meta")
    order_id: Optional[str] = Field(None, alias="order_id")


class CommentReaction(FigmaBaseModel):
    """Comment reaction."""

    emoji: str
    created_at: datetime = Field(alias="created_at")
    user: CommentUser


class CommentsResponse(FigmaBaseModel):
    """Response from comments list endpoint."""

    comments: List[Comment]
