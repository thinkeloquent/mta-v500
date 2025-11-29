"""
FastAPI Server Launcher - Core initialization and lifecycle management.

Mirrors fastify-apps/main/launch.mjs pattern.

This module provides the server initialization and launch functionality.
It can be imported by other modules to:
1. Create a configured FastAPI instance
2. Extend the server with additional plugins/routes
3. Start the server

Usage:
    from launch import initialize_app, start_server, bootstrap

    # Option 1: Full initialization + start
    app = initialize_app()
    start_server(app)

    # Option 2: Create app, extend it, then start
    app = create_main_app()
    # ... add custom routes ...
    start_server(app)

    # Option 3: One-call bootstrap
    bootstrap()
"""

import os
import sys
import importlib
import importlib.util
import base64
from pathlib import Path
from contextlib import asynccontextmanager, AsyncExitStack
from typing import List, Dict, Any, Optional, Callable

from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.openapi.utils import get_openapi
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

# Ensure orchestrator's parent directory is in sys.path
_orchestrator_parent = str(Path(__file__).parent.parent)
if _orchestrator_parent not in sys.path:
    sys.path.insert(0, _orchestrator_parent)


# =============================================================================
# Secret Loading - Must run BEFORE any sub-app imports
# =============================================================================

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
        os.environ.get("ENV_SECRET_FILE", "/etc/secrets/MTA_DEV"),
        Path.cwd() / ".env",
    ]

    loaded = False
    for env_file in env_files_to_try:
        env_file_path = Path(env_file)

        print(f"\n[ENV] Checking: {env_file_path}")
        print(f"[ENV] Exists: {env_file_path.exists()}")

        if env_file_path.exists():
            try:
                load_dotenv(dotenv_path=env_file_path, override=True)
                print(f"[ENV] Loaded secrets from {env_file_path}")

                content = env_file_path.read_text()
                lines = [l.strip() for l in content.split('\n') if l.strip() and not l.startswith('#') and '=' in l]
                print(f"[ENV] Loaded {len(lines)} environment variables")

                keys = [l.split('=')[0] for l in lines[:10]]
                print(f"[ENV] Sample keys: {', '.join(keys)}{'...' if len(lines) > 10 else ''}")

                loaded = True
                break

            except Exception as e:
                print(f"[ENV] ERROR loading .env file: {str(e)}")
                import traceback
                traceback.print_exc()
        else:
            print(f"[ENV] File not found, trying next location...")

    if not loaded:
        print(f"\n[ENV] WARNING: No .env file found in any location")
        print(f"[ENV] Relying on system environment variables")

    # Validate expected variables
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
            print(f"[ENV]   Present: {', '.join(present)}")
        if missing:
            print(f"[ENV]   Missing: {', '.join(missing)}")
            all_present = False

    print("\n" + "=" * 80)
    if all_present:
        print("[STARTUP] All expected secrets are present in os.environ")
    else:
        print("[STARTUP] WARNING: Some expected secrets are missing")
    print("[STARTUP] BLOCKING SECRET LOADING - COMPLETE")
    print("=" * 80 + "\n")
    return True


def log_feature_flags() -> None:
    """
    Log feature flags from common/config/env_feature_flag.json at startup.

    This shows which apps are enabled/disabled for mounting.
    """
    import json

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
            env_key = f"FEATURE_FLAG_APP_MOUNT_{app_name}"
            env_override = os.environ.get(env_key)

            if env_override is not None:
                actual_value = env_override.lower() in ('true', '1', 'yes', 'on')
                status = "ENABLED (ENV)" if actual_value else "DISABLED (ENV)"
                if actual_value:
                    enabled.append(app_name)
                else:
                    disabled.append(app_name)
                print(f"[FEATURE_FLAGS]   {app_name}: {status} (overridden by {env_key}={env_override})")
            else:
                status = "ENABLED" if is_enabled else "DISABLED"
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
        print(f"[FEATURE_FLAGS] WARNING: Config file not found at {config_path}")
        print(f"[FEATURE_FLAGS] All apps will be disabled by default")
    except Exception as e:
        print(f"[FEATURE_FLAGS] ERROR: {e}")

    print("=" * 80 + "\n")


