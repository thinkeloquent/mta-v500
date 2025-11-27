"""
Extended Server Entry Point

Mirrors fastify-apps/server/server.mjs pattern.

This is an alternative entry point that uses the public API from __init__.py.
It demonstrates how to create a customized server configuration.

Usage:
    # Via uvicorn
    uvicorn server.server:app --host 0.0.0.0 --port 8080

    # Via python
    python -m server.server
"""

from . import initialize_app, start_server

# =============================================================================
# App Options Configuration (simplified variant)
# =============================================================================
# This is a simplified configuration compared to main.py.
# Customize this for different deployment scenarios.

app_options = {
    # Enable only specific apps
    "hello": {},
    "ai_sdk_chat": {},
    "google_gemini_openai_chat_completions": {},
}

# =============================================================================
# Initialize App
# =============================================================================

# For uvicorn to find the app (uvicorn server.server:app)
app = initialize_app({"app_options": app_options})

# =============================================================================
# Direct Execution
# =============================================================================

if __name__ == "__main__":
    start_server(app, {"port": 8080})
