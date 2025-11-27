"""
Figma API routes.

This module provides endpoints for interacting with Figma API using the unified figma-api package.
"""

import os
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from pydantic import BaseModel, Field
import httpx
from tenacity import RetryError

# Import the unified Figma API package
from figma_api import (
    FigmaAPI,
    FigmaAPIError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ValidationError,
)

router = APIRouter(prefix="/api/figma", tags=["figma"])


# ===========================
# Dependency Injection
# ===========================

async def get_figma_api() -> FigmaAPI:
    """
    Dependency to get Figma API client.

    Token is automatically loaded from FIGMA_TOKEN environment variable.
    """
    async with FigmaAPI(token=os.environ.get('FIGMA_TOKEN')) as api:
        yield api


# ===========================
# Request/Response Models
# ===========================

class CommentCreateRequest(BaseModel):
    """Request model for creating a comment."""
    message: str = Field(..., description="Comment text")
    parent_id: Optional[str] = Field(None, description="Parent comment ID for replies")
    x: Optional[float] = Field(None, description="X coordinate on canvas")
    y: Optional[float] = Field(None, description="Y coordinate on canvas")
    node_ids: Optional[List[str]] = Field(None, description="List of node IDs")


class ReactionRequest(BaseModel):
    """Request model for adding a reaction."""
    emoji: str = Field(..., description="Emoji to react with (e.g., '👍', '🎉')")


class WebhookCreateRequest(BaseModel):
    """Request model for creating a webhook."""
    event_type: str = Field(..., description="Event type (FILE_UPDATE, FILE_VERSION_UPDATE, etc.)")
    team_id: str = Field(..., description="Team ID")
    endpoint: str = Field(..., description="HTTPS endpoint URL")
    passcode: str = Field(..., description="Secret passcode for verification")
    description: str = Field("", description="Optional description")


class WebhookUpdateRequest(BaseModel):
    """Request model for updating a webhook."""
    endpoint: Optional[str] = None
    passcode: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = Field(None, description="Status: ACTIVE or PAUSED")


class DevResourceRequest(BaseModel):
    """Request model for creating a dev resource."""
    node_id: str = Field(..., description="Node ID to attach resource to")
    name: str = Field(..., description="Resource name")
    url: str = Field(..., description="Resource URL")


# ===========================
# Health Check Endpoints
# ===========================

@router.get("/ping")
async def ping():
    """Ping endpoint to verify figma routes are loaded."""
    return {"message": "pong from figma"}


@router.get("/status")
async def status():
    """Get Figma integration status."""
    return {
        "service": "figma",
        "status": "active",
        "description": "Figma API integration routes using unified figma-api package",
        "version": "1.0.0"
    }


@router.get("/stats")
async def get_stats(api: FigmaAPI = Depends(get_figma_api)):
    """Get API request statistics."""
    return api.get_stats()


# ===========================
# Files API Endpoints
# ===========================

def serialize_node(node) -> dict:
    """
    Recursively serialize a Figma node and its children.

    Args:
        node: Figma node object

    Returns:
        Dictionary with node data including nested children
    """
    result = {
        "id": node.id,
        "name": node.name,
        "type": node.type,
    }

    # Add children if they exist
    if hasattr(node, 'children') and node.children:
        result["children"] = [serialize_node(child) for child in node.children]

    return result


def find_node_by_id(node, node_id: str):
    """
    Recursively search for a node by ID in the document tree.

    Args:
        node: Root node to search from
        node_id: ID of the node to find

    Returns:
        Node object if found, None otherwise
    """
    if node.id == node_id:
        return node

    if hasattr(node, 'children') and node.children:
        for child in node.children:
            found = find_node_by_id(child, node_id)
            if found:
                return found

    return None


def serialize_node_with_properties(node) -> dict:
    """
    Serialize a node with all its properties for detailed inspection.

    Args:
        node: Figma node object

    Returns:
        Dictionary with full node data including all available properties
    """
    # Start with basic properties
    result = {
        "id": node.id,
        "name": node.name,
        "type": node.type,
    }

    # Add all other attributes from the node
    # This captures bounds, fills, strokes, effects, etc.
    node_dict = node.model_dump() if hasattr(node, 'model_dump') else {}
    result.update(node_dict)

    return result


