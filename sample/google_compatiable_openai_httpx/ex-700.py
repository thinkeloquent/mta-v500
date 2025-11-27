#!/usr/bin/env python3
"""
Gemini OpenAI-Compatible REST API Client - Structured Output (JSON) Example
Single-file implementation using Python 3.11+ httpx

Features:
- Structured output with JSON schema (like Pydantic BaseModel)
- Proxy support (optional)
- Certificate/CA bundle support (optional)
- Keep-alive with configurable connections
- Custom headers
- Full OpenAI-compatible chat completion parameters
- User-friendly JSON output with metadata

Based on: https://ai.google.dev/gemini-api/docs/openai#rest
"""

import os
import json
import httpx
from datetime import datetime
from dataclasses import dataclass
from typing import Any

# Default configuration
DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai"
DEFAULT_MODEL = "gemini-2.0-flash"
DEFAULT_TIMEOUT = 60.0  # 60 seconds
DEFAULT_KEEP_ALIVE_TIMEOUT = 5.0  # 5 seconds
DEFAULT_MAX_CONNECTIONS = 10

# Output formatting
SEPARATOR = "=" * 60
THIN_SEPARATOR = "-" * 60


# =============================================================================
# Data Classes for Response Models
# =============================================================================

@dataclass
class Message:
    """Represents a chat message."""
    role: str
    content: str
    parsed: dict[str, Any] | None = None


@dataclass
class Choice:
    """Represents a completion choice."""
    index: int
    message: Message
    finish_reason: str | None = None


@dataclass
class Usage:
    """Represents token usage statistics."""
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


@dataclass
class ChatCompletionResponse:
    """Represents a chat completion response."""
    id: str
    object: str
    created: int
    model: str
    choices: list[Choice]
    usage: Usage | None = None


# =============================================================================
# Output Formatting Functions
# =============================================================================

def log_progress(stage: str, message: str = "") -> None:
    """
    Logs progress messages with timestamp and stage.

    Args:
        stage: Current stage name (e.g., "INIT", "CLIENT", "API")
        message: Optional descriptive message
    """
    timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    print(f"[{timestamp}] [{stage}] {message}")


def format_output(
    question: str,
    response: ChatCompletionResponse,
    request_options: dict[str, Any] | None = None,
    schema_info: dict[str, Any] | None = None,
) -> None:
    """
    Formats and prints the response in a user-friendly way.

    Args:
        question: The original question asked
        response: The API response object
        request_options: The request options used
        schema_info: Optional schema information
    """
    request_options = request_options or {}

    print(f"\n{SEPARATOR}")
    print("  GEMINI STRUCTURED OUTPUT (JSON) CHAT COMPLETION")
    print(SEPARATOR)

    # Print the question/prompt for context
    print("\n[PROMPT]")
    print(THIN_SEPARATOR)
    print(question)

    # Print schema info if provided
    if schema_info:
        print("\n[SCHEMA]")
        print(THIN_SEPARATOR)
        print(json.dumps(schema_info, indent=2))

    # Print request parameters
    print("\n[REQUEST PARAMS]")
    print(THIN_SEPARATOR)
    params: dict[str, Any] = {
        "model": request_options.get("model", DEFAULT_MODEL),
    }
    if "temperature" in request_options:
        params["temperature"] = request_options["temperature"]
    if "max_tokens" in request_options:
        params["max_tokens"] = request_options["max_tokens"]
    if "top_p" in request_options:
        params["top_p"] = request_options["top_p"]
    print(json.dumps(params, indent=2))

    # Print the parsed structured response
    choice = response.choices[0] if response.choices else None
    if choice and choice.message.parsed:
        print("\n[PARSED RESPONSE]")
        print(THIN_SEPARATOR)
        print(json.dumps(choice.message.parsed, indent=2))

    # Print raw content
    if choice and choice.message.content:
        print("\n[RAW CONTENT]")
        print(THIN_SEPARATOR)
        print(choice.message.content)

    # Print finish reason
    if choice and choice.finish_reason:
        print("\n[FINISH REASON]")
        print(THIN_SEPARATOR)
        print(choice.finish_reason)

    # Print metadata
    print("\n[METADATA]")
    print(THIN_SEPARATOR)
    metadata = {
        "id": response.id or "N/A",
        "model": response.model or "N/A",
        "created": datetime.fromtimestamp(response.created).isoformat()
            if response.created else "N/A",
        "finish_reason": choice.finish_reason if choice else "N/A",
    }
    print(json.dumps(metadata, indent=2))

    # Print usage statistics
    if response.usage:
        print("\n[USAGE]")
        print(THIN_SEPARATOR)
        usage_dict = {
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens,
        }
        print(json.dumps(usage_dict, indent=2))

    print(f"\n{SEPARATOR}\n")


