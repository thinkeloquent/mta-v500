"""
Main Server Entry Point (Auto-starter)

Mirrors fastify-apps/main/server.mjs pattern.

This file:
1. Imports initialization functions from launch.py
2. Configures app-specific options
3. Creates the FastAPI app for uvicorn

For custom configurations, import from launch.py directly:

    from launch import create_main_app, initialize_app, start_server

    # Option 1: Create app, customize, then start
    app = create_main_app()
    # ... add custom routes ...
    start_server(app)

    # Option 2: Full initialization with options
    app = initialize_app({
        "app_options": {"hello": {}, "ai_sdk_chat": {}},
        "environment": "production",
    })
    start_server(app)
"""

from launch import initialize_app, start_server

# =============================================================================
# App Options Configuration
# =============================================================================
# These options are passed to individual app plugins during registration.
# Each namespace corresponds to an app defined in get_default_apps().
#
# Available namespaces:
#   - hello: Options for hello app
#   - persona_editor: Options for persona-editor app
#   - aws_s3_files: Options for aws-s3-files app
#   - react_component_esm: Options for react-component-esm app
#   - figma_component_inspector: Options for figma-component-inspector app
#   - ai_sdk_chat: Options for ai-sdk-chat app
#   - google_gemini_openai_chat_completions: Options for google-gemini app
# =============================================================================

# Example: Per-request API key resolver for Gemini
#
# API key precedence:
# 1. X-GEMINI-OPENAI-API-KEY header (override)
# 2. get_api_key_for_request(request) function (per-request)
# 3. GEMINI_API_KEY environment variable (permanent token)
#
# async def get_gemini_api_key_for_request(request):
#     """
#     Example: Get API key from user session or other context.
#
#     Args:
#         request: FastAPI Request object
#
#     Returns:
#         API key string for this request
#     """
#     # Example: Get API key from user session
#     user_id = getattr(request.state, "user_id", None)
#     if user_id:
#         return await get_user_api_key(user_id)
#     # Fallback to environment variable
#     return os.environ.get("GEMINI_API_KEY")

app_options = {
    # Hello app options
    "hello": {},

    # Persona editor options
    "persona_editor": {},

    # AWS S3 files options
    "aws_s3_files": {},

    # React component ESM options
    "react_component_esm": {},

    # Figma component inspector options
    "figma_component_inspector": {},

    # AI SDK Chat options
    "ai_sdk_chat": {},

    # Google Gemini OpenAI Chat Completions options
    "google_gemini_openai_chat_completions": {
        # "get_api_key_for_request": get_gemini_api_key_for_request,
    },
}

# =============================================================================
# Initialize App
# =============================================================================

# For uvicorn to find the app (uvicorn main:app)
app = initialize_app({"app_options": app_options})

# =============================================================================
# Direct Execution
# =============================================================================

if __name__ == "__main__":
    start_server(app, {"port": 8080, "reload": True})
