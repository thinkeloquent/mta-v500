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

import os

from . import initialize_app, start_server

# =============================================================================
# App Options Configuration (simplified variant)
# =============================================================================
# This is a simplified configuration compared to main.py.
# Customize this for different deployment scenarios.

# Example: Per-request API key resolver for Gemini
#
# API key precedence:
# 1. X-GEMINI-OPENAI-API-KEY header (override)
# 2. get_api_key_for_request(request) function (per-request)
# 3. GEMINI_API_KEY environment variable (permanent token)
#
async def get_gemini_api_key_for_request(request):
    """Get API key from user session or other context."""
    # user_id = getattr(request.state, "user_id", None)
    # if user_id:
    #     return await get_user_api_key(user_id)
    return os.environ.get("GEMINI_API_KEY")

app_options = {
    # Enable only specific apps
    "hello": {},
    "ai_sdk_chat": {},
    "google_gemini_openai_chat_completions": {
        "get_api_key_for_request": get_gemini_api_key_for_request,
        # "proxy": None,     # Proxy URL (e.g., "http://proxy:8080")
        # "cert": None,      # Path to client certificate file or tuple (cert, key)
        # "ca_bundle": None, # Path to CA bundle file
    },
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
