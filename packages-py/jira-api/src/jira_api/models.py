"""Shared base models for Jira API."""

from pydantic import BaseModel, ConfigDict


class JiraBaseModel(BaseModel):
    """Base model for all Jira API models with common configuration."""

    model_config = ConfigDict(
        populate_by_name=True,
        str_strip_whitespace=True,
        validate_assignment=True,
    )
