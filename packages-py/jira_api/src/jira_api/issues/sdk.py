"""Issues API SDK for Jira."""

from typing import Any, Dict, List, Optional

from jira_api.client import JiraHttpClient
from jira_api.issues.models import (
    Comment,
    CommentCreate,
    Issue,
    IssueCreate,
    IssueTransition,
    IssueUpdate,
)


class IssuesAPI:
    """
    Issues API for Jira operations.

    Provides comprehensive methods for issue management including CRUD operations,
    transitions, comments, and assignments.
    """

    def __init__(self, client: JiraHttpClient):
        """
        Initialize Issues API.

        Args:
            client: Configured Jira HTTP client
        """
        self.client = client

    async def get(
        self,
        issue_key: str,
        fields: Optional[List[str]] = None,
        expand: Optional[List[str]] = None,
    ) -> Issue:
        """
        Get issue details by key.

        Args:
            issue_key: Issue key (e.g., "PROJ-123")
            fields: List of fields to include (default: all)
            expand: List of fields to expand (e.g., ["changelog", "renderedFields"])

        Returns:
            Issue object

        Example:
            >>> issue = await jira.issues.get("PROJ-123")
            >>> print(f"{issue.key}: {issue.fields.summary}")
        """
        params: Dict[str, Any] = {}

        if fields:
            params["fields"] = ",".join(fields)

        if expand:
            params["expand"] = ",".join(expand)

        response = await self.client.get(f"issue/{issue_key}", params=params)
        return Issue(**response)

    async def create(
        self,
        issue_data: IssueCreate,
    ) -> Issue:
        """
        Create a new issue.

        Args:
            issue_data: Issue creation data

        Returns:
            Created Issue object

        Example:
            >>> from jira_api.issues import IssueCreate
            >>> issue_data = IssueCreate(
            >>>     project_key="PROJ",
            >>>     summary="Bug in authentication",
            >>>     issue_type="Bug",
            >>>     description="Users cannot log in",
            >>>     labels=["bug", "critical"]
            >>> )
            >>> issue = await jira.issues.create(issue_data)
        """
        # First, get the project to find issue type ID
        project_response = await self.client.get(
            f"project/{issue_data.project_key}",
            params={"expand": "issueTypes"}
        )

        # Find issue type ID by name
        issue_type_id = None
        priority_id = None

        if "issueTypes" in project_response:
            for it in project_response["issueTypes"]:
                if it["name"].lower() == issue_data.issue_type.lower():
                    issue_type_id = it["id"]
                    break

        if not issue_type_id:
            raise ValueError(
                f"Issue type '{issue_data.issue_type}' not found in project {issue_data.project_key}"
            )

        # Get priority ID if specified
        if issue_data.priority:
            priorities_response = await self.client.get("priority")
            if isinstance(priorities_response, list):
                for p in priorities_response:
                    if p["name"].lower() == issue_data.priority.lower():
                        priority_id = p["id"]
                        break

        # Convert to Jira format and create
        payload = issue_data.to_jira_format(issue_type_id, priority_id)
        response = await self.client.post("issue", json=payload)

        # Fetch the created issue to return full details
        if "key" in response:
            return await self.get(response["key"])

        raise ValueError("Failed to create issue - no key returned")

    async def update(
        self,
        issue_key: str,
        update_data: IssueUpdate,
    ) -> None:
        """
        Update an existing issue.

        Args:
            issue_key: Issue key (e.g., "PROJ-123")
            update_data: Issue update data

        Example:
            >>> from jira_api.issues import IssueUpdate
            >>> update_data = IssueUpdate(
            >>>     summary="Updated summary",
            >>>     description="Updated description"
            >>> )
            >>> await jira.issues.update("PROJ-123", update_data)
        """
        # Get priority ID if specified
        priority_id = None
        if update_data.priority:
            priorities_response = await self.client.get("priority")
            if isinstance(priorities_response, list):
                for p in priorities_response:
                    if p["name"].lower() == update_data.priority.lower():
                        priority_id = p["id"]
                        break

        payload = update_data.to_jira_format(priority_id)
        await self.client.put(f"issue/{issue_key}", json=payload)

    async def delete(self, issue_key: str) -> None:
        """
        Delete an issue.

        Args:
            issue_key: Issue key (e.g., "PROJ-123")

        Example:
            >>> await jira.issues.delete("PROJ-123")
        """
        await self.client.delete(f"issue/{issue_key}")

    async def get_transitions(self, issue_key: str) -> List[IssueTransition]:
        """
        Get available transitions for an issue.

        Args:
            issue_key: Issue key

        Returns:
            List of IssueTransition objects

        Example:
            >>> transitions = await jira.issues.get_transitions("PROJ-123")
            >>> for transition in transitions:
            >>>     print(f"{transition.name} -> {transition.to.name}")
        """
        response = await self.client.get(f"issue/{issue_key}/transitions")

        if "transitions" in response:
            return [IssueTransition(**t) for t in response["transitions"]]
        return []

    async def transition(
        self,
        issue_key: str,
        transition_name: str,
        comment: Optional[str] = None,
    ) -> None:
        """
        Transition an issue to a new status.

        Args:
            issue_key: Issue key
            transition_name: Name of the transition (e.g., "In Progress", "Done")
            comment: Optional comment to add with the transition

        Example:
            >>> await jira.issues.transition(
            >>>     "PROJ-123",
            >>>     "In Progress",
            >>>     comment="Starting work on this issue"
            >>> )
        """
        # Get available transitions
        transitions = await self.get_transitions(issue_key)

        # Find transition ID by name
        transition_id = None
        for transition in transitions:
            if transition.name.lower() == transition_name.lower():
                transition_id = transition.id
                break

        if not transition_id:
            raise ValueError(
                f"Transition '{transition_name}' not available for issue {issue_key}"
            )

        # Prepare payload
        payload: Dict[str, Any] = {
            "transition": {"id": transition_id}
        }

        # Add comment if provided
        if comment:
            payload["update"] = {
                "comment": [
                    {
                        "add": {
                            "body": {
                                "type": "doc",
                                "version": 1,
                                "content": [
                                    {
                                        "type": "paragraph",
                                        "content": [{"type": "text", "text": comment}],
                                    }
                                ],
                            }
                        }
                    }
                ]
            }

        await self.client.post(f"issue/{issue_key}/transitions", json=payload)

    async def assign(
        self,
        issue_key: str,
        account_id: Optional[str] = None,
    ) -> None:
        """
        Assign an issue to a user.

        Args:
            issue_key: Issue key
            account_id: Account ID of the assignee (None to unassign)

        Example:
            >>> # Assign to user
            >>> await jira.issues.assign("PROJ-123", "5b10a2844c20165700ede21g")
            >>>
            >>> # Unassign
            >>> await jira.issues.assign("PROJ-123", None)
        """
        payload = {"accountId": account_id} if account_id else {"accountId": None}
        await self.client.put(f"issue/{issue_key}/assignee", json=payload)

    async def add_comment(
        self,
        issue_key: str,
        comment: str,
    ) -> Comment:
        """
        Add a comment to an issue.

        Args:
            issue_key: Issue key
            comment: Comment text

        Returns:
            Created Comment object

        Example:
            >>> comment = await jira.issues.add_comment(
            >>>     "PROJ-123",
            >>>     "This is a comment"
            >>> )
        """
        comment_data = CommentCreate(body=comment)
        payload = comment_data.to_jira_format()
        response = await self.client.post(f"issue/{issue_key}/comment", json=payload)
        return Comment(**response)

    async def get_comments(self, issue_key: str) -> List[Comment]:
        """
        Get all comments for an issue.

        Args:
            issue_key: Issue key

        Returns:
            List of Comment objects

        Example:
            >>> comments = await jira.issues.get_comments("PROJ-123")
            >>> for comment in comments:
            >>>     print(f"{comment.author.display_name}: {comment.body}")
        """
        response = await self.client.get(f"issue/{issue_key}/comment")

        if "comments" in response:
            return [Comment(**c) for c in response["comments"]]
        return []

    async def add_labels(
        self,
        issue_key: str,
        labels: List[str],
    ) -> None:
        """
        Add labels to an issue.

        Args:
            issue_key: Issue key
            labels: List of labels to add

        Example:
            >>> await jira.issues.add_labels("PROJ-123", ["bug", "urgent"])
        """
        payload = {
            "update": {
                "labels": [{"add": label} for label in labels]
            }
        }
        await self.client.put(f"issue/{issue_key}", json=payload)

    async def remove_labels(
        self,
        issue_key: str,
        labels: List[str],
    ) -> None:
        """
        Remove labels from an issue.

        Args:
            issue_key: Issue key
            labels: List of labels to remove

        Example:
            >>> await jira.issues.remove_labels("PROJ-123", ["wontfix"])
        """
        payload = {
            "update": {
                "labels": [{"remove": label} for label in labels]
            }
        }
        await self.client.put(f"issue/{issue_key}", json=payload)
