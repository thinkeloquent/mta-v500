"""Pydantic models for Jira project entities."""

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import Field

from jira_api.models import JiraBaseModel


class IssueType(JiraBaseModel):
    """Jira Issue Type model."""

    id: str = Field(..., description="The ID of the issue type")
    name: str = Field(..., description="The name of the issue type")
    description: Optional[str] = Field(None, description="Description of the issue type")
    icon_url: Optional[str] = Field(None, alias="iconUrl", description="URL to the icon")
    subtask: bool = Field(False, description="Whether this is a subtask type")


class ProjectCategory(JiraBaseModel):
    """Jira Project Category model."""

    id: str = Field(..., description="The ID of the category")
    name: str = Field(..., description="The name of the category")
    description: Optional[str] = Field(None, description="Description of the category")
    self: Optional[str] = Field(None, description="URL to the category resource")


class Project(JiraBaseModel):
    """Jira Project model."""

    id: str = Field(..., description="The ID of the project")
    key: str = Field(..., description="The key of the project")
    name: str = Field(..., description="The name of the project")
    description: Optional[str] = Field(None, description="Description of the project")
    project_type_key: Optional[str] = Field(None, alias="projectTypeKey", description="Type of project")
    simplified: Optional[bool] = Field(None, description="Whether project uses simplified workflow")
    style: Optional[str] = Field(None, description="Project style (classic or next-gen)")
    is_private: Optional[bool] = Field(None, alias="isPrivate", description="Whether project is private")
    project_category: Optional[ProjectCategory] = Field(None, alias="projectCategory", description="Project category")
    issue_types: Optional[list[IssueType]] = Field(None, alias="issueTypes", description="Available issue types")
    self: Optional[str] = Field(None, description="URL to the project resource")
    avatar_urls: Optional[Dict[str, str]] = Field(None, alias="avatarUrls", description="Avatar URLs")


class ProjectVersion(JiraBaseModel):
    """Jira Project Version model."""

    id: str = Field(..., description="The ID of the version")
    name: str = Field(..., description="The name of the version")
    description: Optional[str] = Field(None, description="Description of the version")
    archived: bool = Field(False, description="Whether the version is archived")
    released: bool = Field(False, description="Whether the version has been released")
    release_date: Optional[str] = Field(None, alias="releaseDate", description="Release date (YYYY-MM-DD)")
    start_date: Optional[str] = Field(None, alias="startDate", description="Start date (YYYY-MM-DD)")
    project_id: Optional[str] = Field(None, alias="projectId", description="ID of the project")
    self: Optional[str] = Field(None, description="URL to the version resource")


class ProjectVersionCreate(JiraBaseModel):
    """Model for creating a new project version."""

    name: str = Field(..., description="Name of the version")
    description: Optional[str] = Field(None, description="Description of the version")
    project_id: Optional[str] = Field(None, alias="projectId", description="ID of the project")
    archived: bool = Field(False, description="Whether the version is archived")
    released: bool = Field(False, description="Whether the version has been released")
    release_date: Optional[str] = Field(None, alias="releaseDate", description="Release date (YYYY-MM-DD)")
    start_date: Optional[str] = Field(None, alias="startDate", description="Start date (YYYY-MM-DD)")


class Component(JiraBaseModel):
    """Jira Component model."""

    id: str = Field(..., description="The ID of the component")
    name: str = Field(..., description="The name of the component")
    description: Optional[str] = Field(None, description="Description of the component")
    project: Optional[str] = Field(None, description="Project key")
    project_id: Optional[str] = Field(None, alias="projectId", description="Project ID")
    assignee_type: Optional[str] = Field(None, alias="assigneeType", description="Assignee type")
    self: Optional[str] = Field(None, description="URL to the component resource")
