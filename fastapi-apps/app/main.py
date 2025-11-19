"""Main FastAPI application - Multi-tenant/Multi-app orchestrator.

This application serves as the main orchestrator that mounts multiple
independent sub-apps. Each sub-app is its own Poetry project and can
run standalone or be mounted here.
"""

import os
import sys
import importlib
import importlib.util
import pkgutil
from pathlib import Path
from contextlib import asynccontextmanager, AsyncExitStack
from typing import List, Dict, Any, Union, Optional
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware

# Import CORS module - handle different import contexts
try:
    from app.core.cors import create_cors_middleware, get_cors_config_summary, load_cors_config
except ModuleNotFoundError:
    from core.cors import create_cors_middleware, get_cors_config_summary, load_cors_config
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from pydantic import BaseModel, Field
import base64

from static_server import create_static_mounts, create_html_routes
from env_feature_flag import is_app_mount_enabled
from auth import verify_construction_credentials

# Ensure orchestrator's parent directory is in sys.path so 'app.routes' can be imported
# This is critical for auto_register_routes to work, especially after sub-app loading
_orchestrator_parent = str(Path(__file__).parent.parent)
if _orchestrator_parent not in sys.path:
    sys.path.insert(0, _orchestrator_parent)


# ============================================================================
# BLOCKING SECRET LOADING - Must run BEFORE any sub-app imports
# ============================================================================

def load_secrets_blocking() -> bool:
    """
    Load secrets synchronously and inject into os.environ BEFORE FastAPI startup.

    This function runs at module level to ensure all connection environment variables
    (POSTGRES_*, REDIS_*, API keys, etc.) are available before sub-apps are imported.
    Sub-apps create database engines and service clients at import time, so they need
    these variables to be set first.

    Loads .env file using python-dotenv, checking multiple locations:
    1. Environment variable ENV_SECRET_FILE (for production)
    2. .env file in project root (for local development)

    Returns:
        True if secrets were loaded successfully
    """
    import os
    from pathlib import Path
    from dotenv import load_dotenv

    # Detect environment
    env = os.environ.get("NODE_ENV") or os.environ.get("PYTHON_ENV") or os.environ.get("ENVIRONMENT") or "development"

    print("=" * 80)
    print("[STARTUP] BLOCKING SECRET LOADING - START")
    print(f"[STARTUP] Environment: {env}")
    print(f"[STARTUP] Working directory: {os.getcwd()}")
    print("=" * 80)

    # Try to load .env file from multiple locations
    env_files_to_try = [
        os.environ.get("ENV_SECRET_FILE", "/etc/secrets/MTA_DEV"),  # Production secret file
        Path.cwd() / ".env",  # Local development .env
    ]

    loaded = False
    for env_file in env_files_to_try:
        env_file_path = Path(env_file)

        print(f"\n[ENV] Checking: {env_file_path}")
        print(f"[ENV] Exists: {env_file_path.exists()}")

        if env_file_path.exists():
            try:
                # Load the .env file directly into os.environ
                # override=True ensures the file values take precedence
                load_dotenv(dotenv_path=env_file_path, override=True)
                print(f"[ENV] ✓ Loaded secrets from {env_file_path}")

                # Read file to show what was loaded
                content = env_file_path.read_text()
                lines = [l.strip() for l in content.split('\n') if l.strip() and not l.startswith('#') and '=' in l]
                print(f"[ENV] Loaded {len(lines)} environment variables")

                # Show first few keys (without values for security)
                keys = [l.split('=')[0] for l in lines[:10]]
                print(f"[ENV] Sample keys: {', '.join(keys)}{'...' if len(lines) > 10 else ''}")

                loaded = True
                break  # Stop after first successful load

            except Exception as e:
                print(f"[ENV] ✗ ERROR loading .env file: {str(e)}")
                import traceback
                traceback.print_exc()
        else:
            print(f"[ENV] File not found, trying next location...")

    if not loaded:
        print(f"\n[ENV] ⚠ WARNING: No .env file found in any location")
        print(f"[ENV] Relying on system environment variables")

    # Validate expected variables are now in os.environ
    print("\n[ENV] Validating expected environment variables...")
    expected_vars = {
        "PostgreSQL": ["POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_HOST", "POSTGRES_PORT", "POSTGRES_DB"],
        "Redis": ["REDIS_HOST", "REDIS_PORT"],
        "AWS": ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_DEFAULT_REGION"],
    }

    all_present = True
    for service, vars_list in expected_vars.items():
        present = [k for k in vars_list if k in os.environ]
        missing = [k for k in vars_list if k not in os.environ]

        print(f"[ENV] {service}: {len(present)}/{len(vars_list)} vars present")
        if present:
            print(f"[ENV]   ✓ Present: {', '.join(present)}")
        if missing:
            print(f"[ENV]   ✗ Missing: {', '.join(missing)}")
            all_present = False

    print("\n" + "=" * 80)
    if all_present:
        print("[STARTUP] ✓ All expected secrets are present in os.environ")
    else:
        print("[STARTUP] ⚠ WARNING: Some expected secrets are missing")
    print("[STARTUP] BLOCKING SECRET LOADING - COMPLETE")
    print("=" * 80 + "\n")
    return True


