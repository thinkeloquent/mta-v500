"""
API key retrieval and AI model classes for multi-provider support.

Supports three integration patterns:
1. Direct APIs (default) - Google Gemini, OpenAI
2. Azure OpenAI - Microsoft-hosted with api-version param
3. Custom Gateway - Internal proxy with service token

Default provider: google (gemini-2.0-flash-lite via GEMINI_API_KEY)

Configuration:
- AI_PROVIDER_CONFIG env var (JSON) for full config override
- Per-provider ENV overrides:
  - GOOGLE_DEFAULT_MODEL, GOOGLE_BASE_URL
  - OPENAI_DEFAULT_MODEL, OPENAI_BASE_URL, OPENAI_EMBEDDINGS_URL
"""

import os
import json
from typing import Optional, AsyncGenerator, Callable, Any
import httpx

# =============================================================================
# Default Configuration (Pattern 1: Direct APIs)
# =============================================================================
DEFAULT_CONFIG = {
    "default_provider": "google",
    "providers": {
        "google": {
            "name": "google",
            "default_model": os.environ.get("GOOGLE_DEFAULT_MODEL", "gemini-2.0-flash-lite"),
            "baseURL": os.environ.get("GOOGLE_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai"),
            "envKey": "GEMINI_API_KEY",
            "defaultApiKey": None,  # Fallback if envKey not set
            "modelPrefixes": ["gemini-"],
            "queryParams": {},
            "headers": {},
        },
        "openai": {
            "name": "openai",
            "default_model": os.environ.get("OPENAI_DEFAULT_MODEL", "gpt-4o-mini"),
            "baseURL": os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1"),
            "embeddingsURL": os.environ.get("OPENAI_EMBEDDINGS_URL", "https://api.openai.com/v1/embeddings"),
            "envKey": "OPENAI_API_KEY",
            "defaultApiKey": None,  # Fallback if envKey not set
            "modelPrefixes": ["gpt-", "o1-", "text-"],
            "queryParams": {},
            "headers": {},
        },
    },
}

# =============================================================================
# Sample Configurations for Other Patterns
# =============================================================================

# Pattern 2: Azure OpenAI (sample - set AI_PROVIDER_CONFIG env var)
# {
#     "default_provider": "azure",
#     "providers": {
#         "azure": {
#             "name": "azure",
#             "default_model": "gpt-4o",
#             "baseURL": "https://your-resource.openai.azure.com/openai/deployments/gpt-4o",
#             "envKey": "AZURE_OPENAI_API_KEY",
#             "defaultApiKey": null,
#             "modelPrefixes": ["gpt-", "o1-"],
#             "queryParams": {"api-version": "2024-06-01"},
#             "headers": {}
#         }
#     }
# }

# Pattern 3: Custom Gateway (sample - set AI_PROVIDER_CONFIG env var)
# {
#     "default_provider": "gateway",
#     "providers": {
#         "gateway": {
#             "name": "gateway",
#             "default_model": "google/gemini-2.5-pro",
#             "baseURL": "https://yourhost/genai/google/v1/models/gemini-2.5-pro/openapi",
#             "envKey": "GATEWAY_SERVICE_TOKEN",
#             "defaultApiKey": null,
#             "modelPrefixes": ["google/", "microsoft/"],
#             "embeddingsURL": "https://yourhost/genai/microsoft/v1/models/text-embedding-3-large/openapi/deployments/text-embedding-3-large",
#             "embeddingsQueryParams": {"api-version": "2024-06-01"},
#             "queryParams": {},
#             "headers": {}
#         }
#     }
# }


# =============================================================================
# Configuration Loading
# =============================================================================
def get_config() -> dict:
    """
    Load provider configuration from AI_PROVIDER_CONFIG env var or use defaults.
    """
    config_json = os.environ.get("AI_PROVIDER_CONFIG")
    if config_json:
        try:
            return json.loads(config_json)
        except json.JSONDecodeError:
            print("WARNING: Invalid AI_PROVIDER_CONFIG JSON, using defaults")
    return DEFAULT_CONFIG