@router.get("/files/{file_key}")
async def get_file(
    file_key: str,
    version: Optional[str] = Query(None, description="Specific version ID"),
    depth: Optional[int] = Query(None, description="Depth of node tree to return"),
    api: FigmaAPI = Depends(get_figma_api)
):
    """
    Get complete Figma file structure.

    Returns file metadata and full document tree.
    """
    try:
        file = await api.files.get(file_key, version=version, depth=depth)

        # Return in the format expected by the frontend
        return {
            "success": True,
            "data": {
                "name": file.name,
                "version": file.version,
                "lastModified": file.last_modified.isoformat(),
                "thumbnailUrl": file.thumbnail_url,
                "editorType": file.editor_type,
                "document": serialize_node(file.document)
            }
        }
    except NotFoundError:
        raise HTTPException(status_code=404, detail="File not found or you don't have access")
    except AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid Figma token")
    except FigmaAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


def format_properties_for_display(node_data: dict) -> dict:
    """
    Format node properties to match frontend expectations.

    Frontend expects properties in format: {"key": {"value": "..."}}
    This function transforms flat key-value pairs into this nested format.

    Args:
        node_data: Raw node data dictionary

    Returns:
        Formatted properties dictionary
    """
    formatted = {}
    # Exclude basic node structure fields that aren't visual properties
    exclude_fields = {'id', 'name', 'type', 'children', 'characters'}

    for key, value in node_data.items():
        if key not in exclude_fields and value is not None:
            # Convert value to string representation for display
            if isinstance(value, (list, dict)):
                formatted[key] = {"value": str(value)}
            elif isinstance(value, bool):
                formatted[key] = {"value": "true" if value else "false"}
            elif isinstance(value, (int, float)):
                formatted[key] = {"value": str(value)}
            else:
                formatted[key] = {"value": str(value)}

    return formatted


@router.get("/node/{file_key}/{node_id}")
async def get_node_details(
    file_key: str,
    node_id: str,
    api: FigmaAPI = Depends(get_figma_api)
):
    """
    Get specific node details with all properties.

    Returns detailed information about a specific node including all its visual properties,
    layout information, and any applied styles.
    """
    try:
        # Get the full file to access the document tree
        file = await api.files.get(file_key)

        # Find the specific node in the document tree
        node = find_node_by_id(file.document, node_id)

        if not node:
            raise HTTPException(
                status_code=404,
                detail=f"Node {node_id} not found in file {file_key}"
            )

        # Serialize the node with all its properties
        node_data = serialize_node_with_properties(node)

        return {
            "success": True,
            "data": {
                "node": node_data,
                "properties": format_properties_for_display(node_data)
            }
        }
    except HTTPException:
        raise
    except NotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except FigmaAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/files/{file_key}/nodes")
async def get_nodes(
    file_key: str,
    node_ids: List[str] = Query(..., description="List of node IDs to retrieve"),
    api: FigmaAPI = Depends(get_figma_api)
):
    """Get specific nodes from a file."""
    try:
        nodes = await api.files.get_nodes(file_key, node_ids)
        return {
            "name": nodes.name,
            "lastModified": nodes.last_modified.isoformat(),
            "nodes": nodes.nodes
        }
    except NotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except FigmaAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/images/{file_key}")
async def get_component_images(
    file_key: str,
    nodeIds: str = Query(..., description="Comma-separated node IDs"),
    scale: float = Query(2.0, ge=0.01, le=4.0, description="Image scale"),
    format: str = Query("png", description="Image format: png, jpg, svg, pdf"),
    api: FigmaAPI = Depends(get_figma_api)
):
    """
    Get rendered component images.

    Returns map of node IDs to image URLs.
    This endpoint matches the frontend API client format.
    """
    try:
        # Parse comma-separated node IDs
        node_ids_list = [nid.strip() for nid in nodeIds.split(",") if nid.strip()]

        if not node_ids_list:
            raise HTTPException(status_code=400, detail="nodeIds parameter cannot be empty")

        images = await api.files.get_images(
            file_key,
            node_ids_list,
            scale=scale,
            format=format
        )

        return {
            "success": True,
            "data": {
                "images": images.images,
                "error": images.err
            }
        }
    except NotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except FigmaAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/files/{file_key}/images")