def log_feature_flags():
    """
    Log feature flags from common/config/env_feature_flag.json at startup.

    This shows which apps are enabled/disabled for mounting.
    """
    import json
    from pathlib import Path

    config_path = Path(__file__).parent.parent.parent / "common" / "config" / "env_feature_flag.json"

    print("=" * 80)
    print("[STARTUP] FEATURE FLAGS - APP MOUNT CONFIGURATION")
    print("=" * 80)

    try:
        with open(config_path, 'r') as f:
            feature_flags = json.load(f)

        print(f"[FEATURE_FLAGS] Config file: {config_path}")
        print(f"[FEATURE_FLAGS] Total apps: {len(feature_flags)}\n")

        enabled = []
        disabled = []

        for app_name, is_enabled in feature_flags.items():
            # Check if env var override exists
            env_key = f"FEATURE_FLAG_APP_MOUNT_{app_name}"
            env_override = os.environ.get(env_key)

            if env_override is not None:
                actual_value = env_override.lower() in ('true', '1', 'yes', 'on')
                status = "✓ ENABLED (ENV)" if actual_value else "✗ DISABLED (ENV)"
                if actual_value:
                    enabled.append(app_name)
                else:
                    disabled.append(app_name)
                print(f"[FEATURE_FLAGS]   {app_name}: {status} (overridden by {env_key}={env_override})")
            else:
                status = "✓ ENABLED" if is_enabled else "✗ DISABLED"
                if is_enabled:
                    enabled.append(app_name)
                else:
                    disabled.append(app_name)
                print(f"[FEATURE_FLAGS]   {app_name}: {status}")

        print(f"\n[FEATURE_FLAGS] Summary: {len(enabled)} enabled, {len(disabled)} disabled")
        if enabled:
            print(f"[FEATURE_FLAGS]   Enabled: {', '.join(enabled)}")
        if disabled:
            print(f"[FEATURE_FLAGS]   Disabled: {', '.join(disabled)}")

    except FileNotFoundError:
        print(f"[FEATURE_FLAGS] ⚠ WARNING: Config file not found at {config_path}")
        print(f"[FEATURE_FLAGS] All apps will be disabled by default")
    except json.JSONDecodeError as e:
        print(f"[FEATURE_FLAGS] ✗ ERROR: Invalid JSON in config file: {e}")
        print(f"[FEATURE_FLAGS] All apps will be disabled by default")
    except Exception as e:
        print(f"[FEATURE_FLAGS] ✗ ERROR: Unexpected error loading feature flags: {e}")

    print("=" * 80 + "\n")


# Execute blocking secret load at module level (before any app imports)
_secrets_loaded = load_secrets_blocking()

# Log feature flags after secret loading
log_feature_flags()


# ============================================================================
# Pydantic Response Models for OpenAPI Documentation
# ============================================================================

class RootResponse(BaseModel):
    """Response model for the root endpoint."""
    message: str = Field(..., description="Welcome message", example="Multi-App Orchestrator")
    id: str = Field(..., description="Build ID from environment variable", example="v1.0.0//prod//2024-01-01")
    build: List[str] = Field(..., description="Build ID parts split by '//'", example=["v1.0.0", "prod", "2024-01-01"])


class SubAppInfo(BaseModel):
    """Information about a mounted sub-application."""
    name: str = Field(..., description="Sub-app name", example="hello")
    path: str = Field(..., description="Mount path for the sub-app", example="/hello")
    docs: str = Field(..., description="Documentation URL for the sub-app", example="/hello/docs")
    health: str = Field(..., description="Health check URL for the sub-app", example="/hello/health")


class AppsMetadataResponse(BaseModel):
    """Response model for apps metadata endpoint."""
    message: str = Field(..., description="Service name", example="Multi-App Orchestrator")
    docs: str = Field(..., description="Main documentation URL", example="/docs")
    health: str = Field(..., description="Main health check URL", example="/health")
    sub_apps: List[SubAppInfo] = Field(..., description="List of mounted sub-applications")


class HealthResponse(BaseModel):
    """Response model for health check endpoint."""
    status: str = Field(..., description="Health status", example="healthy")
    service: str = Field(..., description="Service name", example="orchestrator")
    sub_apps: Dict[str, str] = Field(..., description="Status of mounted sub-apps", example={"hello": "mounted"})


class ConfigSuccessResponse(BaseModel):
    """Successful response when vault secrets are configured."""
    # Using Dict[str, Any] to allow dynamic properties from vault secrets
    class Config:
        extra = "allow"

    def __init__(self, **data):
        super().__init__(**data)


class ConfigErrorResponse(BaseModel):
    """Error response when vault secrets are not configured."""
    message: str = Field(..., description="Error message", example="Vault secrets not configured")
    hint: str = Field(..., description="Helpful hint for resolution", example="Set VAULT_SECRET_FILE environment variable to load secrets")


class SecretsSuccessResponse(BaseModel):
    """Successful response with secrets metadata."""
    properties_count: int = Field(..., description="Number of properties loaded", example=10)
    files_count: int = Field(..., description="Number of files loaded", example=2)


class SecretsErrorResponse(BaseModel):
    """Error response when vault secrets are not configured."""
    message: str = Field(..., description="Error message", example="Vault secrets not configured")
    hint: str = Field(..., description="Helpful hint for resolution", example="Set VAULT_SECRET_FILE environment variable to load secrets")


class ParsingErrorModel(BaseModel):
    """Represents a parsing error."""
    key: Optional[str] = Field(None, description="The key that caused the error (if applicable)")
    message: str = Field(..., description="The error message")
    error_type: str = Field(..., description="The type of error", example="Base64DecodingError")


class CombinedSecretsResponse(BaseModel):
    """Combined response with redacted config properties and metadata."""
    properties: Dict[str, str] = Field(..., description="Configuration properties with redacted values", example={"API_KEY": "sk***45", "DATABASE_URL": "po***db"})
    properties_count: int = Field(..., description="Number of properties loaded", example=10)
    files: Dict[str, str] = Field(..., description="File names with redacted content indicators", example={"cert.pem": "***FILE CONTENT REDACTED***", "key.pem": "***FILE CONTENT REDACTED***"})
    files_count: int = Field(..., description="Number of files loaded", example=2)
    errors: List[ParsingErrorModel] = Field(default_factory=list, description="Parsing errors encountered during secret loading")


# ============================================================================
# Composable lifespan helpers for combining multiple startup/shutdown tasks
# ============================================================================
@asynccontextmanager
async def _nested(*managers):
    """Helper to chain multiple async context managers."""
    async with AsyncExitStack() as stack:
        for manager in managers:
            await stack.enter_async_context(manager)
        yield