def get_providers() -> dict:
    """Get the providers dict from config."""
    return get_config().get("providers", DEFAULT_CONFIG["providers"])


def get_default_provider() -> str:
    """Get the default provider name from config."""
    return get_config().get("default_provider", DEFAULT_CONFIG["default_provider"])


def get_default_provider_config() -> dict:
    """Get the default provider's configuration."""
    provider_name = get_default_provider()
    providers = get_providers()
    return providers.get(provider_name, {})


def get_default_model() -> str:
    """Get the default model from the default provider."""
    provider_config = get_default_provider_config()
    return provider_config.get("default_model", "gemini-2.0-flash-lite")


# =============================================================================
# API Key and Provider Resolution
# =============================================================================
def get_api_key(provider_name: str) -> Optional[str]:
    """
    Get API key for a provider.

    Priority:
    1. Environment variable (envKey)
    2. Default API key from provider config (defaultApiKey)
    """
    providers = get_providers()
    provider = providers.get(provider_name)
    if not provider:
        return None

    # Try environment variable first
    env_key = provider.get("envKey")
    if env_key:
        api_key = os.environ.get(env_key)
        if api_key:
            return api_key

    # Fall back to default API key from config
    return provider.get("defaultApiKey")


def get_provider_for_model(model: str) -> tuple[str, dict]:
    """
    Determine the provider based on model name prefix.
    Routes x-ai-model header value to appropriate provider.

    Returns:
        Tuple of (provider_name, provider_config)
    """
    providers = get_providers()
    for provider_name, config in providers.items():
        for prefix in config.get("modelPrefixes", []):
            if model.startswith(prefix):
                return provider_name, config
    # Default to first provider (google in default config)
    first_provider = next(iter(providers.items()))
    return first_provider


def resolve_model(header_model: Optional[str] = None) -> str:
    """
    Resolve the model to use based on x-ai-model header or default.

    Priority:
    1. X-AI-Model header value
    2. Default model from config
    """
    return header_model or get_default_model()


def get_configured_providers() -> list[str]:
    """Return list of providers with configured API keys."""
    providers = get_providers()
    return [name for name in providers if get_api_key(name)]


