"""Pydantic models for Jira issue entities."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import Field

from jira_api.models import JiraBaseModel
from jira_api.projects.models import IssueType, Project
from jira_api.users.models import User


class IssueStatus(JiraBaseModel):
    """Jira Issue Status model."""

    id: str = Field(..., description="The ID of the status")
    name: str = Field(..., description="The name of the status")
    description: Optional[str] = Field(None, description="Description of the status")
    status_category: Optional[Dict[str, Any]] = Field(None, alias="statusCategory", description="Status category")
    self: Optional[str] = Field(None, description="URL to the status resource")


class IssuePriority(JiraBaseModel):
    """Jira Issue Priority model."""

    id: str = Field(..., description="The ID of the priority")
    name: str = Field(..., description="The name of the priority")
    description: Optional[str] = Field(None, description="Description of the priority")
    icon_url: Optional[str] = Field(None, alias="iconUrl", description="URL to the priority icon")
    self: Optional[str] = Field(None, description="URL to the priority resource")


class IssueTransition(JiraBaseModel):
    """Jira Issue Transition model."""

    id: str = Field(..., description="The ID of the transition")
    name: str = Field(..., description="The name of the transition")
    to: IssueStatus = Field(..., description="The status this transition leads to")
    has_screen: bool = Field(False, alias="hasScreen", description="Whether this transition has a screen")
    is_global: Optional[bool] = Field(None, alias="isGlobal", description="Whether this is a global transition")
    is_initial: Optional[bool] = Field(None, alias="isInitial", description="Whether this is an initial transition")


class Comment(JiraBaseModel):
    """Jira Comment model."""

    id: str = Field(..., description="The ID of the comment")
    body: Optional[Any] = Field(None, description="Body of the comment (ADF or text)")
    author: Optional[User] = Field(None, description="Author of the comment")
    created: Optional[str] = Field(None, description="When the comment was created")
    updated: Optional[str] = Field(None, description="When the comment was last updated")
    self: Optional[str] = Field(None, description="URL to the comment resource")


class IssueFields(JiraBaseModel):
    """Jira Issue Fields model."""

    summary: str = Field(..., description="Summary of the issue")
    description: Optional[Any] = Field(None, description="Description of the issue (ADF or text)")
    issue_type: IssueType = Field(..., alias="issuetype", description="Type of the issue")
    project: Project = Field(..., description="Project the issue belongs to")
    status: IssueStatus = Field(..., description="Current status of the issue")
    priority: Optional[IssuePriority] = Field(None, description="Priority of the issue")
    assignee: Optional[User] = Field(None, description="User assigned to the issue")
    reporter: Optional[User] = Field(None, description="User who reported the issue")
    labels: List[str] = Field(default_factory=list, description="Labels attached to the issue")
    created: Optional[str] = Field(None, description="When the issue was created")
    updated: Optional[str] = Field(None, description="When the issue was last updated")
    resolution: Optional[Dict[str, Any]] = Field(None, description="Resolution of the issue")
    resolution_date: Optional[str] = Field(None, alias="resolutiondate", description="When the issue was resolved")
    comment: Optional[Dict[str, Any]] = Field(None, description="Comments on the issue")


class Issue(JiraBaseModel):
    """Jira Issue model."""

    id: str = Field(..., description="The ID of the issue")
    key: str = Field(..., description="The key of the issue")
    self: str = Field(..., description="URL to the issue")
    fields: IssueFields = Field(..., description="Issue fields")
    changelog: Optional[Dict[str, Any]] = Field(None, description="Issue changelog")


class IssueCreate(JiraBaseModel):
    """Model for creating a new issue."""

    project_key: str = Field(..., description="Key of the project")
    summary: str = Field(..., description="Summary of the issue")
    description: Optional[str] = Field(None, description="Description of the issue")
    issue_type: str = Field(..., description="Name of the issue type (e.g., 'Bug', 'Story')")
    priority: Optional[str] = Field(None, description="Name of the priority (e.g., 'High', 'Medium')")
    assignee_account_id: Optional[str] = Field(None, description="Account ID of the assignee")
    reporter_account_id: Optional[str] = Field(None, description="Account ID of the reporter")
    labels: List[str] = Field(default_factory=list, description="Labels to attach to the issue")

    def to_jira_format(self, issue_type_id: str, priority_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Convert to Jira API format.

        Args:
            issue_type_id: ID of the issue type
            priority_id: ID of the priority (optional)

        Returns:
            Dictionary in Jira API format
        """
        fields: Dict[str, Any] = {
            "project": {"key": self.project_key},
            "summary": self.summary,
            "issuetype": {"id": issue_type_id},
        }

        if self.description:
            # Jira Cloud uses Atlassian Document Format (ADF)
            fields["description"] = {
                "type": "doc",
                "version": 1,
                "content": [
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": self.description}],
                    }
                ],
            }

        if priority_id:
            fields["priority"] = {"id": priority_id}

        if self.assignee_account_id:
            fields["assignee"] = {"accountId": self.assignee_account_id}

        if self.reporter_account_id:
            fields["reporter"] = {"accountId": self.reporter_account_id}

        if self.labels:
            fields["labels"] = self.labels

        return {"fields": fields}


class IssueUpdate(JiraBaseModel):
    """Model for updating an existing issue."""

    summary: Optional[str] = Field(None, description="Summary of the issue")
    description: Optional[str] = Field(None, description="Description of the issue")
    priority: Optional[str] = Field(None, description="Name of the priority")
    assignee_account_id: Optional[str] = Field(None, description="Account ID of the assignee")
    labels: Optional[List[str]] = Field(None, description="Labels to set on the issue")

    def to_jira_format(self, priority_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Convert to Jira API format.

        Args:
            priority_id: ID of the priority (if priority is being updated)

        Returns:
            Dictionary in Jira API format
        """
        fields: Dict[str, Any] = {}

        if self.summary is not None:
            fields["summary"] = self.summary

        if self.description is not None:
            fields["description"] = {
                "type": "doc",
                "version": 1,
                "content": [
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": self.description}],
                    }
                ],
            }

        if priority_id is not None:
            fields["priority"] = {"id": priority_id}

        if self.assignee_account_id is not None:
            fields["assignee"] = {"accountId": self.assignee_account_id}

        if self.labels is not None:
            fields["labels"] = self.labels

        return {"fields": fields}


class CommentCreate(JiraBaseModel):
    """Model for creating a comment."""

    body: str = Field(..., description="Body of the comment")

    def to_jira_format(self) -> Dict[str, Any]:
        """Convert to Jira API format (ADF)."""
        return {
            "body": {
                "type": "doc",
                "version": 1,
                "content": [
                    {
                        "type": "paragraph",
                        "content": [{"type": "text", "text": self.body}],
                    }
                ],
            }
        }