# =============================================================================
# Client Creation
# =============================================================================

def create_client(
    api_key: str | None = None,
    base_url: str | None = None,
    proxy: str | None = None,
    cert: str | tuple[str, str] | None = None,
    ca_bundle: str | None = None,
    custom_headers: dict[str, str] | None = None,
    timeout: float | None = None,
    max_connections: int | None = None,
) -> httpx.Client:
    """
    Creates a configured httpx client.

    Args:
        api_key: API key (defaults to GEMINI_API_KEY env)
        base_url: Base URL for API
        proxy: Proxy URL (e.g., "http://proxy:8080")
        cert: Path to client certificate file or tuple (cert, key)
        ca_bundle: Path to CA bundle file
        custom_headers: Additional headers
        timeout: Request timeout in seconds
        max_connections: Maximum number of connections

    Returns:
        Configured httpx.Client
    """
    resolved_api_key = api_key or os.environ.get("GEMINI_API_KEY")

    if not resolved_api_key:
        raise ValueError(
            "API key required. Pass api_key argument or set GEMINI_API_KEY environment variable."
        )

    resolved_base_url = base_url or DEFAULT_BASE_URL
    resolved_timeout = timeout or DEFAULT_TIMEOUT
    resolved_max_connections = max_connections or DEFAULT_MAX_CONNECTIONS

    # Build headers
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {resolved_api_key}",
    }
    if custom_headers:
        headers.update(custom_headers)

    # Build limits
    limits = httpx.Limits(
        max_connections=resolved_max_connections,
        max_keepalive_connections=resolved_max_connections // 2 or 1,
    )

    # Build client kwargs
    client_kwargs: dict[str, Any] = {
        "base_url": resolved_base_url,
        "headers": headers,
        "timeout": httpx.Timeout(resolved_timeout),
        "limits": limits,
    }

    # Add proxy if specified
    if proxy:
        client_kwargs["proxy"] = proxy

    # Add certificate if specified
    if cert:
        client_kwargs["cert"] = cert

    # Add CA bundle if specified
    if ca_bundle:
        client_kwargs["verify"] = ca_bundle

    return httpx.Client(**client_kwargs)


# =============================================================================
# Schema Definition Functions
# =============================================================================

def define_schema(
    name: str,
    properties: dict[str, Any],
    required: list[str] | None = None,
) -> dict[str, Any]:
    """
    Defines a JSON schema for structured output (similar to Pydantic BaseModel).

    Args:
        name: Schema name
        properties: Property definitions with type info
        required: Required property names (defaults to all)

    Returns:
        JSON schema definition
    """
    json_schema: dict[str, Any] = {
        "type": "object",
        "properties": {},
        "required": required or list(properties.keys()),
        "additionalProperties": False,
    }

    for key, value in properties.items():
        if isinstance(value, str):
            # Simple type definition: "string", "number", "boolean", "integer"
            json_schema["properties"][key] = {"type": value}
        elif isinstance(value, list):
            # Array type: ["string"] means array of strings
            json_schema["properties"][key] = {
                "type": "array",
                "items": {"type": value[0]},
            }
        elif isinstance(value, dict):
            # Full property definition with type and other constraints
            json_schema["properties"][key] = value

    return {
        "type": "json_schema",
        "json_schema": {
            "name": name,
            "strict": True,
            "schema": json_schema,
        },
    }