# =============================================================================
# AI SDK Chat Model (OpenAI-compatible)
# =============================================================================
class AISDKChatModel:
    """
    OpenAI-compatible chat model client.

    Mirrors @ai-sdk/openai-compatible createOpenAICompatible() configuration.

    Args:
        base_url: Base URL for the API (e.g., "https://api.openai.com/v1")
        model: Model identifier (e.g., "gpt-4o", "gemini-2.0-flash-lite")
        name: Optional provider name for identification
        query_params: URL query parameters for all requests (e.g., {"api-version": "2024-06-01"})
        headers: Custom headers added after Authorization header
        fetch: Custom HTTP client callable for middleware/testing
        include_usage: Include usage data in streaming response metadata
        supports_structured_outputs: Flag indicating structured output support

    Usage:
        model = AISDKChatModel(
            base_url="https://generativelanguage.googleapis.com/v1beta/openai",
            model="gemini-2.0-flash-lite",
            headers={"X-Custom-Header": "value"},
        )
        response = model.generate("Hello, what is Python?")
    """

    def __init__(
        self,
        base_url: str,
        model: str,
        name: Optional[str] = None,
        query_params: Optional[dict] = None,
        headers: Optional[dict] = None,
        fetch: Optional[Callable[..., Any]] = None,
        include_usage: bool = False,
        supports_structured_outputs: bool = False,
    ):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.name = name
        self.query_params = query_params or {}
        self.headers = headers or {}
        self.fetch = fetch
        self.include_usage = include_usage
        self.supports_structured_outputs = supports_structured_outputs

    def _get_headers(self, api_key: str) -> dict:
        # Authorization header first, then custom headers (matches JS SDK behavior)
        base_headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        return {**base_headers, **self.headers}

    def generate(
        self,
        prompt: Optional[str] = None,
        api_key: Optional[str] = None,
        messages: Optional[list[dict]] = None,
    ) -> dict:
        """
        Generate a chat completion (non-streaming).

        Args:
            prompt: Simple user prompt (ignored if messages provided)
            api_key: API key for authentication
            messages: Full conversation history (overrides prompt if provided)
        """
        
        api_key = get_api_key('google')
        # if not api_key:
        #     provider_name, _ = get_provider_for_model(self.model)
        #     api_key = get_api_key(provider_name)

        if not api_key:
            raise ValueError(f"No API key configured for model: {self.model}")

        # Use messages if provided, otherwise create single message from prompt
        if messages:
            chat_messages = messages
        else:
            chat_messages = [{"role": "user", "content": prompt or ""}]

        url = f"{self.base_url}/chat/completions"
        body = {
            "model": self.model,
            "messages": chat_messages,
        }

        # Use custom fetch if provided, otherwise use httpx
        if self.fetch:
            response = self.fetch(
                url,
                method="POST",
                headers=self._get_headers(api_key),
                json=body,
                params=self.query_params,
            )
            return response
        else:
            response = httpx.post(
                url,
                headers=self._get_headers(api_key),
                json=body,
                params=self.query_params,
                timeout=60.0,
                verify=False,
            )
            response.raise_for_status()
            return response.json()

    async def generate_async(
        self,
        prompt: Optional[str] = None,
        api_key: Optional[str] = None,
        messages: Optional[list[dict]] = None,
    ) -> dict:
        """
        Generate a chat completion asynchronously (non-streaming).

        Args:
            prompt: Simple user prompt (ignored if messages provided)
            api_key: API key for authentication
            messages: Full conversation history (overrides prompt if provided)
        """
        api_key = get_api_key('google')

        # if not api_key:
        #     provider_name, _ = get_provider_for_model(self.model)
        #     api_key = get_api_key(provider_name)

        if not api_key:
            raise ValueError(f"No API key configured for model: {self.model}")

        # Use messages if provided, otherwise create single message from prompt
        if messages:
            chat_messages = messages
        else:
            chat_messages = [{"role": "user", "content": prompt or ""}]

        url = f"{self.base_url}/chat/completions"
        body = {
            "model": self.model,
            "messages": chat_messages,
        }

        # Use custom fetch if provided, otherwise use httpx
        if self.fetch:
            import asyncio
            if asyncio.iscoroutinefunction(self.fetch):
                response = await self.fetch(
                    url,
                    method="POST",
                    headers=self._get_headers(api_key),
                    json=body,
                    params=self.query_params,
                )
            else:
                response = self.fetch(
                    url,
                    method="POST",
                    headers=self._get_headers(api_key),
                    json=body,
                    params=self.query_params,
                )
            return response
        else:
            async with httpx.AsyncClient(timeout=60.0, verify=False) as client:
                response = await client.post(
                    url,
                    headers=self._get_headers(api_key),
                    json=body,
                    params=self.query_params,
                )
                response.raise_for_status()
                return response.json()