async def render_images(
    file_key: str,
    node_ids: List[str] = Query(..., description="Node IDs to render"),
    scale: float = Query(1.0, ge=0.01, le=4.0, description="Scale factor (0.01-4.0)"),
    format: str = Query("png", description="Image format: png, jpg, svg, pdf"),
    api: FigmaAPI = Depends(get_figma_api)
):
    """
    Render nodes as images (alternative endpoint with array parameter).

    Returns URLs to download rendered images.
    """
    try:
        images = await api.files.get_images(
            file_key,
            node_ids,
            scale=scale,
            format=format
        )
        return {
            "images": images.images,
            "error": images.err
        }
    except NotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except FigmaAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/files/{file_key}/versions")
async def get_versions(
    file_key: str,
    api: FigmaAPI = Depends(get_figma_api)
):
    """Get version history for a file."""
    try:
        versions = await api.files.get_versions(file_key)
        return {
            "count": len(versions),
            "versions": versions
        }
    except NotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except FigmaAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===========================
# Comments API Endpoints
# ===========================

@router.get("/files/{file_key}/comments")
async def list_comments(
    file_key: str,
    as_md: bool = Query(False, description="Return message as markdown"),
    api: FigmaAPI = Depends(get_figma_api)
):
    """List all comments on a file."""
    try:
        comments = await api.comments.list(file_key, as_md=as_md)
        return {
            "count": len(comments),
            "comments": [
                {
                    "id": c.id,
                    "user": {
                        "id": c.user.id,
                        "handle": c.user.handle,
                        "img_url": c.user.img_url,
                    },
                    "message": c.message,
                    "created_at": c.created_at.isoformat(),
                    "resolved_at": c.resolved_at.isoformat() if c.resolved_at else None,
                    "parent_id": c.parent_id,
                }
                for c in comments
            ]
        }
    except NotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except FigmaAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/files/{file_key}/comments")
async def create_comment(
    file_key: str,
    request: CommentCreateRequest,
    api: FigmaAPI = Depends(get_figma_api)
):
    """
    Create a new comment or reply.

    Provide x, y coordinates to place comment at specific position.
    Provide parent_id to create a reply.
    """
    try:
        client_meta = None
        if request.x is not None and request.y is not None:
            client_meta = {"x": request.x, "y": request.y}
            if request.node_ids:
                client_meta["node_id"] = request.node_ids

        comment = await api.comments.create(
            file_key,
            request.message,
            comment_id=request.parent_id,
            client_meta=client_meta,
        )

        return {
            "id": comment.id,
            "message": comment.message,
            "user": comment.user.handle,
            "created_at": comment.created_at.isoformat(),
        }
    except FigmaAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/files/{file_key}/comments/{comment_id}")
async def delete_comment(
    file_key: str,
    comment_id: str,
    api: FigmaAPI = Depends(get_figma_api)
):
    """Delete a comment."""
    try:
        result = await api.comments.delete(file_key, comment_id)
        return result
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Comment not found")
    except FigmaAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/files/{file_key}/comments/{comment_id}/reactions")
async def get_reactions(
    file_key: str,
    comment_id: str,
    api: FigmaAPI = Depends(get_figma_api)
):
    """Get reactions for a comment."""
    try:
        reactions = await api.comments.get_reactions(file_key, comment_id)
        return {
            "count": len(reactions),
            "reactions": [
                {
                    "emoji": r.emoji,
                    "user": r.user.handle,
                    "created_at": r.created_at.isoformat(),
                }
                for r in reactions
            ]
        }
    except FigmaAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/files/{file_key}/comments/{comment_id}/reactions")
