"""
google_gemini_openai_client - Chat completion API

Provides chat completion functionality with structured output support.
"""

from __future__ import annotations

import json
from typing import Any

import httpx

from .models import (
    ApiKeyResolver,
    ChatCompletionResponse,
    Choice,
    Message,
    ResponseMessage,
    Usage,
    ResponseFormat,
    JsonSchema,
    StructuredOutputSchema,
    StructuredOutputResult,
)
from .config import DEFAULT_MODEL

# Header name for API key override
API_KEY_HEADER = "X-GEMINI-OPENAI-API-KEY"


async def resolve_api_key(
    client: httpx.AsyncClient,
    request: Any | None = None,
    request_api_key: str | None = None,
    get_api_key_for_request: ApiKeyResolver | None = None,
) -> str:
    """
    Resolves API key with precedence order:
    1. request_api_key (header override X-GEMINI-OPENAI-API-KEY)
    2. get_api_key_for_request(request) - per-request async function
    3. client default Authorization header - permanent token

    Args:
        client: httpx AsyncClient with default Authorization
        request: Request object for context-aware selection
        request_api_key: API key from header override
        get_api_key_for_request: Async function to get key per request

    Returns:
        Resolved API key string
    """
    # 1. Header override takes highest precedence
    if request_api_key:
        return request_api_key

    # 2. Per-request function (async-only)
    if get_api_key_for_request and request is not None:
        return await get_api_key_for_request(request)

    # 3. Permanent token from client's default Authorization header
    auth_header = client.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]  # Remove "Bearer " prefix

    raise ValueError("No API key available: no header override, resolver, or client default")


def chat_completion(
    client: httpx.Client,
    messages: list[dict[str, str]],
    model: str = DEFAULT_MODEL,
    temperature: float | None = None,
    max_tokens: int | None = None,
    top_p: float | None = None,
    n: int | None = None,
    stop: str | list[str] | None = None,
    response_format: ResponseFormat | dict[str, Any] | None = None,
    **kwargs: Any,
) -> ChatCompletionResponse:
    """
    Performs a chat completion request.

    Args:
        client: httpx Client from create_client()
        messages: Array of {role, content} message objects
        model: Model to use
        temperature: Sampling temperature (0-2)
        max_tokens: Maximum tokens to generate
        top_p: Nucleus sampling parameter
        n: Number of completions to generate
        stop: Stop sequence(s)
        response_format: Response format for structured output
        **kwargs: Additional parameters passed to the API

    Returns:
        ChatCompletionResponse object

    Example:
        >>> response = chat_completion(
        ...     client,
        ...     messages=[{"role": "user", "content": "Hello!"}],
        ...     model="gemini-2.0-flash",
        ... )
        >>> print(response.choices[0].message.content)
    """
    if not messages or not isinstance(messages, list):
        raise ValueError("messages is required and must be a list")

    # Build request body
    body: dict[str, Any] = {
        "model": model,
        "messages": messages,
    }

    if temperature is not None:
        body["temperature"] = temperature
    if max_tokens is not None:
        body["max_tokens"] = max_tokens
    if top_p is not None:
        body["top_p"] = top_p
    if n is not None:
        body["n"] = n
    if stop is not None:
        body["stop"] = stop
    if response_format is not None:
        if isinstance(response_format, ResponseFormat):
            body["response_format"] = response_format.to_dict()
        else:
            body["response_format"] = response_format

    # Add any additional kwargs
    body.update(kwargs)

    # Execute request
    response = client.post("/chat/completions", json=body)
    response.raise_for_status()

    data = response.json()

    return _parse_response(data)


