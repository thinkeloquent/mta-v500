"""Tests for hello sub-app."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_hello_root():
    """Test the root hello endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello World!"}


def test_hello_endpoint():
    """Test the hello endpoint."""
    response = client.get("/hello")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello from FastAPI!"}


def test_hello_name():
    """Test the personalized hello endpoint."""
    response = client.get("/hello/Claude")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello Claude!"}


def test_health():
    """Test the health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "hello"