async def add_reaction(
    file_key: str,
    comment_id: str,
    request: ReactionRequest,
    api: FigmaAPI = Depends(get_figma_api)
):
    """Add a reaction to a comment."""
    try:
        result = await api.comments.add_reaction(file_key, comment_id, request.emoji)
        return {"status": "success", "emoji": request.emoji}
    except FigmaAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/files/{file_key}/comments/{comment_id}/reactions")
async def remove_reaction(
    file_key: str,
    comment_id: str,
    emoji: str = Query(..., description="Emoji to remove"),
    api: FigmaAPI = Depends(get_figma_api)
):
    """Remove a reaction from a comment."""
    try:
        result = await api.comments.remove_reaction(file_key, comment_id, emoji)
        return {"status": "success"}
    except FigmaAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===========================
# Components API Endpoints
# ===========================

@router.get("/components/{component_key}")
async def get_component(
    component_key: str,
    api: FigmaAPI = Depends(get_figma_api)
):
    """Get component metadata."""
    try:
        component = await api.components.get(component_key)
        return component.model_dump()
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Component not found")
    except FigmaAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/component-sets/{component_set_key}")
async def get_component_set(
    component_set_key: str,
    api: FigmaAPI = Depends(get_figma_api)
):
    """Get component set metadata."""
    try:
        comp_set = await api.components.get_set(component_set_key)
        return comp_set
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Component set not found")
    except FigmaAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/teams/{team_id}/components")
async def get_team_components(
    team_id: str,
    api: FigmaAPI = Depends(get_figma_api)
):
    """Get all components for a team."""
    try:
        components = await api.components.get_team_components(team_id)
        return components.model_dump()
    except FigmaAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===========================
# Projects API Endpoints
# ===========================

@router.get("/teams/{team_id}/projects")
async def list_projects(
    team_id: str,
    api: FigmaAPI = Depends(get_figma_api)
):
    """List all projects in a team."""
    try:
        projects = await api.projects.list_team_projects(team_id)
        return {
            "count": len(projects),
            "projects": [
                {"id": p.id, "name": p.name}
                for p in projects
            ]
        }
    except FigmaAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/{project_id}/files")
async def list_project_files(
    project_id: str,
    api: FigmaAPI = Depends(get_figma_api)
):
    """List all files in a project."""
    try:
        files = await api.projects.get_files(project_id)
        return {
            "count": len(files),
            "files": [
                {
                    "key": f.key,
                    "name": f.name,
                    "thumbnail_url": f.thumbnail_url,
                    "last_modified": f.last_modified.isoformat(),
                }
                for f in files
            ]
        }
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Project not found")
    except FigmaAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===========================
# Variables API Endpoints
# ===========================

