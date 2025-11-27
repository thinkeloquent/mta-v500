"""
Jira API routes.

This module provides endpoints for interacting with Jira API using the unified jira-api package.
All 23 routes implement the complete SDK functionality.
"""

import os
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Body, Header

# Import the unified Jira API package
from jira_api import (
    JiraAPI,
    JiraAPIError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ValidationError,
    ConflictError,
    ServerError,
    NetworkError,
    TimeoutError,
)

# Import Jira models for request/response
from jira_api.issues.models import IssueCreate, IssueUpdate, CommentCreate
from jira_api.projects.models import ProjectVersionCreate

router = APIRouter(prefix="/api/jira", tags=["jira"])


# ===========================
# Dependency Injection
# ===========================

async def get_jira_api(
    x_jira_token: Optional[str] = Header(None, description="Jira API token (overrides environment variable)")
) -> JiraAPI:
    """
    Dependency to get Jira API client.

    Token priority:
    1. X-Jira-Token header (per-request override)
    2. JIRA_API_TOKEN environment variable (default)

    Raises:
        HTTPException: 401 if no token is provided
    """
    token = x_jira_token or os.environ.get('JIRA_API_TOKEN')

    if not token:
        raise HTTPException(
            status_code=401,
            detail="No Jira API token provided. Set JIRA_API_TOKEN environment variable or pass X-Jira-Token header."
        )

    async with JiraAPI(token=token) as api:
        yield api


# ===========================
# Health Check Endpoints
# ===========================

@router.get("/ping")
async def ping():
    """Ping endpoint to verify jira routes are loaded."""
    return {"message": "pong from jira"}


@router.get("/stats")
async def get_stats(api: JiraAPI = Depends(get_jira_api)):
    """Get API request statistics."""
    return api.get_stats()


# ===========================
# Issues API Endpoints
# ===========================

@router.get("/issues/{issue_key}")
async def get_issue(
    issue_key: str,
    api: JiraAPI = Depends(get_jira_api)
):
    """
    Get issue details by key.

    Args:
        issue_key: Issue key (e.g., 'PROJ-123')

    Returns:
        Complete issue object with fields, status, priority, etc.
    """
    try:
        issue = await api.issues.get(issue_key)
        return issue.model_dump()
    except NotFoundError:
        raise HTTPException(status_code=404, detail=f"Issue {issue_key} not found")
    except AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid Jira API token")
    except AuthorizationError:
        raise HTTPException(status_code=403, detail="Not authorized to access this issue")
    except JiraAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/issues")
async def create_issue(
    issue_data: IssueCreate,
    api: JiraAPI = Depends(get_jira_api)
):
    """
    Create a new issue.

    Args:
        issue_data: Issue creation data (project, summary, issue type, etc.)

    Returns:
        Created issue object
    """
    try:
        issue = await api.issues.create(issue_data)
        return issue.model_dump()
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except AuthorizationError:
        raise HTTPException(status_code=403, detail="Not authorized to create issues")
    except JiraAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/issues/{issue_key}")
async def update_issue(
    issue_key: str,
    update_data: IssueUpdate,
    api: JiraAPI = Depends(get_jira_api)
):
    """
    Update an existing issue.

    Args:
        issue_key: Issue key (e.g., 'PROJ-123')
        update_data: Fields to update

    Returns:
        Success status
    """
    try:
        result = await api.issues.update(issue_key, update_data)
        return {"status": "updated", "issue_key": issue_key}
    except NotFoundError:
        raise HTTPException(status_code=404, detail=f"Issue {issue_key} not found")
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except JiraAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/issues/{issue_key}")
async def delete_issue(
    issue_key: str,
    api: JiraAPI = Depends(get_jira_api)
):
    """
    Delete an issue.

    Args:
        issue_key: Issue key (e.g., 'PROJ-123')

    Returns:
        Success status
    """
    try:
        result = await api.issues.delete(issue_key)
        return {"status": "deleted", "issue_key": issue_key}
    except NotFoundError:
        raise HTTPException(status_code=404, detail=f"Issue {issue_key} not found")
    except AuthorizationError:
        raise HTTPException(status_code=403, detail="Not authorized to delete this issue")
    except JiraAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/issues/{issue_key}/transitions")
async def get_transitions(
    issue_key: str,
    api: JiraAPI = Depends(get_jira_api)
):
    """
    Get available transitions for an issue.

    Args:
        issue_key: Issue key (e.g., 'PROJ-123')

    Returns:
        List of available transitions
    """
    try:
        transitions = await api.issues.get_transitions(issue_key)
        return {
            "issue_key": issue_key,
            "count": len(transitions),
            "transitions": [t.model_dump() for t in transitions]
        }
    except NotFoundError:
        raise HTTPException(status_code=404, detail=f"Issue {issue_key} not found")
    except JiraAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/issues/{issue_key}/transitions")