def combine_lifespans(*lifespans):
    """Combine multiple lifespan functions into a single unified handler.

    This allows you to compose several startup/shutdown tasks together.
    Each lifespan function should be a function that takes an app and returns
    an async context manager.

    Example:
        lifespan = combine_lifespans(load_secrets, init_db, init_cache)
        app = FastAPI(lifespan=lifespan)
    """
    @asynccontextmanager
    async def combined(app):
        # Create all context managers and chain them
        managers = [ls(app) for ls in lifespans]
        async with _nested(*managers):
            yield
    return combined


# Import sub-apps
# Each sub-app is an independent Poetry project that can run standalone
try:
    # Import path: fastapi-apps/app-hello/app/main.py
    import importlib.util
    hello_spec = importlib.util.spec_from_file_location(
        "hello_app_main",
        Path(__file__).parent.parent / "app-hello/app/main.py"
    )
    hello_module = importlib.util.module_from_spec(hello_spec)
    hello_spec.loader.exec_module(hello_module)
    hello_app = hello_module.app
except ImportError:
    hello_app = None

try:
    # Dynamic import for aws-s3-files (directory has hyphen, not underscore)
    # Same issue as persona-editor with 'app' package namespace conflicts

    # Save original state
    original_sys_path = sys.path.copy()
    original_cwd = os.getcwd()
    original_app_modules = {k: v for k, v in sys.modules.items() if k.startswith('app')}

    aws_s3_files_dir = str(Path(__file__).parent.parent / "app-aws-s3-files")

    # Change to aws-s3-files directory and modify sys.path
    os.chdir(aws_s3_files_dir)
    sys.path.insert(0, aws_s3_files_dir)

    # Temporarily remove orchestrator's app modules
    for key in list(original_app_modules.keys()):
        if key in sys.modules:
            del sys.modules[key]

    try:
        # Now import app.main from aws-s3-files's context
        import app.main as aws_s3_files_main
        aws_s3_files_app = aws_s3_files_main.app

        # Save aws-s3-files's app modules with different names to avoid future conflicts
        aws_s3_app_modules = {k: v for k, v in sys.modules.items() if k.startswith('app.')}
        for key, value in aws_s3_app_modules.items():
            sys.modules[f"aws_s3_files_{key}"] = value

    finally:
        # Restore original state
        os.chdir(original_cwd)
        sys.path = original_sys_path

        # Remove aws-s3-files's app modules
        for key in list(sys.modules.keys()):
            if key.startswith('app.') and key not in original_app_modules:
                del sys.modules[key]

        # Restore orchestrator's app modules
        sys.modules.update(original_app_modules)

except (ImportError, FileNotFoundError, AttributeError) as e:
    print(f"Warning: Could not load aws-s3-files: {e}")
    import traceback
    traceback.print_exc()
    aws_s3_files_app = None
finally:
    # Ensure we're back in the original directory
    try:
        if 'original_cwd' in locals():
            os.chdir(original_cwd)
    except:
        pass

try:
    # Dynamic import for persona-editor (directory has hyphen, not underscore)
    # This is tricky because both orchestrator and persona-editor have an 'app' package
    # We need to temporarily manipulate the import system to resolve the conflict

    import os.path as ospath

    # Save original state
    original_sys_path = sys.path.copy()
    original_cwd = os.getcwd()
    original_app_modules = {k: v for k, v in sys.modules.items() if k.startswith('app')}

    persona_editor_dir = str(Path(__file__).parent.parent / "app-persona-editor")

    # Change to persona-editor directory and modify sys.path
    os.chdir(persona_editor_dir)
    sys.path.insert(0, persona_editor_dir)

    # Temporarily remove orchestrator's app modules
    for key in list(original_app_modules.keys()):
        if key in sys.modules:
            del sys.modules[key]

    try:
        # Now import app.main from persona-editor's context
        import app.main as persona_editor_main
        persona_editor_app = persona_editor_main.app

        # Save persona-editor's app modules with different names to avoid future conflicts
        persona_app_modules = {k: v for k, v in sys.modules.items() if k.startswith('app.')}
        for key, value in persona_app_modules.items():
            sys.modules[f"persona_editor_{key}"] = value

    finally:
        # Restore original state
        os.chdir(original_cwd)
        sys.path = original_sys_path

        # Remove persona-editor's app modules
        for key in list(sys.modules.keys()):
            if key.startswith('app.') and key not in original_app_modules:
                del sys.modules[key]

        # Restore orchestrator's app modules
        sys.modules.update(original_app_modules)

except (ImportError, FileNotFoundError, AttributeError) as e:
    print(f"Warning: Could not load persona-editor: {e}")
    import traceback
    traceback.print_exc()
    persona_editor_app = None
finally:
    # Ensure we're back in the original directory
    try:
        if 'original_cwd' in locals():
            os.chdir(original_cwd)
    except:
        pass

try:
    # Dynamic import for react-component-esm (directory has hyphen, not underscore)
    # Same issue as persona-editor with 'app' package namespace conflicts

    # Save original state
    original_sys_path = sys.path.copy()
    original_cwd = os.getcwd()
    original_app_modules = {k: v for k, v in sys.modules.items() if k.startswith('app')}

    react_component_esm_dir = str(Path(__file__).parent.parent / "app-react-component-esm")

    # Change to react-component-esm directory and modify sys.path
    os.chdir(react_component_esm_dir)
    sys.path.insert(0, react_component_esm_dir)

    # Temporarily remove orchestrator's app modules
    for key in list(original_app_modules.keys()):
        if key in sys.modules:
            del sys.modules[key]

    try:
        # Now import app.main from react-component-esm's context
        import app.main as react_component_esm_main
        react_component_esm_app = react_component_esm_main.app

        # Save react-component-esm's app modules with different names to avoid future conflicts
        react_component_esm_app_modules = {k: v for k, v in sys.modules.items() if k.startswith('app.')}
        for key, value in react_component_esm_app_modules.items():
            sys.modules[f"react_component_esm_{key}"] = value

    finally:
        # Restore original state
        os.chdir(original_cwd)
        sys.path = original_sys_path

        # Remove react-component-esm's app modules
        for key in list(sys.modules.keys()):
            if key.startswith('app.') and key not in original_app_modules:
                del sys.modules[key]

        # Restore orchestrator's app modules
        sys.modules.update(original_app_modules)