# =============================================================================
# API Functions
# =============================================================================

def chat_completion(
    client: httpx.Client,
    messages: list[dict[str, str]],
    model: str = DEFAULT_MODEL,
    temperature: float | None = None,
    max_tokens: int | None = None,
    top_p: float | None = None,
    n: int | None = None,
    stop: str | list[str] | None = None,
    **kwargs: Any,
) -> ChatCompletionResponse:
    """
    Performs a standard chat completion request (non-structured).

    Args:
        client: httpx Client from create_client()
        messages: Array of {role, content} message objects
        model: Model to use
        temperature: Sampling temperature (0-2)
        max_tokens: Maximum tokens to generate
        top_p: Nucleus sampling parameter
        n: Number of completions to generate
        stop: Stop sequence(s)
        **kwargs: Additional parameters passed to the API

    Returns:
        ChatCompletionResponse object
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

    # Add any additional kwargs
    body.update(kwargs)

    # Execute request
    response = client.post("/chat/completions", json=body)
    response.raise_for_status()

    data = response.json()

    # Parse response into dataclasses
    choices = []
    for choice_data in data.get("choices", []):
        message_data = choice_data.get("message", {})
        message = Message(
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


def chat_completion_parse(
    client: httpx.Client,
    messages: list[dict[str, str]],
    response_format: dict[str, Any],
    model: str = DEFAULT_MODEL,
    temperature: float | None = None,
    max_tokens: int | None = None,
    top_p: float | None = None,
    n: int | None = None,
    stop: str | list[str] | None = None,
    **kwargs: Any,
) -> ChatCompletionResponse:
    """
    Performs a structured chat completion request with JSON schema response.

    Args:
        client: httpx Client from create_client()
        messages: Array of {role, content} message objects
        response_format: JSON schema for response format
        model: Model to use
        temperature: Sampling temperature (0-2)
        max_tokens: Maximum tokens to generate
        top_p: Nucleus sampling parameter
        n: Number of completions to generate
        stop: Stop sequence(s)
        **kwargs: Additional parameters passed to the API

    Returns:
        ChatCompletionResponse object with parsed field
    """
    if not messages or not isinstance(messages, list):
        raise ValueError("messages is required and must be a list")

    if not response_format:
        raise ValueError("response_format is required for structured output")

    # Build request body
    body: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "response_format": response_format,
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

    # Add any additional kwargs
    body.update(kwargs)

    # Execute request
    response = client.post("/chat/completions", json=body)
    response.raise_for_status()

    data = response.json()

    # Parse response into dataclasses
    choices = []
    for choice_data in data.get("choices", []):
        message_data = choice_data.get("message", {})

        # Try to parse the structured content
        parsed = None
        content = message_data.get("content", "")
        if content:
            try:
                parsed = json.loads(content)
            except json.JSONDecodeError:
                parsed = None

        message = Message(
            role=message_data.get("role", ""),
            content=content,
            parsed=parsed,
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


# =============================================================================
# Main Execution
# =============================================================================

def main() -> None:
    """Main execution - demonstrates structured output API with sample question."""
    log_progress("INIT", "Starting Gemini Structured Output API Client...")

    # Create client with configuration
    log_progress("CLIENT", "Creating client configuration...")
    client = create_client(
        # api_key="your-api-key",           # Or use GEMINI_API_KEY env
        # base_url="custom-url",             # Override base URL
        # proxy="http://proxy:8080",         # Proxy server
        # cert="/path/to/cert.pem",          # Client certificate
        # ca_bundle="/path/to/ca.pem",       # CA bundle
        # custom_headers={"X-Custom": "value"},
        # timeout=60.0,                      # 60 second timeout
        # max_connections=20,                # Max connections
    )
    log_progress("CLIENT", "Client created successfully")

    question = "Explain to me how AI works"

    log_progress("QUESTION", f'Preparing question: "{question}"')

    try:
        # First, demonstrate a standard chat completion
        log_progress("REQUEST", "Sending standard chat completion request...")

        standard_request_options = {
            "model": "gemini-2.0-flash",
        }

        log_progress("API", "Sending text request to Gemini API...")
        standard_response = chat_completion(
            client,
            messages=[{"role": "user", "content": question}],
            model=standard_request_options["model"],
        )
        log_progress("API", "Received response from API")

        format_output(question, standard_response, standard_request_options)

        # Now demonstrate structured output (similar to Python Pydantic example)
        log_progress("STRUCTURED", "Demonstrating structured output capability...")

        # Define schema for CalendarEvent (like Pydantic BaseModel)
        calendar_event_schema = define_schema("CalendarEvent", {
            "name": "string",
            "date": "string",
            "participants": ["string"],
        })

        log_progress("SCHEMA", "Created CalendarEvent schema")
        log_progress("SCHEMA", f"Schema: {json.dumps(calendar_event_schema['json_schema']['schema'])}")

        event_prompt = "John and Susan are going to an AI conference on Friday."

        structured_request_options = {
            "model": "gemini-2.0-flash",
        }

        log_progress("API", "Sending structured output request to Gemini API...")
        structured_response = chat_completion_parse(
            client,
            messages=[
                {"role": "system", "content": "Extract the event information."},
                {"role": "user", "content": event_prompt},
            ],
            response_format=calendar_event_schema,
            model=structured_request_options["model"],
        )
        log_progress("API", "Received structured response from API")

        format_output(
            event_prompt,
            structured_response,
            structured_request_options,
            calendar_event_schema["json_schema"]["schema"],
        )

        # Print the parsed result similar to Python example
        if structured_response.choices and structured_response.choices[0].message.parsed:
            parsed = structured_response.choices[0].message.parsed
            log_progress("RESULT", "Parsed CalendarEvent:")
            print(f"  Name: {parsed.get('name')}")
            print(f"  Date: {parsed.get('date')}")
            participants = parsed.get('participants', [])
            print(f"  Participants: {', '.join(participants)}")

        # Additional example: Recipe structured output
        log_progress("STRUCTURED", "Demonstrating another structured output example...")

        recipe_schema = define_schema("Recipe", {
            "recipe_name": "string",
            "ingredients": ["string"],
            "cooking_time_minutes": "integer",
            "difficulty": {"type": "string", "enum": ["easy", "medium", "hard"]},
        })

        recipe_prompt = "Give me a simple pasta recipe with tomatoes and garlic that takes about 20 minutes."

        log_progress("API", "Sending recipe structured request to Gemini API...")
        recipe_response = chat_completion_parse(
            client,
            messages=[
                {"role": "system", "content": "Extract recipe information into the specified format."},
                {"role": "user", "content": recipe_prompt},
            ],
            response_format=recipe_schema,
            model="gemini-2.0-flash",
        )
        log_progress("API", "Received recipe structured response from API")

        format_output(
            recipe_prompt,
            recipe_response,
            {"model": "gemini-2.0-flash"},
            recipe_schema["json_schema"]["schema"],
        )

        if recipe_response.choices and recipe_response.choices[0].message.parsed:
            recipe_parsed = recipe_response.choices[0].message.parsed
            log_progress("RESULT", "Parsed Recipe:")
            print(f"  Name: {recipe_parsed.get('recipe_name')}")
            print(f"  Cooking Time: {recipe_parsed.get('cooking_time_minutes')} minutes")
            print(f"  Difficulty: {recipe_parsed.get('difficulty')}")
            print("  Ingredients:")
            for i, ing in enumerate(recipe_parsed.get("ingredients", []), 1):
                print(f"    {i}. {ing}")

        log_progress("COMPLETE", "Structured output demo completed successfully")

    except httpx.HTTPStatusError as e:
        log_progress("ERROR", f"API error ({e.response.status_code}): {e.response.text}")
        raise SystemExit(1)
    except Exception as e:
        log_progress("ERROR", f"Request failed: {e}")
        raise SystemExit(1)
    finally:
        client.close()


if __name__ == "__main__":
    main()