async def chat_completion_async(
    client: httpx.AsyncClient,
    messages: list[dict[str, str]],
    model: str = DEFAULT_MODEL,
    temperature: float | None = None,
    max_tokens: int | None = None,
    top_p: float | None = None,
    n: int | None = None,
    stop: str | list[str] | None = None,
    response_format: ResponseFormat | dict[str, Any] | None = None,
    **kwargs: Any,
) -> ChatCompletionResponse:
    """
    Performs an async chat completion request.

    Same arguments as chat_completion() but async.
    """
    if not messages or not isinstance(messages, list):
        raise ValueError("messages is required and must be a list")

    body: dict[str, Any] = {
        "model": model,
        "messages": messages,
    }

    if temperature is not None:
        body["temperature"] = temperature
    if max_tokens is not None:
        body["max_tokens"] = max_tokens
    if top_p is not None:
        body["top_p"] = top_p
    if n is not None:
        body["n"] = n
    if stop is not None:
        body["stop"] = stop
    if response_format is not None:
        if isinstance(response_format, ResponseFormat):
            body["response_format"] = response_format.to_dict()
        else:
            body["response_format"] = response_format

    body.update(kwargs)

    response = await client.post("/chat/completions", json=body)
    response.raise_for_status()

    data = response.json()

    return _parse_response(data)


async def chat_completion_with_dynamic_key(
    client: httpx.AsyncClient,
    messages: list[dict[str, str]],
    model: str = DEFAULT_MODEL,
    temperature: float | None = None,
    max_tokens: int | None = None,
    top_p: float | None = None,
    n: int | None = None,
    stop: str | list[str] | None = None,
    response_format: ResponseFormat | dict[str, Any] | None = None,
    *,
    request: Any | None = None,
    request_api_key: str | None = None,
    get_api_key_for_request: ApiKeyResolver | None = None,
    **kwargs: Any,
) -> ChatCompletionResponse:
    """
    Performs an async chat completion request with dynamic API key resolution.

    API key precedence:
    1. request_api_key (header override X-GEMINI-OPENAI-API-KEY)
    2. get_api_key_for_request(request) - per-request async function
    3. client.headers["Authorization"] - permanent token

    Args:
        client: httpx AsyncClient from create_async_client()
        messages: Array of {role, content} message objects
        model: Model to use
        temperature: Sampling temperature (0-2)
        max_tokens: Maximum tokens to generate
        top_p: Nucleus sampling parameter
        n: Number of completions to generate
        stop: Stop sequence(s)
        response_format: Response format for structured output
        request: Request object for context-aware API key selection
        request_api_key: API key from header override (X-GEMINI-OPENAI-API-KEY)
        get_api_key_for_request: Async function to get key per request
        **kwargs: Additional parameters passed to the API

    Returns:
        ChatCompletionResponse object

    Example:
        >>> # With per-request function
        >>> async def get_key(req):
        ...     return req.state.user_api_key
        >>> response = await chat_completion_with_dynamic_key(
        ...     client,
        ...     messages=[{"role": "user", "content": "Hello!"}],
        ...     request=fastapi_request,
        ...     get_api_key_for_request=get_key,
        ... )

        >>> # With header override
        >>> response = await chat_completion_with_dynamic_key(
        ...     client,
        ...     messages=[{"role": "user", "content": "Hello!"}],
        ...     request_api_key=request.headers.get("X-GEMINI-OPENAI-API-KEY"),
        ... )
    """
    if not messages or not isinstance(messages, list):
        raise ValueError("messages is required and must be a list")

    # Resolve API key with precedence
    resolved_api_key = await resolve_api_key(
        client,
        request=request,
        request_api_key=request_api_key,
        get_api_key_for_request=get_api_key_for_request,
    )

    body: dict[str, Any] = {
        "model": model,
        "messages": messages,
    }

    if temperature is not None:
        body["temperature"] = temperature
    if max_tokens is not None:
        body["max_tokens"] = max_tokens
    if top_p is not None:
        body["top_p"] = top_p
    if n is not None:
        body["n"] = n
    if stop is not None:
        body["stop"] = stop
    if response_format is not None:
        if isinstance(response_format, ResponseFormat):
            body["response_format"] = response_format.to_dict()
        else:
            body["response_format"] = response_format

    body.update(kwargs)

    # Make request with resolved API key in headers
    response = await client.post(
        "/chat/completions",
        json=body,
        headers={"Authorization": f"Bearer {resolved_api_key}"},
    )
    response.raise_for_status()

    data = response.json()

    return _parse_response(data)