@router.get("/variables/{file_key}")
async def get_variables(
    file_key: str,
    api: FigmaAPI = Depends(get_figma_api)
):
    """
    Get all variables from a file (both local and published).

    This is a convenience endpoint that combines both local and published variables.
    Returns partial data if only one type is accessible due to permissions.
    """
    local_vars = None
    published_vars = None
    local_error = None
    published_error = None

    # Try to get local variables
    try:
        local_vars = await api.variables.get_local(file_key)
    except RetryError as e:
        # Unwrap the original exception from the retry error
        original_exc = e.last_attempt.exception()
        if isinstance(original_exc, httpx.HTTPStatusError):
            if original_exc.response.status_code == 403:
                local_error = "Access denied: Your Figma token doesn't have permission to access local variables for this file."
            else:
                local_error = f"HTTP {original_exc.response.status_code}: {str(original_exc)}"
        else:
            local_error = str(original_exc)
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 403:
            local_error = "Access denied: Your Figma token doesn't have permission to access local variables for this file."
        else:
            local_error = f"HTTP {e.response.status_code}: {str(e)}"
    except AuthorizationError:
        local_error = "Access denied: Your Figma token doesn't have permission to access local variables for this file."
    except NotFoundError:
        local_error = "File not found"
    except FigmaAPIError as e:
        local_error = str(e)

    # Try to get published variables
    try:
        published_vars = await api.variables.get_published(file_key)
    except RetryError as e:
        # Unwrap the original exception from the retry error
        original_exc = e.last_attempt.exception()
        if isinstance(original_exc, httpx.HTTPStatusError):
            if original_exc.response.status_code == 403:
                published_error = "Access denied: Your Figma token doesn't have permission to access published variables for this file."
            else:
                published_error = f"HTTP {original_exc.response.status_code}: {str(original_exc)}"
        else:
            published_error = str(original_exc)
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 403:
            published_error = "Access denied: Your Figma token doesn't have permission to access published variables for this file."
        else:
            published_error = f"HTTP {e.response.status_code}: {str(e)}"
    except AuthorizationError:
        published_error = "Access denied: Your Figma token doesn't have permission to access published variables for this file."
    except NotFoundError:
        published_error = "File not found"
    except FigmaAPIError as e:
        published_error = str(e)

    # If both failed with not found, return 404
    if local_error == "File not found" and published_error == "File not found":
        raise HTTPException(status_code=404, detail="File not found")

    # Always return 200 OK with error information in the response body
    # This allows the UI to continue functioning even if variables aren't accessible
    data = {
        "local": None,
        "published": None,
        "errors": {}
    }

    if local_vars:
        data["local"] = local_vars.model_dump()
    elif local_error:
        data["errors"]["local"] = local_error

    if published_vars:
        data["published"] = {
            "variables": {k: v.model_dump() for k, v in published_vars.variables.items()},
            "variable_collections": {k: v.model_dump() for k, v in published_vars.variable_collections.items()},
        }
    elif published_error:
        data["errors"]["published"] = published_error

    # Add a helpful message if both failed
    has_data = local_vars is not None or published_vars is not None
    if not has_data:
        data["message"] = "Variables are not accessible. Your Figma token may not have the required permissions."
        data["help"] = "Check that your Figma token has 'file_variables:read' scope and you have access to this file."

    # Return in the format expected by the frontend
    return {
        "success": has_data,
        "data": data
    }


@router.get("/files/{file_key}/variables/local")
async def get_local_variables(
    file_key: str,
    api: FigmaAPI = Depends(get_figma_api)
):
    """Get all local variables from a file."""
    try:
        vars_data = await api.variables.get_local(file_key)
        return vars_data.model_dump()
    except NotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except FigmaAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/files/{file_key}/variables/published")
async def get_published_variables(
    file_key: str,
    api: FigmaAPI = Depends(get_figma_api)
):
    """Get all published variables from a file."""
    try:
        vars_data = await api.variables.get_published(file_key)
        return {
            "variables": {k: v.model_dump() for k, v in vars_data.variables.items()},
            "variable_collections": {k: v.model_dump() for k, v in vars_data.variable_collections.items()},
        }
    except NotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except FigmaAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===========================
# Webhooks API Endpoints
# ===========================

@router.post("/webhooks")
async def create_webhook(
    request: WebhookCreateRequest,
    api: FigmaAPI = Depends(get_figma_api)
):
    """Create a new webhook."""
    try:
        webhook = await api.webhooks.create(
            event_type=request.event_type,
            team_id=request.team_id,
            endpoint=request.endpoint,
            passcode=request.passcode,
            description=request.description,
        )
        return {
            "id": webhook.id,
            "event_type": webhook.event_type,
            "endpoint": webhook.endpoint,
            "status": webhook.status,
        }
    except FigmaAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/teams/{team_id}/webhooks")
async def list_webhooks(
    team_id: str,
    api: FigmaAPI = Depends(get_figma_api)
):
    """List all webhooks for a team."""
    try:
        webhooks = await api.webhooks.list(team_id)
        return {
            "count": len(webhooks),
            "webhooks": [
                {
                    "id": w.id,
                    "event_type": w.event_type,
                    "endpoint": w.endpoint,
                    "status": w.status,
                    "description": w.description,
                }
                for w in webhooks
            ]
        }
    except FigmaAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/webhooks/{webhook_id}")