# =============================================================================
# AI Embedding Model
# =============================================================================
class AIEmbeddingModel:
    """
    OpenAI-compatible embedding model client.

    Mirrors @ai-sdk/openai-compatible createOpenAICompatible() configuration.

    Args:
        base_url: Base URL for the API (e.g., "https://api.openai.com/v1")
        model: Model identifier (e.g., "text-embedding-3-small")
        name: Optional provider name for identification
        query_params: URL query parameters for all requests
        headers: Custom headers added after Authorization header
        fetch: Custom HTTP client callable for middleware/testing

    Usage:
        model = AIEmbeddingModel(
            base_url="https://api.openai.com/v1",
            model="text-embedding-3-small",
            headers={"X-Custom-Header": "value"},
        )
        response = model.embed("chatbots are cool")
    """

    def __init__(
        self,
        base_url: str,
        model: str,
        name: Optional[str] = None,
        query_params: Optional[dict] = None,
        headers: Optional[dict] = None,
        fetch: Optional[Callable[..., Any]] = None,
    ):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.name = name
        self.query_params = query_params or {}
        self.headers = headers or {}
        self.fetch = fetch

    def _get_headers(self, api_key: str) -> dict:
        # Authorization header first, then custom headers (matches JS SDK behavior)
        base_headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        return {**base_headers, **self.headers}

    def embed(self, text: str, api_key: Optional[str] = None) -> dict:
        """
        Generate embeddings for input text.
        """
        if not api_key:
            provider_name, _ = get_provider_for_model(self.model)
            api_key = get_api_key(provider_name)

        if not api_key:
            raise ValueError(f"No API key configured for model: {self.model}")

        url = f"{self.base_url}/embeddings"
        body = {
            "input": text,
            "model": self.model,
        }

        # Use custom fetch if provided, otherwise use httpx
        if self.fetch:
            response = self.fetch(
                url,
                method="POST",
                headers=self._get_headers(api_key),
                json=body,
                params=self.query_params,
            )
            return response
        else:
            response = httpx.post(
                url,
                headers=self._get_headers(api_key),
                json=body,
                params=self.query_params,
                timeout=60.0,
                verify=False,
            )
            response.raise_for_status()
            return response.json()

    async def embed_async(self, text: str, api_key: Optional[str] = None) -> dict:
        """
        Generate embeddings asynchronously.
        """
        if not api_key:
            provider_name, _ = get_provider_for_model(self.model)
            api_key = get_api_key(provider_name)

        if not api_key:
            raise ValueError(f"No API key configured for model: {self.model}")

        url = f"{self.base_url}/embeddings"
        body = {
            "input": text,
            "model": self.model,
        }

        # Use custom fetch if provided, otherwise use httpx
        if self.fetch:
            import asyncio
            if asyncio.iscoroutinefunction(self.fetch):
                response = await self.fetch(
                    url,
                    method="POST",
                    headers=self._get_headers(api_key),
                    json=body,
                    params=self.query_params,
                )
            else:
                response = self.fetch(
                    url,
                    method="POST",
                    headers=self._get_headers(api_key),
                    json=body,
                    params=self.query_params,
                )
            return response
        else:
            async with httpx.AsyncClient(timeout=60.0, verify=False) as client:
                response = await client.post(
                    url,
                    headers=self._get_headers(api_key),
                    json=body,
                    params=self.query_params,
                )
                response.raise_for_status()
                return response.json()


