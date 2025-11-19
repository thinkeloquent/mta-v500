"""Integration example showing how to use static_server with the main orchestrator.

This demonstrates the recommended integration pattern for the Multi-App Orchestrator.
"""

import os
import sys
from fastapi import FastAPI

# Add packages to path (same as in app/main.py)
sys.path.insert(0, './packages/static_server')

from static_server import create_static_mounts


def configure_static_files(app: FastAPI, verbose: bool = False) -> None:
    """Configure static file serving for all frontend applications.

    Args:
        app: FastAPI application instance
        verbose: Print mount information
    """
    # Define all frontend dist directories and their routes
    # Each entry maps a build output directory to a URL path
    static_configs = [
        # Persona Editor frontend
        {
            "dist_path": "app/persona-editor/frontend/dist",
            "route_path": "/static/app/persona-editor/frontend",
            "name": "persona-editor-frontend"
        },

        # Alternative: nested route pattern (app/app)
        # {
        #     "dist_path": "app/persona-editor/frontend/dist",
        #     "route_path": "/static/app/app/persona-editor/frontend",
        #     "name": "persona-editor-frontend-alt"
        # },

        # Hello app frontend (if it has one)
        # {
        #     "dist_path": "app/hello/frontend/dist",
        #     "route_path": "/static/app/hello/frontend",
        #     "name": "hello-frontend"
        # },

        # Add more apps here as needed
    ]

    # Mount all static directories
    # IMPORTANT: This should be called BEFORE mounting sub-apps
    # to avoid route conflicts
    mounted = create_static_mounts(app, static_configs, verbose=verbose)

    if verbose:
        print(f"\nTotal static directories mounted: {len(mounted)}")


def configure_dynamic_static_files(app: FastAPI, verbose: bool = False) -> None:
    """Dynamically discover and configure static files for all apps.

    This function scans the app directory and automatically configures
    static file serving for any app that has a frontend/dist directory.

    Args:
        app: FastAPI application instance
        verbose: Print mount information
    """
    app_base_dir = "app"
    static_configs = []

    # Scan for all apps with frontend/dist directories
    if os.path.exists(app_base_dir):
        for app_name in os.listdir(app_base_dir):
            app_path = os.path.join(app_base_dir, app_name)

            # Skip if not a directory
            if not os.path.isdir(app_path):
                continue

            # Check if this app has a frontend/dist directory
            dist_path = os.path.join(app_path, "frontend", "dist")
            if os.path.exists(dist_path):
                static_configs.append({
                    "dist_path": dist_path,
                    "route_path": f"/static/app/{app_name}/frontend",
                    "name": f"{app_name}-frontend"
                })

                if verbose:
                    print(f"Found frontend for: {app_name}")

    # Mount all discovered static directories
    if static_configs:
        mounted = create_static_mounts(app, static_configs, verbose=verbose)
        if verbose:
            print(f"\nTotal static directories mounted: {len(mounted)}")
    elif verbose:
        print("No frontend directories found")


# Example usage in main orchestrator app
if __name__ == "__main__":
    # Create the main orchestrator app
    app = FastAPI(title="Multi-App Orchestrator")

    # Configure static file serving
    # Option 1: Manual configuration (recommended for production)
    configure_static_files(app, verbose=True)

    # Option 2: Dynamic discovery (useful for development)
    # configure_dynamic_static_files(app, verbose=True)

    # Add your routes and sub-app mounts here
    @app.get("/")
    def root():
        return {"message": "Multi-App Orchestrator"}

    # Mount sub-apps after static files
    # app.mount("/api/apps/persona-editor", persona_editor_app)

    # Run the app
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