except (ImportError, FileNotFoundError, AttributeError) as e:
    print(f"Warning: Could not load react-component-esm: {e}")
    import traceback
    traceback.print_exc()
    react_component_esm_app = None
finally:
    # Ensure we're back in the original directory
    try:
        if 'original_cwd' in locals():
            os.chdir(original_cwd)
    except:
        pass

try:
    # Dynamic import for figma-component-inspector (directory has hyphen, not underscore)
    # Same namespace conflict issue as persona-editor and react-component-esm

    # Save original state
    original_sys_path = sys.path.copy()
    original_cwd = os.getcwd()
    original_app_modules = {k: v for k, v in sys.modules.items() if k.startswith('app')}

    figma_inspector_dir = str(Path(__file__).parent.parent / "app-figma-component-inspector")

    # Change to figma-component-inspector directory and modify sys.path
    os.chdir(figma_inspector_dir)
    sys.path.insert(0, figma_inspector_dir)

    # Temporarily remove orchestrator's app modules
    for key in list(original_app_modules.keys()):
        if key in sys.modules:
            del sys.modules[key]

    try:
        # Now import app.main from figma-component-inspector's context
        import app.main as figma_inspector_main
        figma_inspector_app = figma_inspector_main.app

        # Save figma-component-inspector's app modules with different names to avoid future conflicts
        figma_inspector_app_modules = {k: v for k, v in sys.modules.items() if k.startswith('app.')}
        for key, value in figma_inspector_app_modules.items():
            sys.modules[f"figma_inspector_{key}"] = value

    finally:
        # Restore original state
        os.chdir(original_cwd)
        sys.path = original_sys_path

        # Remove figma-component-inspector's app modules
        for key in list(sys.modules.keys()):
            if key.startswith('app.') and key not in original_app_modules:
                del sys.modules[key]

        # Restore orchestrator's app modules
        sys.modules.update(original_app_modules)

except (ImportError, FileNotFoundError, AttributeError) as e:
    print(f"Warning: Could not load figma-component-inspector: {e}")
    import traceback
    traceback.print_exc()
    figma_inspector_app = None
finally:
    # Ensure we're back in the original directory
    try:
        if 'original_cwd' in locals():
            os.chdir(original_cwd)
    except:
        pass

# Note: app-ask-ai and app-chat-window are frontend-only applications
# They don't have a backend FastAPI app to mount
# Their frontends are served via static file configuration
ask_ai_app = None
chat_window_app = None


def log_apps_status():
    """
    Log the import and mount status of all FastAPI apps.

    Displays a table showing which apps were successfully imported
    and their mount paths.
    """
    from env_feature_flag import is_app_mount_enabled

    print("\n" + "=" * 80)
    print("[STARTUP] FASTAPI APPS STATUS")
    print("=" * 80)

    # Define all apps with their info
    apps_info = [
        {
            "name": "app-hello",
            "app": hello_app,
            "flag": "HELLO",
            "mount_path": "/hello"
        },
        {
            "name": "app-aws-s3-files",
            "app": aws_s3_files_app,
            "flag": "AWS_S3_FILES",
            "mount_path": "/api/apps/aws-s3-files"
        },
        {
            "name": "app-persona-editor",
            "app": persona_editor_app,
            "flag": "PERSONA_EDITOR",
            "mount_path": "/api/apps/persona-editor"
        },
        {
            "name": "app-react-component-esm",
            "app": react_component_esm_app,
            "flag": "REACT_COMPONENT_ESM",
            "mount_path": "/api/apps/react-component-esm"
        },
        {
            "name": "app-figma-component-inspector",
            "app": figma_inspector_app,
            "flag": "FIGMA_COMPONENT_INSPECTOR",
            "mount_path": "/api/apps/figma-component-inspector"
        },
        {
            "name": "app-ask-ai",
            "app": ask_ai_app,
            "flag": "ASK_AI",
            "mount_path": None,  # Frontend-only
            "frontend_only": True
        },
        {
            "name": "app-chat-window",
            "app": chat_window_app,
            "flag": "CHAT_WINDOW",
            "mount_path": None,  # Frontend-only
            "frontend_only": True
        },
    ]

    # Print table header
    print(f"\n{'App':<35} {'Imported':<10} {'Mounted':<40}")
    print("-" * 85)

    imported_count = 0
    mounted_count = 0

    for app_info in apps_info:
        name = app_info["name"]
        app_instance = app_info["app"]
        flag = app_info["flag"]
        mount_path = app_info["mount_path"]
        frontend_only = app_info.get("frontend_only", False)

        # Check import status
        if frontend_only:
            imported = "N/A"
            imported_symbol = "-"
        elif app_instance is not None:
            imported = "✓"
            imported_symbol = "✓"
            imported_count += 1
        else:
            imported = "✗"
            imported_symbol = "✗"

        # Check mount status
        if frontend_only:
            mounted = "Frontend-only (static files)"
            mounted_symbol = "N/A"
        elif app_instance is not None and is_app_mount_enabled(flag):
            mounted = f"✓ {mount_path}"
            mounted_count += 1
        elif app_instance is not None:
            mounted = "✗ (disabled by feature flag)"
        else:
            mounted = "✗"

        print(f"{name:<35} {imported:<10} {mounted:<40}")

    print("-" * 85)
    print(f"\nSummary: {imported_count}/5 apps imported, {mounted_count}/5 apps mounted")
    print("Note: app-ask-ai and app-chat-window are frontend-only (served as static files)")
    print("=" * 80 + "\n")


# Log apps status after all imports
log_apps_status()


# Create lifespan handlers
# Collect all lifespan handlers that should be enabled
# NOTE: Secret loading is now done at module level (see load_secrets_blocking() above)
# This ensures ENV variables are available before sub-app imports
lifespans = []


# Route logging lifespan handler
@asynccontextmanager
async def route_logging_lifespan(app):
    """Log all registered routes on startup."""
    # Startup: log routes
    log_routes()
    yield
    # Shutdown: no cleanup needed


