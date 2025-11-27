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
    "google_gemini_openai_chat_completions": {},
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
