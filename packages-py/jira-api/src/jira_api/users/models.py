"""Pydantic models for Jira user entities."""

from typing import Optional

from pydantic import Field

from jira_api.models import JiraBaseModel


class User(JiraBaseModel):
    """Jira User model."""

    account_id: str = Field(..., description="The account ID of the user")
    account_type: str = Field(..., alias="accountType", description="Type of account")
    email: Optional[str] = Field(None, alias="emailAddress", description="Email address")
    display_name: str = Field(..., alias="displayName", description="Display name of the user")
    active: bool = Field(..., description="Whether the user is active")
    time_zone: Optional[str] = Field(None, alias="timeZone", description="User's time zone")
    locale: Optional[str] = Field(None, description="User's locale")
    avatar_urls: Optional[dict] = Field(None, alias="avatarUrls", description="Avatar URLs")
    self: Optional[str] = Field(None, description="URL to the user resource")


class UserSearchResult(JiraBaseModel):
    """Result from user search query."""

    users: list[User] = Field(default_factory=list, description="List of users matching search")
    total: int = Field(0, description="Total number of results")