async def update_webhook(
    webhook_id: str,
    request: WebhookUpdateRequest,
    api: FigmaAPI = Depends(get_figma_api)
):
    """Update a webhook."""
    try:
        webhook = await api.webhooks.update(
            webhook_id,
            endpoint=request.endpoint,
            passcode=request.passcode,
            description=request.description,
            status=request.status,
        )
        return {
            "id": webhook.id,
            "event_type": webhook.event_type,
            "endpoint": webhook.endpoint,
            "status": webhook.status,
        }
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Webhook not found")
    except FigmaAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/webhooks/{webhook_id}")
async def delete_webhook(
    webhook_id: str,
    api: FigmaAPI = Depends(get_figma_api)
):
    """Delete a webhook."""
    try:
        result = await api.webhooks.delete(webhook_id)
        return {"status": "deleted"}
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Webhook not found")
    except FigmaAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===========================
# Dev Resources API Endpoints
# ===========================

@router.get("/files/{file_key}/dev-resources")
async def list_dev_resources(
    file_key: str,
    node_id: Optional[str] = Query(None, description="Filter by node ID"),
    api: FigmaAPI = Depends(get_figma_api)
):
    """List dev resources for a file or specific node."""
    try:
        resources = await api.dev_resources.list(file_key, node_id=node_id)
        return {
            "count": len(resources),
            "dev_resources": [
                {
                    "id": r.id,
                    "name": r.name,
                    "url": r.url,
                    "node_id": r.node_id,
                }
                for r in resources
            ]
        }
    except NotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except FigmaAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/files/{file_key}/dev-resources")
async def create_dev_resource(
    file_key: str,
    request: DevResourceRequest,
    api: FigmaAPI = Depends(get_figma_api)
):
    """Create a new dev resource."""
    try:
        resource = await api.dev_resources.create(
            file_key,
            request.node_id,
            request.name,
            request.url,
        )
        return {
            "id": resource.id,
            "name": resource.name,
            "url": resource.url,
            "node_id": resource.node_id,
        }
    except FigmaAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/files/{file_key}/dev-resources/{resource_id}")
async def update_dev_resource(
    file_key: str,
    resource_id: str,
    name: Optional[str] = Body(None),
    url: Optional[str] = Body(None),
    api: FigmaAPI = Depends(get_figma_api)
):
    """Update a dev resource."""
    try:
        resource = await api.dev_resources.update(file_key, resource_id, name=name, url=url)
        return {
            "id": resource.id,
            "name": resource.name,
            "url": resource.url,
        }
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Dev resource not found")
    except FigmaAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/files/{file_key}/dev-resources/{resource_id}")
async def delete_dev_resource(
    file_key: str,
    resource_id: str,
    api: FigmaAPI = Depends(get_figma_api)
):
    """Delete a dev resource."""
    try:
        result = await api.dev_resources.delete(file_key, resource_id)
        return {"status": "deleted"}
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Dev resource not found")
    except FigmaAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===========================
# Library Analytics API Endpoints
# ===========================

@router.get("/files/{file_key}/library-analytics/component-usage")
async def get_component_usage(
    file_key: str,
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze (1-365)"),
    api: FigmaAPI = Depends(get_figma_api)
):
    """
    Get component usage analytics for a file.

    Returns usage data for the specified time period.
    """
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        usage = await api.library_analytics.get_component_usage(
            file_key,
            start_date,
            end_date
        )

        return {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "days": days,
            },
            "count": len(usage),
            "component_usage": [
                {
                    "component_key": u.component_key,
                    "component_name": u.component_name,
                    "user_count": u.user_count,
                    "instance_count": u.instance_count,
                    "insert_count": u.insert_count,
                    "detach_count": u.detach_count,
                }
                for u in usage
            ]
        }
    except NotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except FigmaAPIError as e:
        raise HTTPException(status_code=500, detail=str(e))
