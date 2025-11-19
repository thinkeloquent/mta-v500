"""Pytest configuration and fixtures."""
import os
import pytest
from unittest.mock import AsyncMock, Mock
import httpx

from figma_api import FigmaAPI
from figma_api.client import FigmaHttpClient


@pytest.fixture
def figma_token():
    """Get Figma token from environment or use test token."""
    return os.environ.get("FIGMA_TOKEN", "test-token-123")


@pytest.fixture
def mock_httpx_client():
    """Mock httpx.AsyncClient."""
    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_client.request = AsyncMock()
    return mock_client


@pytest.fixture
async def figma_client(figma_token):
    """Create Figma HTTP client."""
    async with FigmaHttpClient(token=figma_token) as client:
        yield client


@pytest.fixture
async def figma_api(figma_token):
    """Create Figma API instance."""
    async with FigmaAPI(token=figma_token) as api:
        yield api


@pytest.fixture
def mock_file_response():
    """Mock file API response."""
    return {
        "name": "Test File",
        "role": "owner",
        "lastModified": "2024-01-01T00:00:00Z",
        "editorType": "figma",
        "thumbnailUrl": "https://example.com/thumb.png",
        "version": "123456",
        "document": {
            "id": "0:0",
            "name": "Document",
            "type": "DOCUMENT",
            "children": [],
        },
        "schemaVersion": 0,
    }


@pytest.fixture
def mock_comments_response():
    """Mock comments API response."""
    return {
        "comments": [
            {
                "id": "123",
                "file_key": "abc123",
                "parent_id": None,
                "user": {
                    "id": "user1",
                    "handle": "testuser",
                    "img_url": "https://example.com/avatar.png",
                },
                "created_at": "2024-01-01T00:00:00Z",
                "resolved_at": None,
                "message": "Test comment",
                "client_meta": {"x": 100, "y": 200},
            }
        ]
    }


@pytest.fixture
def mock_projects_response():
    """Mock projects API response."""
    return {
        "projects": [
            {"id": "123", "name": "Test Project"},
            {"id": "456", "name": "Another Project"},
        ]
    }
