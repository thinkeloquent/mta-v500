"""
Tests for health check endpoints.
"""
import pytest
from fastapi import status


def test_health_check(client):
    """Test the /health endpoint."""
    response = client.get("/health")

    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert data["status"] == "ok"
    assert "timestamp" in data
    assert "version" in data
    assert data["version"] == "1.0.0"


def test_root_endpoint(client):
    """Test the / (root) endpoint."""
    response = client.get("/")

    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert data["name"] == "AWS S3 Admin API"
    assert data["version"] == "1.0.0"
    assert "description" in data
    assert data["docs"] == "/docs"
    assert data["redoc"] == "/redoc"
