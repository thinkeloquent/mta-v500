"""
Chat request/response schemas for AI SDK Chat API.
"""

from typing import Literal, Optional

from pydantic import BaseModel, Field


class Message(BaseModel):
    """A single chat message."""

    role: Literal["user", "assistant", "system"] = Field(description="The role of the message sender")
    content: str = Field(description="The content of the message")


class MessagesRequest(BaseModel):
    """Request body for messages-based chat endpoints."""

    messages: list[Message] = Field(description="Array of chat messages")


class PromptRequest(BaseModel):
    """Request body for simple prompt-based endpoints."""

    prompt: str = Field(description="The prompt to send to the AI model")


class ChatConfig(BaseModel):
    """Configuration for chat requests, extracted from headers."""

    model: str = Field(description="The model to use for completion")
    provider: str = Field(description="The provider name")
    base_url: str = Field(description="The provider's API base URL")
    api_key: Optional[str] = Field(default=None, description="The API key for the provider")


class StreamInitData(BaseModel):
    """Initial data sent at the start of a custom stream."""

    initialized: bool = True
    timestamp: str = Field(description="ISO timestamp of stream initialization")