async def transition_issue(
    issue_key: str,
    transition_name: str = Body(..., embed=True),
    comment: Optional[str] = Body(None, embed=True),
    api: JiraAPI = Depends(get_jira_api)
):
    """
    Transition an issue to a new status.

    Args:
        issue_key: Issue key (e.g., 'PROJ-123')
        transition_name: Name of the transition (e.g., 'In Progress', 'Done')
        comment: Optional comment to add with the transition

    Returns:
        Success status
    """
    try:
        result = await api.issues.transition(issue_key, transition_name, comment=comment)
        return {
            "status": "transitioned",
            "issue_key": issue_key,
            "transition": transition_name
        }
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except JiraAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/issues/{issue_key}/assignee")
async def assign_issue(
    issue_key: str,
    account_id: str = Body(..., embed=True, description="Account ID of the user to assign"),
    api: JiraAPI = Depends(get_jira_api)
):
    """
    Assign an issue to a user.

    Args:
        issue_key: Issue key (e.g., 'PROJ-123')
        account_id: Jira account ID of the assignee

    Returns:
        Success status
    """
    try:
        result = await api.issues.assign(issue_key, account_id)
        return {
            "status": "assigned",
            "issue_key": issue_key,
            "assignee_account_id": account_id
        }
    except NotFoundError:
        raise HTTPException(status_code=404, detail=f"Issue {issue_key} not found")
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except JiraAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/issues/{issue_key}/comments")
async def get_comments(
    issue_key: str,
    api: JiraAPI = Depends(get_jira_api)
):
    """
    Get all comments for an issue.

    Args:
        issue_key: Issue key (e.g., 'PROJ-123')

    Returns:
        List of comments
    """
    try:
        comments = await api.issues.get_comments(issue_key)
        return {
            "issue_key": issue_key,
            "count": len(comments),
            "comments": [c.model_dump() for c in comments]
        }
    except NotFoundError:
        raise HTTPException(status_code=404, detail=f"Issue {issue_key} not found")
    except JiraAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/issues/{issue_key}/comments")
async def add_comment(
    issue_key: str,
    comment_data: CommentCreate,
    api: JiraAPI = Depends(get_jira_api)
):
    """
    Add a comment to an issue.

    Args:
        issue_key: Issue key (e.g., 'PROJ-123')
        comment_data: Comment text and optional visibility settings

    Returns:
        Created comment object
    """
    try:
        comment = await api.issues.add_comment(issue_key, comment_data)
        return comment.model_dump()
    except NotFoundError:
        raise HTTPException(status_code=404, detail=f"Issue {issue_key} not found")
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except JiraAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/issues/{issue_key}/labels")
async def add_labels(
    issue_key: str,
    labels: List[str] = Body(..., embed=True, description="List of labels to add"),
    api: JiraAPI = Depends(get_jira_api)
):
    """
    Add labels to an issue.

    Args:
        issue_key: Issue key (e.g., 'PROJ-123')
        labels: List of label strings to add

    Returns:
        Success status
    """
    try:
        result = await api.issues.add_labels(issue_key, labels)
        return {
            "status": "labels_added",
            "issue_key": issue_key,
            "labels": labels
        }
    except NotFoundError:
        raise HTTPException(status_code=404, detail=f"Issue {issue_key} not found")
    except JiraAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/issues/{issue_key}/labels")
async def remove_labels(
    issue_key: str,
    labels: List[str] = Query(..., description="List of labels to remove"),
    api: JiraAPI = Depends(get_jira_api)
):
    """
    Remove labels from an issue.

    Args:
        issue_key: Issue key (e.g., 'PROJ-123')
        labels: List of label strings to remove

    Returns:
        Success status
    """
    try:
        result = await api.issues.remove_labels(issue_key, labels)
        return {
            "status": "labels_removed",
            "issue_key": issue_key,
            "labels": labels
        }
    except NotFoundError:
        raise HTTPException(status_code=404, detail=f"Issue {issue_key} not found")
    except JiraAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===========================
# Projects API Endpoints
# ===========================

@router.get("/projects")
async def list_projects(
    max_results: int = Query(50, ge=1, le=1000, description="Maximum number of projects to return"),
    start_at: int = Query(0, ge=0, description="Starting index for pagination"),
    api: JiraAPI = Depends(get_jira_api)
):
    """
    List all accessible projects.

    Args:
        max_results: Maximum number of results (1-1000)
        start_at: Starting index for pagination

    Returns:
        List of projects
    """
    try:
        projects = await api.projects.list(max_results=max_results, start_at=start_at)
        return {
            "count": len(projects),
            "max_results": max_results,
            "start_at": start_at,
            "projects": [p.model_dump() for p in projects]
        }
    except JiraAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/{project_key}")
async def get_project(
    project_key: str,
    expand: Optional[str] = Query(None, description="Comma-separated list of fields to expand (e.g., 'description,lead')"),
    api: JiraAPI = Depends(get_jira_api)
):
    """
    Get project details by key or ID.

    Args:
        project_key: Project key (e.g., 'PROJ') or ID
        expand: Optional fields to expand

    Returns:
        Project object with details
    """
    try:
        project = await api.projects.get(project_key, expand=expand)
        return project.model_dump()
    except NotFoundError:
        raise HTTPException(status_code=404, detail=f"Project {project_key} not found")
    except JiraAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/{project_key}/versions")