def chat_completion_structured(
    client: httpx.Client,
    messages: list[dict[str, str]],
    schema: StructuredOutputSchema,
    model: str = DEFAULT_MODEL,
    temperature: float | None = None,
    max_tokens: int | None = None,
    **kwargs: Any,
) -> ChatCompletionResponse:
    """
    Performs a chat completion request with structured JSON output.

    Args:
        client: httpx Client from create_client()
        messages: Array of {role, content} message objects
        schema: JSON schema for structured output
        model: Model to use
        temperature: Sampling temperature
        max_tokens: Maximum tokens to generate
        **kwargs: Additional parameters

    Returns:
        ChatCompletionResponse with structured content

    Example:
        >>> schema = StructuredOutputSchema(
        ...     name="person_info",
        ...     schema={
        ...         "type": "object",
        ...         "properties": {
        ...             "name": {"type": "string"},
        ...             "age": {"type": "number"},
        ...         },
        ...         "required": ["name", "age"],
        ...     },
        ... )
        >>> response = chat_completion_structured(
        ...     client,
        ...     messages=[{"role": "user", "content": "Extract: John is 30"}],
        ...     schema=schema,
        ... )
    """
    response_format = ResponseFormat(
        type="json_schema",
        json_schema=JsonSchema(
            name=schema.name,
            schema=schema.schema,
            description=schema.description,
            strict=schema.strict,
        ),
    )

    return chat_completion(
        client,
        messages=messages,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        response_format=response_format,
        **kwargs,
    )


def parse_structured_output(response: ChatCompletionResponse) -> StructuredOutputResult:
    """
    Parses structured output from a chat completion response.

    Args:
        response: Chat completion response

    Returns:
        StructuredOutputResult with parsed data or error

    Example:
        >>> result = parse_structured_output(response)
        >>> if result.success:
        ...     print(result.data)
        ... else:
        ...     print(f"Error: {result.error}")
    """
    raw = response.choices[0].message.content if response.choices else ""

    if not raw:
        return StructuredOutputResult(
            success=False,
            data=None,
            raw=raw,
            error="No content in response",
        )

    try:
        data = json.loads(raw)
        return StructuredOutputResult(
            success=True,
            data=data,
            raw=raw,
        )
    except json.JSONDecodeError as e:
        return StructuredOutputResult(
            success=False,
            data=None,
            raw=raw,
            error=str(e),
        )


def extract_content(response: ChatCompletionResponse) -> str:
    """
    Extracts the text content from a chat completion response.

    Args:
        response: Chat completion response

    Returns:
        The text content of the first choice, or empty string
    """
    if response.choices:
        return response.choices[0].message.content
    return ""


def extract_all_contents(response: ChatCompletionResponse) -> list[str]:
    """
    Extracts all choice contents from a chat completion response.

    Args:
        response: Chat completion response

    Returns:
        List of text contents from all choices
    """
    return [choice.message.content for choice in response.choices]


def _parse_response(data: dict[str, Any]) -> ChatCompletionResponse:
    """Parse API response into dataclass."""
    choices = []
    for choice_data in data.get("choices", []):
        message_data = choice_data.get("message", {})
        message = ResponseMessage(
            role=message_data.get("role", ""),
            content=message_data.get("content", ""),
        )
        choice = Choice(
            index=choice_data.get("index", 0),
            message=message,
            finish_reason=choice_data.get("finish_reason"),
        )
        choices.append(choice)

    usage = None
    if "usage" in data:
        usage_data = data["usage"]
        usage = Usage(
            prompt_tokens=usage_data.get("prompt_tokens", 0),
            completion_tokens=usage_data.get("completion_tokens", 0),
            total_tokens=usage_data.get("total_tokens", 0),
        )

    return ChatCompletionResponse(
        id=data.get("id", ""),
        object=data.get("object", ""),
        created=data.get("created", 0),
        model=data.get("model", ""),
        choices=choices,
        usage=usage,
    )
