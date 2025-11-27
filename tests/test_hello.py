"""Tests for the main orchestrator and mounted sub-apps."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root():
    """Test the root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Multi-App Orchestrator"
    assert "sub_apps" in data
    assert "docs" in data
    assert "health" in data


def test_health():
    """Test the orchestrator health check."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "orchestrator"
    assert "sub_apps" in data


def test_hello_mounted():
    """Test that hello sub-app is mounted."""
    response = client.get("/")
    data = response.json()
    hello_apps = [app for app in data["sub_apps"] if app["name"] == "hello"]
    assert len(hello_apps) == 1
    assert hello_apps[0]["path"] == "/hello"


def test_hello_sub_app_root():
    """Test the hello sub-app root endpoint."""
    response = client.get("/hello/")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello World!"}


def test_hello_sub_app_hello():
    """Test the hello sub-app hello endpoint."""
    response = client.get("/hello/hello")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello from FastAPI!"}


def test_hello_sub_app_hello_name():
    """Test the hello sub-app personalized hello endpoint."""
    response = client.get("/hello/hello/Claude")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello Claude!"}


def test_hello_sub_app_health():
    """Test the hello sub-app health endpoint."""
    response = client.get("/hello/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "hello"