# =============================================================================
# Streaming Chat
# =============================================================================
async def ai_chat_stream(
    prompt: Optional[str] = None,
    base_url: str = "",
    model: str = "",
    api_key: Optional[str] = None,
    query_params: Optional[dict] = None,
    headers: Optional[dict] = None,
    include_usage: bool = False,
    messages: Optional[list[dict]] = None,
) -> AsyncGenerator[str | dict, None]:
    """
    Stream chat completion chunks.

    Mirrors @ai-sdk/openai-compatible streaming behavior.

    Args:
        prompt: Simple user prompt (ignored if messages provided)
        base_url: Base URL for the API
        model: Model identifier
        api_key: API key for authentication
        query_params: URL query parameters
        headers: Custom headers added after Authorization header
        include_usage: If True, yields usage dict as final item
        messages: Full conversation history (overrides prompt if provided)

    Usage:
        # Simple prompt
        async for chunk in ai_chat_stream("Tell me a fact", base_url, model):
            print(chunk, end="", flush=True)

        # With conversation history
        async for chunk in ai_chat_stream(
            base_url=base_url,
            model=model,
            messages=[
                {"role": "user", "content": "My name is Jose"},
                {"role": "assistant", "content": "Nice to meet you, Jose!"},
                {"role": "user", "content": "What's my name?"},
            ]
        ):
            print(chunk, end="", flush=True)
    """
    if not api_key:
        provider_name, _ = get_provider_for_model(model)
        api_key = get_api_key(provider_name)

    if not api_key:
        raise ValueError(f"No API key configured for model: {model}")

    # Build headers: Authorization first, then custom headers
    base_headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    request_headers = {**base_headers, **(headers or {})}

    # Use messages if provided, otherwise create single message from prompt
    if messages:
        chat_messages = messages
    else:
        chat_messages = [{"role": "user", "content": prompt or ""}]

    url = f"{base_url.rstrip('/')}/chat/completions"
    body = {
        "model": model,
        "messages": chat_messages,
        "stream": True,
    }

    # Add stream_options for usage if requested
    if include_usage:
        body["stream_options"] = {"include_usage": True}

    usage_data = None

    async with httpx.AsyncClient(timeout=None, verify=False) as client:
        async with client.stream(
            "POST", url, headers=request_headers, json=body, params=query_params or {}
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line:
                    continue
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                        choices = chunk.get("choices", [])
                        if choices:
                            delta = choices[0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                yield content
                        # Capture usage from stream if present
                        if include_usage and "usage" in chunk:
                            usage_data = chunk["usage"]
                    except json.JSONDecodeError:
                        continue

    # Yield usage data at the end if requested and available
    if include_usage and usage_data:
        yield {"usage": usage_data}


# =============================================================================
# Factory Functions for Quick Setup
# =============================================================================
def create_chat_model(model: Optional[str] = None) -> AISDKChatModel:
    """
    Create a chat model instance with auto-configured base URL.
    """
    model = model or get_default_model()
    _, provider_config = get_provider_for_model(model)
    return AISDKChatModel(
        base_url=provider_config["baseURL"],
        model=model,
        query_params=provider_config.get("queryParams"),
    )


def create_embedding_model(
    model: str = "text-embedding-3-small",
    provider: str = "openai",
) -> AIEmbeddingModel:
    """
    Create an embedding model instance with auto-configured base URL.
    """
    providers = get_providers()
    provider_config = providers.get(provider, providers.get("openai", {}))
    base_url = provider_config.get("embeddingsURL", provider_config.get("baseURL", ""))
    return AIEmbeddingModel(
        base_url=base_url,
        model=model,
        query_params=provider_config.get("embeddingsQueryParams"),
    )


# =============================================================================
# Example Usage (when run directly)
# =============================================================================
if __name__ == "__main__":
    import asyncio

    print("=== Configuration ===")
    print(f"Default model: {get_default_model()}")
    print(f"Configured providers: {get_configured_providers()}")

    # Example: Create default chat model
    chat_model = create_chat_model()
    print(f"\nChat model: {chat_model.model}")
    print(f"Base URL: {chat_model.base_url}")

    model = AIEmbeddingModel(
        base_url="https://api.openai.com/v1",
        model="text-embedding-3-small",
        headers={"X-Custom-Header": "value"},
    )
    response = model.embed("chatbots are cool")
    
    # Example: Test with prompt (uncomment to run)
    print("\n=== Simple Chat Completion ===")
    response = chat_model.generate("Hello, what is Python?")
    print(json.dumps(response, indent=2))

    # Example: Streaming (uncomment to run)
    print("\n=== Streaming Chat ===")
    async def test_stream():
        async for chunk in ai_chat_stream(
            "Tell me a fun fact.",
            chat_model.base_url,
            chat_model.model
        ):
            print(chunk, end="", flush=True)
        print()
    asyncio.run(test_stream())