# Add route logging to lifespan handlers
lifespans.append(route_logging_lifespan)

# Combine all lifespan handlers
# In the future, you can add more handlers like: lifespans.append(init_db), lifespans.append(init_cache)
lifespan = combine_lifespans(*lifespans) if lifespans else None


# ============================================================================
# OpenAPI Tags Metadata
# ============================================================================

tags_metadata = [
    {
        "name": "system",
        "description": "System-level endpoints for orchestrator information and metadata. "
                      "These endpoints provide information about the orchestrator itself, "
                      "mounted sub-applications, and build information.",
    },
    {
        "name": "health",
        "description": "Health check endpoints for monitoring service availability. "
                      "Use these endpoints to verify that the orchestrator and its sub-apps are running correctly.",
    },
    {
        "name": "secrets",
        "description": "Vault secrets management endpoints. "
                      "These endpoints provide access to configuration properties and secrets loaded from vault. "
                      "Requires VAULT_SECRET_FILE environment variable to be configured.",
    },
]


# ============================================================================
# Create main orchestrator app
# ============================================================================

app = FastAPI(
    lifespan=lifespan,
    title="Multi-App Orchestrator",
    description="""
# Multi-App Orchestrator API

A FastAPI-based orchestrator that manages and routes requests to multiple independent sub-applications.

## Features

* 🚀 **Multi-App Architecture** - Mount multiple independent FastAPI apps
* 🔐 **Vault Secrets Integration** - Secure configuration management
* 💚 **Health Monitoring** - Built-in health checks for all services
* 📚 **Auto-generated Documentation** - Interactive API documentation

## Configuration

Set the following environment variables:

* `BUILD_ID` - Build identifier (optional)
* `VAULT_SECRET_FILE` - Path to vault secrets file (optional)

## Sub-Applications

Sub-apps are independently developed FastAPI applications that can run standalone or be mounted here.
Each sub-app retains its own documentation and endpoints.
    """,
    version="0.1.0",
    contact={
        "name": "API Support",
        "email": "support@example.com",
    },
    license_info={
        "name": "MIT",
    },
    docs_url=None,  # Disable default docs, we'll add a protected version
    redoc_url=None,  # Disable default redoc, we'll add a protected version
    openapi_tags=tags_metadata,
)

# ============================================================================
# Under Construction Middleware - Protect all routes during construction
# ============================================================================

class UnderConstructionMiddleware(BaseHTTPMiddleware):
    """
    Middleware to protect entire application with basic authentication during construction.

    When UNDER_CONSTRUCTION_KEY environment variable is set, all routes except health
    endpoints require basic authentication where both username and password must match
    the UNDER_CONSTRUCTION_KEY value.

    Health endpoints (/health, /status, /ping) are always exempt to allow monitoring.
    """

    # Health endpoints that are exempt from authentication
    EXEMPT_PATHS = {"/health", "/status", "/ping"}

    async def dispatch(self, request: Request, call_next):
        # Check if under construction mode is enabled
        construction_key = os.environ.get("UNDER_CONSTRUCTION_KEY")

        if not construction_key:
            # No construction key set - allow all traffic
            return await call_next(request)

        # Check if this is a health endpoint (always exempt)
        if request.url.path in self.EXEMPT_PATHS:
            return await call_next(request)

        # Extract credentials from Authorization header
        auth_header = request.headers.get("Authorization")

        if not auth_header or not auth_header.startswith("Basic "):
            # No credentials provided - return 401 with challenge
            return Response(
                content="Under Construction - Authentication Required",
                status_code=401,
                headers={"WWW-Authenticate": 'Basic realm="Under Construction"'},
            )

        try:
            # Decode Basic auth credentials
            auth_decoded = base64.b64decode(auth_header[6:]).decode("utf-8")
            username, password = auth_decoded.split(":", 1)
            credentials = HTTPBasicCredentials(username=username, password=password)

            # Verify credentials using constant-time comparison
            if not verify_construction_credentials(credentials, construction_key):
                # Invalid credentials - return 401
                return Response(
                    content="Invalid Credentials",
                    status_code=401,
                    headers={"WWW-Authenticate": 'Basic realm="Under Construction"'},
                )

            # Credentials valid - allow request to proceed
            return await call_next(request)

        except (ValueError, UnicodeDecodeError):
            # Malformed Authorization header - return 401
            return Response(
                content="Invalid Authorization Header",
                status_code=401,
                headers={"WWW-Authenticate": 'Basic realm="Under Construction"'},
            )


# ============================================================================
# No-Cache Middleware - Prevent browser caching
# ============================================================================