# =============================================================================
# Execute blocking secret load at module level
# =============================================================================
_secrets_loaded = load_secrets_blocking()
log_feature_flags()


# =============================================================================
# Sub-App Import Helper
# =============================================================================

def import_sub_app(app_name: str, app_dir_name: str) -> Optional[FastAPI]:
    """
    Dynamically import a sub-app with namespace isolation.

    Handles the 'app' package namespace conflict by temporarily manipulating
    sys.path and sys.modules.

    Args:
        app_name: Human-readable name for logging
        app_dir_name: Directory name under fastapi-apps/ (e.g., "app_hello")

    Returns:
        FastAPI app instance or None if import failed
    """
    app_dir = Path(__file__).parent.parent / app_dir_name

    if not app_dir.exists():
        print(f"Warning: App directory not found: {app_dir}")
        return None

    # Save original state
    original_sys_path = sys.path.copy()
    original_cwd = os.getcwd()
    original_app_modules = {k: v for k, v in sys.modules.items() if k.startswith('app')}

    try:
        # Change to app directory and modify sys.path
        os.chdir(str(app_dir))
        sys.path.insert(0, str(app_dir))

        # Remove orchestrator's app modules
        for key in list(sys.modules.keys()):
            if key.startswith('app.') or key == 'app':
                del sys.modules[key]

        try:
            # Import the sub-app
            import app.main as sub_app_main
            sub_app = sub_app_main.app

            # Save sub-app's modules with unique prefix
            sub_app_modules = {k: v for k, v in sys.modules.items() if k.startswith('app.')}
            for key, value in sub_app_modules.items():
                sys.modules[f"{app_name.replace('-', '_')}_{key}"] = value

            return sub_app

        finally:
            # Restore original state
            os.chdir(original_cwd)
            sys.path = original_sys_path

            # Remove sub-app's app modules
            for key in list(sys.modules.keys()):
                if key.startswith('app.') and key not in original_app_modules:
                    del sys.modules[key]

            # Restore orchestrator's app modules
            sys.modules.update(original_app_modules)

    except (ImportError, FileNotFoundError, AttributeError) as e:
        print(f"Warning: Could not load {app_name}: {e}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        try:
            os.chdir(original_cwd)
        except:
            pass


# =============================================================================
# Import all sub-apps at module level (after secrets are loaded)
# =============================================================================

# Import using helper function
hello_app = import_sub_app("hello", "app_hello")
aws_s3_files_app = import_sub_app("aws-s3-files", "app_aws_s3_files")
persona_editor_app = import_sub_app("persona-editor", "app_persona_editor")
react_component_esm_app = import_sub_app("react-component-esm", "app_react_component_esm")
figma_inspector_app = import_sub_app("figma-inspector", "app_figma_component_inspector")
ai_sdk_chat_app = import_sub_app("ai-sdk-chat", "app_ai_sdk_chat")
google_gemini_app = import_sub_app("google-gemini", "app_google_gemini_openai_chat_completions")

# Frontend-only apps (no backend to import)
ask_ai_app = None
chat_window_app = None

# Store imported apps for access
_imported_apps = {
    "hello": hello_app,
    "aws-s3-files": aws_s3_files_app,
    "persona-editor": persona_editor_app,
    "react-component-esm": react_component_esm_app,
    "figma-component-inspector": figma_inspector_app,
    "ai-sdk-chat": ai_sdk_chat_app,
    "google-gemini-openai-chat-completions": google_gemini_app,
}


def get_imported_apps() -> Dict[str, Optional[FastAPI]]:
    """Get dictionary of imported sub-apps."""
    return _imported_apps.copy()


# =============================================================================
# Log apps status
# =============================================================================

def log_apps_status() -> None:
    """Log the import and mount status of all FastAPI apps."""
    from env_feature_flag import is_app_mount_enabled

    print("\n" + "=" * 80)
    print("[STARTUP] FASTAPI APPS STATUS")
    print("=" * 80)

    apps_info = [
        {"name": "app_hello", "app": hello_app, "flag": "HELLO", "mount_path": "/hello"},
        {"name": "app_aws_s3_files", "app": aws_s3_files_app, "flag": "AWS_S3_FILES", "mount_path": "/api/apps/aws-s3-files"},
        {"name": "app_persona_editor", "app": persona_editor_app, "flag": "PERSONA_EDITOR", "mount_path": "/api/apps/persona-editor"},
        {"name": "app_react_component_esm", "app": react_component_esm_app, "flag": "REACT_COMPONENT_ESM", "mount_path": "/api/apps/react-component-esm"},
        {"name": "app_figma_component_inspector", "app": figma_inspector_app, "flag": "FIGMA_COMPONENT_INSPECTOR", "mount_path": "/api/apps/figma-component-inspector"},
        {"name": "app_ask_ai", "app": ask_ai_app, "flag": "ASK_AI", "mount_path": None, "frontend_only": True},
        {"name": "app_chat_window", "app": chat_window_app, "flag": "CHAT_WINDOW", "mount_path": None, "frontend_only": True},
        {"name": "app_ai_sdk_chat", "app": ai_sdk_chat_app, "flag": "AI_SDK_CHAT", "mount_path": "/api/apps/ai-sdk-chat"},
        {"name": "app_google_gemini_openai_chat_completions", "app": google_gemini_app, "flag": "GOOGLE_GEMINI_OPENAI_CHAT_COMPLETIONS", "mount_path": "/api/apps/google-gemini-openai-chat-completions"},
    ]

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

        if frontend_only:
            imported = "N/A"
        elif app_instance is not None:
            imported = "Yes"
            imported_count += 1
        else:
            imported = "No"

        if frontend_only:
            mounted = "Frontend-only (static files)"
        elif app_instance is not None and is_app_mount_enabled(flag):
            mounted = f"Yes {mount_path}"
            mounted_count += 1
        elif app_instance is not None:
            mounted = "No (disabled by feature flag)"
        else:
            mounted = "No"

        print(f"{name:<35} {imported:<10} {mounted:<40}")

    print("-" * 85)
    print(f"\nSummary: {imported_count}/6 apps imported, {mounted_count}/6 apps mounted")
    print("Note: app-ask-ai and app-chat-window are frontend-only (served as static files)")
    print("=" * 80 + "\n")


# Log apps status after all imports
log_apps_status()


# =============================================================================
# Lifespan Helpers
# =============================================================================

@asynccontextmanager
async def _nested(*managers):
    """Helper to chain multiple async context managers."""
    async with AsyncExitStack() as stack:
        for manager in managers:
            await stack.enter_async_context(manager)
        yield


def combine_lifespans(*lifespans):
    """Combine multiple lifespan functions into a single unified handler."""
    @asynccontextmanager
    async def combined(app):
        managers = [ls(app) for ls in lifespans]
        async with _nested(*managers):
            yield
    return combined


# =============================================================================
# Default Apps Configuration
# =============================================================================

def get_default_apps(app_options: Dict[str, Any] = None) -> List[Dict]:
    """
    Returns list of default internal apps with metadata.
    Mirrors Fastify's getDefaultApps() pattern.
    """
    app_options = app_options or {}
    return [
        {
            "name": "hello",
            "flag": "HELLO",
            "mount_path": "/hello",
            "app": hello_app,
            "options": app_options.get("hello", {}),
            "metadata": {"version": "1.0.0", "description": "Hello world example"},
        },
        {
            "name": "aws-s3-files",
            "flag": "AWS_S3_FILES",
            "mount_path": "/api/apps/aws-s3-files",
            "app": aws_s3_files_app,
            "options": app_options.get("aws_s3_files", {}),
            "metadata": {"version": "1.0.0", "description": "AWS S3 file manager"},
        },
        {
            "name": "persona-editor",
            "flag": "PERSONA_EDITOR",
            "mount_path": "/api/apps/persona-editor",
            "app": persona_editor_app,
            "options": app_options.get("persona_editor", {}),
            "metadata": {"version": "1.0.0", "description": "Persona editor"},
        },
        {
            "name": "react-component-esm",
            "flag": "REACT_COMPONENT_ESM",
            "mount_path": "/api/apps/react-component-esm",
            "app": react_component_esm_app,
            "options": app_options.get("react_component_esm", {}),
            "metadata": {"version": "1.0.0", "description": "React component ESM viewer"},
        },
        {
            "name": "figma-component-inspector",
            "flag": "FIGMA_COMPONENT_INSPECTOR",
            "mount_path": "/api/apps/figma-component-inspector",
            "app": figma_inspector_app,
            "options": app_options.get("figma_component_inspector", {}),
            "metadata": {"version": "1.0.0", "description": "Figma component inspector"},
        },
        {
            "name": "ai-sdk-chat",
            "flag": "AI_SDK_CHAT",
            "mount_path": "/api/apps/ai-sdk-chat",
            "app": ai_sdk_chat_app,
            "options": app_options.get("ai_sdk_chat", {}),
            "metadata": {"version": "1.0.0", "description": "AI SDK chat with multi-provider support"},
        },
        {
            "name": "google-gemini-openai-chat-completions",
            "flag": "GOOGLE_GEMINI_OPENAI_CHAT_COMPLETIONS",
            "mount_path": "/api/apps/google-gemini-openai-chat-completions",
            "app": google_gemini_app,
            "options": app_options.get("google_gemini_openai_chat_completions", {}),
            "metadata": {"version": "1.0.0", "description": "Google Gemini via OpenAI-compatible API"},
        },
    ]


# =============================================================================
# OpenAPI Tags Metadata
# =============================================================================

def get_openapi_tags() -> List[Dict]:
    """Get OpenAPI tags metadata for documentation."""
    return [
        {
            "name": "system",
            "description": "System-level endpoints for orchestrator information and metadata.",
        },
        {
            "name": "health",
            "description": "Health check endpoints for monitoring service availability.",
        },
        {
            "name": "secrets",
            "description": "Vault secrets management endpoints.",
        },
    ]


# =============================================================================
# Middleware Classes
# =============================================================================

class UnderConstructionMiddleware(BaseHTTPMiddleware):
    """
    Middleware to protect entire application with basic authentication during construction.
    """
    EXEMPT_PATHS = {"/health", "/status", "/ping"}

    async def dispatch(self, request: Request, call_next):
        construction_key = os.environ.get("UNDER_CONSTRUCTION_KEY")

        if not construction_key:
            return await call_next(request)

        if request.url.path in self.EXEMPT_PATHS:
            return await call_next(request)

        auth_header = request.headers.get("Authorization")

        if not auth_header or not auth_header.startswith("Basic "):
            return Response(
                content="Under Construction - Authentication Required",
                status_code=401,
                headers={"WWW-Authenticate": 'Basic realm="Under Construction"'},
            )

        try:
            from auth import verify_construction_credentials
            auth_decoded = base64.b64decode(auth_header[6:]).decode("utf-8")
            username, password = auth_decoded.split(":", 1)
            credentials = HTTPBasicCredentials(username=username, password=password)

            if not verify_construction_credentials(credentials, construction_key):
                return Response(
                    content="Invalid Credentials",
                    status_code=401,
                    headers={"WWW-Authenticate": 'Basic realm="Under Construction"'},
                )

            return await call_next(request)

        except (ValueError, UnicodeDecodeError):
            return Response(
                content="Invalid Authorization Header",
                status_code=401,
                headers={"WWW-Authenticate": 'Basic realm="Under Construction"'},
            )


class NoCacheMiddleware(BaseHTTPMiddleware):
    """Middleware to disable browser caching for all responses."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response


# =============================================================================
# Middleware Registration
# =============================================================================

def register_no_cache_middleware(app: FastAPI) -> None:
    """Register NoCacheMiddleware."""
    app.add_middleware(NoCacheMiddleware)


def register_under_construction_auth(app: FastAPI) -> None:
    """Register UnderConstructionMiddleware if UNDER_CONSTRUCTION_KEY is set."""
    app.add_middleware(UnderConstructionMiddleware)


def register_cors_middleware(app: FastAPI, environment: str = "development") -> None:
    """Register CORS middleware using enterprise policy engine."""
    try:
        from core.cors import create_cors_middleware, get_cors_config_summary, load_cors_config
    except ModuleNotFoundError:
        from app.core.cors import create_cors_middleware, get_cors_config_summary, load_cors_config

    USE_CORS_ENGINE = os.environ.get("USE_CORS_ENGINE", "true").lower() == "true"

    if USE_CORS_ENGINE:
        try:
            cors_config = load_cors_config(environment=environment)
            create_cors_middleware(app, config=cors_config, app_name="orchestrator")
            summary = get_cors_config_summary(cors_config, environment)
            print("\n" + summary + "\n")
        except Exception as e:
            print(f"ERROR: Failed to initialize CORS policy engine: {e}")
            print("Falling back to legacy CORS configuration...")
            _add_legacy_cors(app)
    else:
        print("WARNING: Using legacy CORS configuration. Set USE_CORS_ENGINE=true for enterprise features.")
        _add_legacy_cors(app)


def _add_legacy_cors(app: FastAPI) -> None:
    """Add legacy CORS middleware."""
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


# =============================================================================
# App Registration
# =============================================================================

def register_internal_apps(
    app: FastAPI,
    apps: List[Dict] = None,
    app_options: Dict[str, Any] = None
) -> Dict[str, FastAPI]:
    """
    Mount internal sub-apps.
    Passes options from app_options to each sub-app via app.state.plugin_options.

    Args:
        app: Parent FastAPI application
        apps: List of app configs (uses get_default_apps if None)
        app_options: Dict mapping app names to their options
            e.g., {"google_gemini_openai_chat_completions": {"get_api_key_for_request": ...}}

    Returns:
        Dict of successfully mounted apps.
    """
    from env_feature_flag import is_app_mount_enabled

    apps = apps or get_default_apps(app_options)
    app_options = app_options or {}
    mounted = {}

    for app_config in apps:
        sub_app = app_config.get("app")
        if sub_app and is_app_mount_enabled(app_config["flag"]):
            # Pass options to sub-app via state
            # Use underscore version of name for dict key lookup
            options_key = app_config["name"].replace("-", "_")
            sub_app_options = app_options.get(options_key, {})
            if sub_app_options:
                if not hasattr(sub_app, "state"):
                    sub_app.state = type("State", (), {})()
                sub_app.state.plugin_options = sub_app_options

            app.mount(app_config["mount_path"], sub_app)
            mounted[app_config["name"]] = sub_app

    return mounted


def register_health_routes(app: FastAPI, mounted_apps: Dict[str, FastAPI] = None) -> None:
    """Register / and /health endpoints."""
    from models import RootResponse, AppsMetadataResponse, HealthResponse

    mounted_apps = mounted_apps or {}

    @app.get(
        "/",
        response_model=RootResponse,
        tags=["system"],
        summary="Get orchestrator information",
    )
    async def root():
        build_id = os.environ.get("BUILD_ID", "0.0.0")
        build_parts = build_id.split("//") if build_id else []
        return {
            "status": "ok",
            "message": "Multi-App Orchestrator",
            "BUILD_COMMIT": os.environ.get("BUILD_COMMIT", ""),
            "BUILD_DATE": os.environ.get("BUILD_DATE", ""),
            "BUILD_ID": os.environ.get("BUILD_ID", "0.0.0"),
            "BUILD_VERSION": os.environ.get("BUILD_VERSION", ""),
            "id": build_id,
            "build": build_parts
        }
    
    @app.get(
        "/~/sys/metadata/apps",
        response_model=AppsMetadataResponse,
        tags=["system"],
        summary="Get metadata about all mounted applications",
    )
    async def get_apps_metadata():
        sub_apps = []
        for name, sub_app in mounted_apps.items():
            if sub_app:
                # Find mount path from default apps
                for default_app in get_default_apps():
                    if default_app["name"] == name:
                        path = default_app["mount_path"]
                        sub_apps.append({
                            "name": name,
                            "path": path,
                            "docs": f"{path}/docs",
                            "health": f"{path}/health"
                        })
                        break

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
    )
    async def health():
        sub_app_health = {}
        for name, sub_app in mounted_apps.items():
            if sub_app:
                sub_app_health[name] = "mounted"

        return {
            "status": "healthy",
            "service": "orchestrator",
            "sub_apps": sub_app_health
        }


def register_documentation_routes(app: FastAPI) -> None:
    """Register protected /docs, /redoc, /openapi.json if auth enabled."""
    from auth import verify_docs_credentials, is_docs_auth_enabled

    if not is_docs_auth_enabled():
        print("Documentation endpoints DISABLED (Set DOCS_AUTH_USERNAME and DOCS_AUTH_PASSWORD to enable)")
        return

    print("Documentation endpoints ENABLED (DOCS_AUTH credentials configured)")

    @app.get("/docs", include_in_schema=False)
    async def get_documentation(_: bool = Depends(verify_docs_credentials)):
        return get_swagger_ui_html(
            openapi_url="/openapi.json",
            title=app.title + " - Swagger UI",
            oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
            swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui-bundle.js",
            swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui.css",
        )

    @app.get("/redoc", include_in_schema=False)
    async def get_redoc_documentation(_: bool = Depends(verify_docs_credentials)):
        return get_redoc_html(
            openapi_url="/openapi.json",
            title=app.title + " - ReDoc",
            redoc_js_url="https://cdn.jsdelivr.net/npm/redoc@2.1.3/bundles/redoc.standalone.js",
        )

    @app.get("/openapi.json", include_in_schema=False)
    async def get_open_api_endpoint(_: bool = Depends(verify_docs_credentials)):
        return get_openapi(
            title=app.title,
            version=app.version,
            openapi_version=app.openapi_version,
            description=app.description,
            routes=app.routes,
            tags=app.openapi_tags,
            servers=app.servers,
        )


# =============================================================================
# Static Files & Frontend
# =============================================================================

def get_static_configs(mta_env: str = None) -> List[Dict]:
    """Get static file configurations based on environment."""
    base_path = Path(__file__).parent.parent

    static_configs = []

    if not mta_env:
        # Development: load from individual frontend/dist directories
        print("MTA_ENV not set: Mounting frontend application static files")
        static_configs.extend([
            {"dist_path": base_path / "app_persona_editor/frontend/dist", "route_path": "/static/app/persona-editor/frontend/dist", "name": "persona-editor-frontend", "html_route": "/apps/persona-editor", "isApp": True},
            {"dist_path": base_path / "app_react_component_esm/frontend/dist", "route_path": "/static/app/react-component-esm/frontend/dist", "name": "react-component-esm-frontend", "html_route": "/apps/react-component-esm", "isApp": True},
            {"dist_path": base_path / "app_aws_s3_files/frontend/dist", "route_path": "/static/app/aws-s3-files/frontend/dist", "name": "aws-s3-files-frontend", "html_route": "/apps/aws-s3-files", "isApp": True},
            {"dist_path": base_path / "app_chat_window/frontend/dist", "route_path": "/static/app/chat-window/frontend/dist", "name": "chat-window-frontend", "html_route": "/apps/chat-window", "isApp": True},
            {"dist_path": base_path / "app_ask_ai/frontend/dist", "route_path": "/static/app/ask-ai/frontend/dist", "name": "ask-ai-frontend", "html_route": "/apps/ask-ai", "isApp": True},
            {"dist_path": base_path / "app_figma_component_inspector/frontend/dist", "route_path": "/static/app/figma-component-inspector/frontend/dist", "name": "figma-component-inspector-frontend", "html_route": "/apps/figma-component-inspector", "isApp": True},
            {"dist_path": base_path / "app_ai_sdk_chat/frontend/dist", "route_path": "/static/app/ai-sdk-chat/frontend/dist", "name": "ai-sdk-chat-frontend", "html_route": "/apps/ai-sdk-chat", "isApp": True},
            {"dist_path": base_path / "app_google_gemini_openai_chat_completions/frontend/dist", "route_path": "/static/app/google-gemini-openai-chat-completions/frontend/dist", "name": "google-gemini-openai-chat-completions-frontend", "html_route": "/apps/google-gemini-openai-chat-completions", "isApp": True},
        ])
    else:
        # Production: load from centralized static directory
        print(f"MTA_ENV={mta_env}: Loading production frontend from static directory")
        static_root = base_path.parent / "static"
        static_configs.extend([
            {"dist_path": static_root / "app/persona-editor/frontend/dist", "route_path": "/static/app/persona-editor/frontend/dist", "name": "persona-editor-frontend-prod", "html_route": "/apps/persona-editor", "isApp": True},
            {"dist_path": static_root / "app/react-component-esm/frontend/dist", "route_path": "/static/app/react-component-esm/frontend/dist", "name": "react-component-esm-frontend-prod", "html_route": "/apps/react-component-esm", "isApp": True},
            {"dist_path": static_root / "app/aws-s3-files/frontend/dist", "route_path": "/static/app/aws-s3-files/frontend/dist", "name": "aws-s3-files-frontend-prod", "html_route": "/apps/aws-s3-files", "isApp": True},
            {"dist_path": static_root / "app/ask-ai/frontend/dist", "route_path": "/static/app/ask-ai/frontend/dist", "name": "ask-ai-frontend-prod", "html_route": "/apps/ask-ai", "isApp": True},
            {"dist_path": static_root / "app/figma-component-inspector/frontend/dist", "route_path": "/static/app/figma-component-inspector/frontend/dist", "name": "figma-component-inspector-frontend-prod", "html_route": "/apps/figma-component-inspector", "isApp": True},
            {"dist_path": static_root / "app/ai-sdk-chat/frontend/dist", "route_path": "/static/app/ai-sdk-chat/frontend/dist", "name": "ai-sdk-chat-frontend-prod", "html_route": "/apps/ai-sdk-chat", "isApp": True},
            {"dist_path": static_root / "app/google-gemini-openai-chat-completions/frontend/dist", "route_path": "/static/app/google-gemini-openai-chat-completions/frontend/dist", "name": "google-gemini-openai-chat-completions-frontend-prod", "html_route": "/apps/google-gemini-openai-chat-completions", "isApp": True},
        ])

    # Common static assets
    static_configs.extend([
        {"dist_path": base_path.parent / "static", "route_path": "/static", "name": "static-assets", "html": True},
        {"dist_path": base_path.parent / "static/test-scenarios/javascript-esm", "route_path": "/test-scenarios/javascript-esm", "name": "esm-test-scenarios", "html": True},
    ])

    return static_configs


def register_static_files(app: FastAPI, configs: List[Dict] = None) -> None:
    """Mount static directories and create HTML routes."""
    from static_server import create_static_mounts, create_html_routes

    mta_env = os.environ.get("MTA_ENV")
    configs = configs or get_static_configs(mta_env)

    create_static_mounts(app, configs, verbose=True)
    create_html_routes(app, configs, verbose=True)


# =============================================================================
# Route Logger
# =============================================================================

def log_routes(app: FastAPI) -> None:
    """Log all registered routes at runtime."""
    from fastapi.routing import APIRoute, Mount
    from starlette.routing import Route
    from auto_register_routes import get_load_result

    routes_list = []

    def extract_routes(routes, prefix=""):
        for route in routes:
            if isinstance(route, APIRoute):
                for method in route.methods:
                    path = prefix + route.path
                    routes_list.append((method, path))
            elif isinstance(route, Mount):
                mount_path = prefix + route.path
                if hasattr(route.app, 'routes'):
                    extract_routes(route.app.routes, mount_path)
            elif isinstance(route, Route):
                path = prefix + route.path
                if hasattr(route, 'methods') and route.methods:
                    for method in route.methods:
                        routes_list.append((method, path))
                else:
                    routes_list.append(('GET', path))

    extract_routes(app.routes)
    routes_list.sort(key=lambda x: (x[1], x[0]))

    load_result = get_load_result()
    if load_result and load_result.success:
        print("\n" + "=" * 60)
        print("Auto-loaded Routes:")
        print("=" * 60)
        for route_info in load_result.success:
            prefix = route_info.prefix
            tags = route_info.tags
            filename = route_info.filename
            tags_str = f" [{', '.join(tags)}]" if tags else ""
            print(f"{prefix:30} {filename}{tags_str}")
        print("=" * 60)
        print(f"Total: {len(load_result.success)} auto-loaded route module(s)\n")

    print("=" * 60)
    print("Registered Routes:")
    print("=" * 60)
    for method, path in routes_list:
        print(f"{method:8} {path}")
    print("=" * 60)
    print(f"Total: {len(routes_list)} routes\n")


# =============================================================================
# App Creation
# =============================================================================

def create_main_app(options: Dict[str, Any] = None) -> FastAPI:
    """
    Create and configure FastAPI instance (does NOT start server).
    Returns configured app without mounting sub-apps.
    """
    options = options or {}

    # Create lifespan handlers
    lifespans = []

    @asynccontextmanager
    async def route_logging_lifespan(app):
        log_routes(app)
        yield

    lifespans.append(route_logging_lifespan)

    if options.get("lifespans"):
        lifespans.extend(options["lifespans"])

    lifespan = combine_lifespans(*lifespans) if lifespans else None

    app = FastAPI(
        lifespan=lifespan,
        title=options.get("title", "Multi-App Orchestrator"),
        description=options.get("description", """
# Multi-App Orchestrator API

A FastAPI-based orchestrator that manages and routes requests to multiple independent sub-applications.
        """),
        version=options.get("version", "0.1.0"),
        contact=options.get("contact", {"name": "API Support", "email": "support@example.com"}),
        license_info=options.get("license_info", {"name": "MIT"}),
        docs_url=None,
        redoc_url=None,
        openapi_tags=get_openapi_tags(),
    )

    # Store settings on app.state
    app.state.settings = options.get("settings", {})

    return app


# =============================================================================
# Server Initialization & Lifecycle
# =============================================================================

def initialize_app(options: Dict[str, Any] = None) -> FastAPI:
    """
    Full initialization with all defaults.
    Creates app, registers middleware, apps, routes.
    """
    options = options or {}

    # Create app
    app = create_main_app(options)

    # Register middleware (order matters - reverse order of execution)
    register_no_cache_middleware(app)
    register_under_construction_auth(app)
    register_cors_middleware(app, options.get("environment", os.environ.get("PYTHON_ENV", "development")))

    # Clear app modules from sub-app contamination before auto-loading routes
    _orchestrator_parent_dir = str(Path(__file__).parent.parent)
    _modules_to_delete = [k for k in sys.modules.keys() if k == 'app' or k.startswith('app.')]
    for _mod in _modules_to_delete:
        if _mod in sys.modules:
            del sys.modules[_mod]
    sys.path = [_orchestrator_parent_dir] + [p for p in sys.path if p != _orchestrator_parent_dir]

    # Auto-load routes
    from auto_register_routes import auto_register_routes
    auto_register_routes(app, routes_package="app.routes", verbose=True)

    # Register documentation
    register_documentation_routes(app)

    # Mount sub-apps
    mounted = register_internal_apps(app, app_options=options.get("app_options"))
    app.state.mounted_apps = mounted

    # Static files (before health routes to avoid conflicts)
    register_static_files(app)

    # Health routes
    register_health_routes(app, mounted)

    return app


def start_server(app: FastAPI, options: Dict[str, Any] = None) -> None:
    """Start uvicorn server."""
    import uvicorn
    options = options or {}
    uvicorn.run(
        app,
        host=options.get("host", "0.0.0.0"),
        port=options.get("port", 8080),
        reload=options.get("reload", False),
    )


def bootstrap(options: Dict[str, Any] = None) -> FastAPI:
    """One-call full bootstrap - initialize and start."""
    app = initialize_app(options)
    start_server(app, options)
    return app
