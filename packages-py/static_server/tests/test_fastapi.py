"""Tests for static_server FastAPI integration."""

import pytest
from pathlib import Path
from fastapi import FastAPI
from fastapi.testclient import TestClient
from static_server.fastapi import (
    create_static_mounts,
    create_static_mount,
    create_html_routes,
    rewrite_html_paths,
    StaticConfig
)


def test_static_config_initialization():
    """Test StaticConfig initialization."""
    config = StaticConfig(
        dist_path="app/test/dist",
        route_path="/static/test",
        name="test-app"
    )

    assert config.route_path == "/static/test"
    assert config.name == "test-app"
    assert config.html is True
    assert config.check_exists is True


def test_static_config_name_generation():
    """Test automatic name generation."""
    config = StaticConfig(
        dist_path="app/persona-editor/frontend/dist",
        route_path="/static/frontend"
    )

    assert config.name == "app_persona_editor_frontend_dist"


def test_create_static_mount_with_nonexistent_path():
    """Test mounting with check_exists=True for non-existent path."""
    app = FastAPI()

    config = create_static_mount(
        app,
        dist_path="/nonexistent/path",
        route_path="/static/test",
        check_exists=True
    )

    # Should return None when path doesn't exist
    assert config is None


def test_create_static_mounts_empty_list():
    """Test mounting with empty config list."""
    app = FastAPI()

    mounted = create_static_mounts(app, [])

    assert len(mounted) == 0


def test_create_static_mounts_with_invalid_configs():
    """Test mounting with invalid configurations."""
    app = FastAPI()

    configs = [
        {
            "dist_path": "/nonexistent/path1",
            "route_path": "/static/test1",
            "check_exists": True
        },
        {
            "dist_path": "/nonexistent/path2",
            "route_path": "/static/test2",
            "check_exists": True
        }
    ]

    mounted = create_static_mounts(app, configs)

    # Should skip non-existent paths
    assert len(mounted) == 0


def test_static_config_repr():
    """Test StaticConfig string representation."""
    config = StaticConfig(
        dist_path="app/test/dist",
        route_path="/static/test",
        name="test-app"
    )

    repr_str = repr(config)
    assert "test-app" in repr_str
    assert "/static/test" in repr_str


# ============================================================================
# HTML Route Tests
# ============================================================================

def test_static_config_with_html_route():
    """Test StaticConfig initialization with html_route."""
    config = StaticConfig(
        dist_path="app/test/dist",
        route_path="/static/test",
        name="test-app",
        html_route="/apps/test"
    )

    assert config.html_route == "/apps/test"
    assert config.html_content is None


def test_rewrite_html_paths_absolute():
    """Test rewriting absolute asset paths."""
    html = '<script src="/assets/index.js"></script>'
    rewritten = rewrite_html_paths(html, "/static/app/test")

    assert '<script src="/static/app/test/assets/index.js"></script>' == rewritten


def test_rewrite_html_paths_double_quotes():
    """Test rewriting with double quotes."""
    html = '''
    <script src="/assets/index.js"></script>
    <link href="/assets/index.css" rel="stylesheet">
    '''
    rewritten = rewrite_html_paths(html, "/static/app/persona-editor")

    assert '/static/app/persona-editor/assets/index.js' in rewritten
    assert '/static/app/persona-editor/assets/index.css' in rewritten


def test_rewrite_html_paths_single_quotes():
    """Test rewriting with single quotes."""
    html = "<script src='/assets/index.js'></script>"
    rewritten = rewrite_html_paths(html, "/static/app/test")

    assert "/static/app/test/assets/index.js" in rewritten


def test_rewrite_html_paths_relative():
    """Test rewriting relative asset paths."""
    html = '<script src="assets/index.js"></script>'
    rewritten = rewrite_html_paths(html, "/static/app/test")

    assert '/static/app/test/assets/index.js' in rewritten


def test_rewrite_html_paths_preserves_external():
    """Test that external URLs are not rewritten."""
    html = '<script src="https://cdn.example.com/lib.js"></script>'
    rewritten = rewrite_html_paths(html, "/static/app/test")

    # External URL should be unchanged
    assert 'https://cdn.example.com/lib.js' in rewritten


def test_rewrite_html_paths_trailing_slash():
    """Test rewriting with route_path that has trailing slash."""
    html = '<script src="/assets/index.js"></script>'
    rewritten = rewrite_html_paths(html, "/static/app/test/")

    # Should normalize and remove trailing slash
    assert '/static/app/test/assets/index.js' in rewritten
    assert '/static/app/test//assets' not in rewritten


def test_create_html_routes_no_html_route():
    """Test that configs without html_route are skipped."""
    app = FastAPI()

    configs = [
        {
            "dist_path": "/nonexistent/path",
            "route_path": "/static/test"
            # No html_route defined
        }
    ]

    created = create_html_routes(app, configs)
    assert len(created) == 0


def test_create_html_routes_nonexistent_path():
    """Test HTML routes with non-existent paths."""
    app = FastAPI()

    configs = [
        {
            "dist_path": "/nonexistent/path",
            "route_path": "/static/test",
            "html_route": "/apps/test",
            "check_exists": True
        }
    ]

    created = create_html_routes(app, configs, verbose=False)
    assert len(created) == 0