class NoCacheMiddleware(BaseHTTPMiddleware):
    """Middleware to disable browser caching for all responses."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        # Set cache-control headers to prevent caching
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response

# Register middleware in reverse order of execution
# (Middleware executes in reverse order: last registered = first to execute)
# Execution order: CORS -> UnderConstruction -> NoCache -> App
app.add_middleware(NoCacheMiddleware)
app.add_middleware(UnderConstructionMiddleware)

# ============================================================================
# CORS Middleware - Enterprise Policy Engine
# ============================================================================

# Use the new enterprise CORS policy engine
# Configuration loaded from common/config/cors.json with environment variable overrides
USE_CORS_ENGINE = os.environ.get("USE_CORS_ENGINE", "true").lower() == "true"

if USE_CORS_ENGINE:
    try:
        # Load and apply enterprise CORS policy
        cors_config = load_cors_config(
            environment=os.environ.get("PYTHON_ENV", "development")
        )
        cors_engine = create_cors_middleware(
            app,
            config=cors_config,
            app_name="orchestrator",
        )

        # Print configuration summary
        summary = get_cors_config_summary(
            cors_config,
            os.environ.get("PYTHON_ENV", "development")
        )
        print("\n" + summary + "\n")

    except Exception as e:
        print(f"ERROR: Failed to initialize CORS policy engine: {e}")
        print("Falling back to legacy CORS configuration...")

        # Fallback to legacy behavior
        cors_origins_env = os.environ.get("CORS_ALLOW_ORIGINS", "")
        if cors_origins_env:
            allowed_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
            print(f"CORS allowed origins from CORS_ALLOW_ORIGINS: {allowed_origins}")
        else:
            allowed_origins = ["*"]
            print("CORS: Allowing all origins (no CORS_ALLOW_ORIGINS set)")

        app.add_middleware(
            CORSMiddleware,
            allow_origins=allowed_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
else:
    # Legacy CORS behavior (deprecated)
    print("WARNING: Using legacy CORS configuration. Set USE_CORS_ENGINE=true for enterprise features.")
    cors_origins_env = os.environ.get("CORS_ALLOW_ORIGINS", "")
    if cors_origins_env:
        allowed_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
        print(f"CORS allowed origins from CORS_ALLOW_ORIGINS: {allowed_origins}")
    else:
        allowed_origins = ["*"]
        print("CORS: Allowing all origins (no CORS_ALLOW_ORIGINS set)")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# ============================================================================
# Auto-load Routes from app/routes/*.routes.py
# ============================================================================

from auto_register_routes import auto_register_routes, get_load_result

# Ensure we're in the orchestrator directory and app.routes resolves correctly
# After sub-app imports, sys.modules['app'] points to a sub-app's package
_orchestrator_parent_dir = str(Path(__file__).parent.parent)

# Clear ALL app modules from sub-app contamination (including 'app' itself)
# This ensures app.routes resolves to orchestrator's routes, not any sub-app's
_modules_to_delete = [k for k in sys.modules.keys() if k == 'app' or k.startswith('app.')]
for _mod in _modules_to_delete:
    del sys.modules[_mod]

# Ensure orchestrator parent is first in sys.path for correct module resolution
sys.path = [_orchestrator_parent_dir] + [p for p in sys.path if p != _orchestrator_parent_dir]

# Auto-load routes on application initialization with verbose logging
# This will now import app.routes fresh from the orchestrator's directory
auto_register_routes(app, routes_package="app.routes", verbose=True)


# ============================================================================
# Protected Documentation Endpoints - Require BasicAuth
# ============================================================================

from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.openapi.utils import get_openapi
from auth import verify_docs_credentials, is_docs_auth_enabled

# Only register documentation routes if credentials are configured
if is_docs_auth_enabled():
    print("📚 Documentation endpoints ENABLED (DOCS_AUTH credentials configured)")

    @app.get("/docs", include_in_schema=False)
    async def get_documentation(
        _: bool = Depends(verify_docs_credentials)
    ):
        """
        Protected Swagger UI documentation.

        Requires Basic Authentication using DOCS_AUTH_USERNAME and DOCS_AUTH_PASSWORD.
        """
        return get_swagger_ui_html(
            openapi_url="/openapi.json",
            title=app.title + " - Swagger UI",
            oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
            swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui-bundle.js",
            swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui.css",
        )


    @app.get("/redoc", include_in_schema=False)
    async def get_redoc_documentation(
        _: bool = Depends(verify_docs_credentials)
    ):
        """
        Protected ReDoc documentation.

        Requires Basic Authentication using DOCS_AUTH_USERNAME and DOCS_AUTH_PASSWORD.
        """
        return get_redoc_html(
            openapi_url="/openapi.json",
            title=app.title + " - ReDoc",
            redoc_js_url="https://cdn.jsdelivr.net/npm/redoc@2.1.3/bundles/redoc.standalone.js",
        )


    @app.get("/openapi.json", include_in_schema=False)
    async def get_open_api_endpoint(
        _: bool = Depends(verify_docs_credentials)
    ):
        """
        Protected OpenAPI schema.

        Requires Basic Authentication using DOCS_AUTH_USERNAME and DOCS_AUTH_PASSWORD.
        """
        return get_openapi(
            title=app.title,
            version=app.version,
            openapi_version=app.openapi_version,
            description=app.description,
            routes=app.routes,
            tags=app.openapi_tags,
            servers=app.servers,
        )
else:
    print("📚 Documentation endpoints DISABLED (Set DOCS_AUTH_USERNAME and DOCS_AUTH_PASSWORD to enable)")


# ============================================================================
# Route Logger - Dynamic runtime route logging
# ============================================================================

def log_routes():
    """Log all registered routes at runtime."""
    from fastapi.routing import APIRoute, Mount
    from starlette.routing import Route

    routes_list = []

    def extract_routes(routes, prefix=""):
        """Recursively extract routes from app and mounted sub-apps."""
        for route in routes:
            if isinstance(route, APIRoute):
                # Regular API route
                for method in route.methods:
                    path = prefix + route.path
                    routes_list.append((method, path))
            elif isinstance(route, Mount):
                # Mounted sub-app or static files
                mount_path = prefix + route.path
                if hasattr(route.app, 'routes'):
                    # It's a FastAPI app with routes
                    extract_routes(route.app.routes, mount_path)
            elif isinstance(route, Route):
                # Starlette route
                path = prefix + route.path
                if hasattr(route, 'methods') and route.methods:
                    # If methods is a set or list, add each method separately
                    for method in route.methods:
                        routes_list.append((method, path))
                else:
                    routes_list.append(('GET', path))

    # Extract all routes
    extract_routes(app.routes)

    # Sort routes by path
    routes_list.sort(key=lambda x: (x[1], x[0]))

    # Print auto-loaded routes first
    load_result = get_load_result()
    if load_result and load_result.success:
        print("\n" + "="*60)
        print("Auto-loaded Routes:")
        print("="*60)
        for route_info in load_result.success:
            prefix = route_info.prefix
            tags = route_info.tags
            filename = route_info.filename
            tags_str = f" [{', '.join(tags)}]" if tags else ""
            print(f"{prefix:30} {filename}{tags_str}")
        print("="*60)
        print(f"Total: {len(load_result.success)} auto-loaded route module(s)\n")

    # Print all registered routes
    print("="*60)
    print("Registered Routes:")
    print("="*60)
    for method, path in routes_list:
        print(f"{method:8} {path}")
    print("="*60)
    print(f"Total: {len(routes_list)} routes\n")


@app.get(
    "/",
    response_model=RootResponse,
    tags=["system"],
    summary="Get orchestrator information",
    description="""
    Returns basic information about the Multi-App Orchestrator including build details.

    The BUILD_ID environment variable is parsed and split by '//' delimiter to provide
    structured build information (e.g., version, environment, timestamp).

    **Example BUILD_ID format:** `v1.0.0//production//2024-01-01T12:00:00Z`
    """,
)
async def root():
    """Root endpoint - Shows orchestrator welcome message and build information."""
    # Parse BUILD_ID environment variable (format: value1//value2//value3)
    build_id = os.environ.get("BUILD_ID", "")
    build_parts = build_id.split("//") if build_id else []

    return {
        "message": "Multi-App Orchestrator",
        "id": build_id,
        "build": build_parts,
    }


@app.get(
    "/~/sys/metadata/apps",
    response_model=AppsMetadataResponse,
    tags=["system"],
    summary="Get metadata about all mounted applications",
    description="""
    Returns comprehensive metadata about the orchestrator and all mounted sub-applications.

    This endpoint provides:
    - Links to main orchestrator documentation and health endpoints
    - List of all mounted sub-applications with their paths and endpoints
    - Quick discovery of available services

    **Use this endpoint to:**
    - Discover what sub-applications are available
    - Get documentation URLs for each service
    - Build service discovery mechanisms
    """,
)
async def get_apps_metadata():
    """Get metadata about mounted sub-applications and orchestrator endpoints."""
    sub_apps = []

    if hello_app:
        sub_apps.append({
            "name": "hello",
            "path": "/hello",
            "docs": "/hello/docs",
            "health": "/hello/health"
        })

    if persona_editor_app:
        sub_apps.append({
            "name": "persona-editor",
            "path": "/api/apps/persona-editor",
            "docs": "/api/apps/persona-editor/docs",
            "health": "/api/apps/persona-editor/health"
        })

    if react_component_esm_app:
        sub_apps.append({
            "name": "react-component-esm",
            "path": "/api/apps/react-component-esm",
            "docs": "/api/apps/react-component-esm/docs",
            "health": "/api/apps/react-component-esm/health"
        })

    if aws_s3_files_app:
        sub_apps.append({
            "name": "aws-s3-files",
            "path": "/api/apps/aws-s3-files",
            "docs": "/api/apps/aws-s3-files/docs",
            "health": "/api/apps/aws-s3-files/health"
        })

    if figma_inspector_app:
        sub_apps.append({
            "name": "figma-component-inspector",
            "path": "/api/apps/figma-component-inspector",
            "docs": "/api/apps/figma-component-inspector/docs",
            "health": "/api/apps/figma-component-inspector/health"
        })

    # Note: ask-ai and chat-window are frontend-only apps, no backend to mount

    return {
        "message": "Multi-App Orchestrator",
        "docs": "/docs",
        "health": "/health",
        "sub_apps": sub_apps
    }



@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["health"],
    summary="Check orchestrator health status",
    description="""
    Health check endpoint for monitoring the orchestrator and its mounted sub-applications.

    Returns:
    - Overall health status of the orchestrator
    - Service identification
    - Status of all mounted sub-applications

    **Status Values:**
    - `healthy` - Service is running normally
    - `mounted` - Sub-app is successfully mounted and available

    Use this endpoint for:
    - Kubernetes liveness/readiness probes
    - Load balancer health checks
    - Monitoring and alerting systems
    """,
)
async def health():
    """Health check endpoint for the orchestrator and mounted sub-apps."""
    sub_app_health = {}

    if hello_app:
        sub_app_health["hello"] = "mounted"

    if persona_editor_app:
        sub_app_health["persona-editor"] = "mounted"

    if react_component_esm_app:
        sub_app_health["react-component-esm"] = "mounted"

    if aws_s3_files_app:
        sub_app_health["aws-s3-files"] = "mounted"

    if figma_inspector_app:
        sub_app_health["figma-component-inspector"] = "mounted"

    # Note: ask-ai and chat-window are frontend-only apps, no backend to mount

    return {
        "status": "healthy",
        "service": "orchestrator",
        "sub_apps": sub_app_health
    }


# ============================================================================
# Mount static file directories
# ============================================================================

# Configure static file serving for frontend dist directories
# Each frontend build output is served at a specific route
# Optional: Add 'html_route' to serve index.html with rewritten asset paths

# Check MTA_ENV to determine which static configs to load
mta_env = os.environ.get("MTA_ENV")

# Initialize static configs list
# Order matters: more specific routes must be mounted before general ones
static_configs = []

# Conditionally add frontend app static files based on MTA_ENV
# These are more specific routes (e.g., /static/app/*) so they go first
if not mta_env:
    # When MTA_ENV is not set, mount frontend application static files
    print("MTA_ENV not set: Mounting frontend application static files")
    static_configs.extend([
        {
            "dist_path": Path(__file__).parent.parent / "app-persona-editor/frontend/dist",
            "route_path": "/static/app/persona-editor/frontend/dist",
            "name": "persona-editor-frontend",
            "html_route": "/apps/persona-editor",  # Serves HTML at this route with correct asset paths
            "isApp": True  # Enable catch-all routing for SPA client-side navigation
        },
        {
            "dist_path": Path(__file__).parent.parent / "app-react-component-esm/frontend/dist",
            "route_path": "/static/app/react-component-esm/frontend/dist",
            "name": "react-component-esm-frontend",
            "html_route": "/apps/react-component-esm",  # Serves HTML at this route with correct asset paths
            "isApp": True  # Enable catch-all routing for SPA client-side navigation
        },
        {
            "dist_path": Path(__file__).parent.parent / "app-aws-s3-files/frontend/dist",
            "route_path": "/static/app/aws-s3-files/frontend/dist",
            "name": "aws-s3-files-frontend",
            "html_route": "/apps/aws-s3-files",  # Serves HTML at this route with correct asset paths
            "isApp": True  # Enable catch-all routing for SPA client-side navigation
        },
        {
            "dist_path": Path(__file__).parent.parent / "app-chat-window/frontend/dist",
            "route_path": "/static/app/chat-window/frontend/dist",
            "name": "chat-window-frontend",
            "html_route": "/apps/chat-window",  # Serves HTML at this route with correct asset paths
            "isApp": True  # Enable catch-all routing for SPA client-side navigation
        },
        {
            "dist_path": Path(__file__).parent.parent / "app-ask-ai/frontend/dist",
            "route_path": "/static/app/ask-ai/frontend/dist",
            "name": "ask-ai-frontend",
            "html_route": "/apps/ask-ai",  # Serves HTML at this route with correct asset paths
            "isApp": True  # Enable catch-all routing for SPA client-side navigation
        },
        {
            "dist_path": Path(__file__).parent.parent / "app-figma-component-inspector/frontend/dist",
            "route_path": "/static/app/figma-component-inspector/frontend/dist",
            "name": "figma-component-inspector-frontend",
            "html_route": "/apps/figma-component-inspector",  # Serves HTML at this route with correct asset paths
            "isApp": True  # Enable catch-all routing for SPA client-side navigation
        }
    ])
else:
    # When MTA_ENV is set (production), mount frontend from static directory
    # In production, frontend dist files are built and copied to ./static/ during deployment
    print(f"MTA_ENV={mta_env}: Loading production frontend from static directory")
    static_configs.extend([
        {
            "dist_path": Path(__file__).parent.parent.parent / "static/app/persona-editor/frontend/dist",
            "route_path": "/static/app/persona-editor/frontend/dist",
            "name": "persona-editor-frontend-prod",
            "html_route": "/apps/persona-editor",  # Serves HTML at this route with correct asset paths
            "isApp": True  # Enable catch-all routing for SPA client-side navigation
        },
        {
            "dist_path": Path(__file__).parent.parent.parent / "static/app/react-component-esm/frontend/dist",
            "route_path": "/static/app/react-component-esm/frontend/dist",
            "name": "react-component-esm-frontend-prod",
            "html_route": "/apps/react-component-esm",  # Serves HTML at this route with correct asset paths
            "isApp": True  # Enable catch-all routing for SPA client-side navigation
        },
        {
            "dist_path": Path(__file__).parent.parent.parent / "static/app/aws-s3-files/frontend/dist",
            "route_path": "/static/app/aws-s3-files/frontend/dist",
            "name": "aws-s3-files-frontend-prod",
            "html_route": "/apps/aws-s3-files",  # Serves HTML at this route with correct asset paths
            "isApp": True  # Enable catch-all routing for SPA client-side navigation
        },
        # {
        #     "dist_path": Path(__file__).parent.parent.parent / "static/app/chat-window/frontend/dist",
        #     "route_path": "/static/app/chat-window/frontend/dist",
        #     "name": "chat-window-frontend-prod",
        #     "html_route": "/apps/chat-window",  # Serves HTML at this route with correct asset paths
        #     "isApp": True  # Enable catch-all routing for SPA client-side navigation
        # },
        {
            "dist_path": Path(__file__).parent.parent.parent / "static/app/ask-ai/frontend/dist",
            "route_path": "/static/app/ask-ai/frontend/dist",
            "name": "ask-ai-frontend-prod",
            "html_route": "/apps/ask-ai",  # Serves HTML at this route with correct asset paths
            "isApp": True  # Enable catch-all routing for SPA client-side navigation
        },
        {
            "dist_path": Path(__file__).parent.parent.parent / "static/app/figma-component-inspector/frontend/dist",
            "route_path": "/static/app/figma-component-inspector/frontend/dist",
            "name": "figma-component-inspector-frontend-prod",
            "html_route": "/apps/figma-component-inspector",  # Serves HTML at this route with correct asset paths
            "isApp": True  # Enable catch-all routing for SPA client-side navigation
        }
    ])

# Add common static assets last (more general routes)
# These go after specific routes to avoid catching requests meant for specific apps
static_configs.extend([
    {
        "dist_path": Path(__file__).parent.parent.parent / "static",
        "route_path": "/static",
        "name": "static-assets",
        "html": True
    },
    {
        "dist_path": Path(__file__).parent.parent.parent / "static/test-scenarios/javascript-esm",
        "route_path": "/test-scenarios/javascript-esm",
        "name": "esm-test-scenarios",
        "html": True  # Serves index.html with relative module imports
    }
])

# Mount all configured static directories
# Note: Static files should be mounted before sub-apps to avoid route conflicts
create_static_mounts(app, static_configs, verbose=True)

# Create HTML routes for serving frontend applications
# This reads index.html from each dist directory and rewrites asset paths at runtime
# Example: /assets/index.js -> /static/app/persona-editor/frontend/dist/assets/index.js
create_html_routes(app, static_configs, verbose=True)

# ============================================================================
# Mount sub-apps
# ============================================================================

# Each sub-app is mounted at its own path and retains its own docs/endpoints
# Apps are only mounted if:
# 1. The app import was successful (app variable is not None)
# 2. The feature flag environment variable is set to enable mounting
# Set FEATURE_FLAG_APP_MOUNT_{APP_NAME}=true to enable
if hello_app and is_app_mount_enabled("HELLO"):
    app.mount("/hello", hello_app)

if persona_editor_app and is_app_mount_enabled("PERSONA_EDITOR"):
    app.mount("/api/apps/persona-editor", persona_editor_app)

if react_component_esm_app and is_app_mount_enabled("REACT_COMPONENT_ESM"):
    app.mount("/api/apps/react-component-esm", react_component_esm_app)

if aws_s3_files_app and is_app_mount_enabled("AWS_S3_FILES"):
    app.mount("/api/apps/aws-s3-files", aws_s3_files_app)

if figma_inspector_app and is_app_mount_enabled("FIGMA_COMPONENT_INSPECTOR"):
    app.mount("/api/apps/figma-component-inspector", figma_inspector_app)

# Note: ask-ai and chat-window are frontend-only apps
# Their static files are served via the static_configs configuration above