async def get_versions(
    project_key: str,
    api: JiraAPI = Depends(get_jira_api)
):
    """
    Get all versions for a project.

    Args:
        project_key: Project key (e.g., 'PROJ')

    Returns:
        List of project versions
    """
    try:
        versions = await api.projects.get_versions(project_key)
        return {
            "project_key": project_key,
            "count": len(versions),
            "versions": [v.model_dump() for v in versions]
        }
    except NotFoundError:
        raise HTTPException(status_code=404, detail=f"Project {project_key} not found")
    except JiraAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/projects/versions")
async def create_version(
    version_data: ProjectVersionCreate,
    api: JiraAPI = Depends(get_jira_api)
):
    """
    Create a new project version.

    Args:
        version_data: Version details (name, project key, release date, etc.)

    Returns:
        Created version object
    """
    try:
        version = await api.projects.create_version(version_data)
        return version.model_dump()
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Project not found")
    except JiraAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/{project_key}/components")
async def get_components(
    project_key: str,
    api: JiraAPI = Depends(get_jira_api)
):
    """
    Get all components for a project.

    Args:
        project_key: Project key (e.g., 'PROJ')

    Returns:
        List of project components
    """
    try:
        components = await api.projects.get_components(project_key)
        return {
            "project_key": project_key,
            "count": len(components),
            "components": [c.model_dump() for c in components]
        }
    except NotFoundError:
        raise HTTPException(status_code=404, detail=f"Project {project_key} not found")
    except JiraAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/{project_key}/issue-types")
async def get_issue_types(
    project_key: str,
    api: JiraAPI = Depends(get_jira_api)
):
    """
    Get all issue types available for a project.

    Args:
        project_key: Project key (e.g., 'PROJ')

    Returns:
        List of issue types
    """
    try:
        issue_types = await api.projects.get_issue_types(project_key)
        return {
            "project_key": project_key,
            "count": len(issue_types),
            "issue_types": [it.model_dump() for it in issue_types]
        }
    except NotFoundError:
        raise HTTPException(status_code=404, detail=f"Project {project_key} not found")
    except JiraAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===========================
# Users API Endpoints
# ===========================

@router.get("/users/{account_id}")
async def get_user(
    account_id: str,
    api: JiraAPI = Depends(get_jira_api)
):
    """
    Get user details by account ID.

    Args:
        account_id: Jira account ID

    Returns:
        User object
    """
    try:
        user = await api.users.get(account_id)
        return user.model_dump()
    except NotFoundError:
        raise HTTPException(status_code=404, detail=f"User {account_id} not found")
    except JiraAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/users/search")
async def search_users(
    query: str = Query(..., description="Search query (username, email, or display name)"),
    max_results: int = Query(50, ge=1, le=1000, description="Maximum number of users to return"),
    start_at: int = Query(0, ge=0, description="Starting index for pagination"),
    api: JiraAPI = Depends(get_jira_api)
):
    """
    Search for users.

    Args:
        query: Search query string
        max_results: Maximum number of results (1-1000)
        start_at: Starting index for pagination

    Returns:
        List of matching users
    """
    try:
        users = await api.users.search(query, max_results=max_results, start_at=start_at)
        return {
            "query": query,
            "count": len(users),
            "max_results": max_results,
            "start_at": start_at,
            "users": [u.model_dump() for u in users]
        }
    except JiraAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/users/assignable")
async def get_assignable_users(
    project: str = Query(..., description="Project key or ID"),
    query: Optional[str] = Query(None, description="Filter by username/display name"),
    max_results: int = Query(50, ge=1, le=1000, description="Maximum number of users to return"),
    api: JiraAPI = Depends(get_jira_api)
):
    """
    Get users that can be assigned to issues in a project.

    Args:
        project: Project key or ID
        query: Optional filter query
        max_results: Maximum number of results

    Returns:
        List of assignable users
    """
    try:
        users = await api.users.get_assignable(project, query=query, max_results=max_results)
        return {
            "project": project,
            "count": len(users),
            "max_results": max_results,
            "users": [u.model_dump() for u in users]
        }
    except NotFoundError:
        raise HTTPException(status_code=404, detail=f"Project {project} not found")
    except JiraAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/users/find-by-email")
async def find_user_by_email(
    email: str = Query(..., description="Email address to search for"),
    api: JiraAPI = Depends(get_jira_api)
):
    """
    Find a user by email address.

    Args:
        email: Email address

    Returns:
        User object if found
    """
    try:
        user = await api.users.find_by_email(email)
        if user:
            return user.model_dump()
        else:
            raise HTTPException(status_code=404, detail=f"No user found with email {email}")
    except JiraAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))
