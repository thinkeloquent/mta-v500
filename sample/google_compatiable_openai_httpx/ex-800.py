#!/usr/bin/env python3
"""
Gemini OpenAI-Compatible REST API Client - Structured Output (YAML) Example
Single-file implementation using Python 3.11+ httpx

Features:
- Structured output with YAML format response
- Simple YAML parser/serializer (no external dependencies)
- Proxy support (optional)
- Certificate/CA bundle support (optional)
- Keep-alive with configurable connections
- Custom headers
- Full OpenAI-compatible chat completion parameters
- User-friendly output with metadata

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
    yaml_content: str | None = None
    parse_error: str | None = None


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
# YAML Parser/Serializer Functions
# =============================================================================

def parse_yaml_value(value: str) -> Any:
    """
    Parse a YAML value to appropriate Python type.

    Args:
        value: YAML value string

    Returns:
        Parsed value
    """
    # Remove quotes if present
    if (value.startswith('"') and value.endswith('"')) or \
       (value.startswith("'") and value.endswith("'")):
        return value[1:-1]

    # Check for boolean
    if value.lower() == "true":
        return True
    if value.lower() == "false":
        return False

    # Check for null
    if value.lower() == "null" or value == "~":
        return None

    # Check for number
    if value.lstrip("-").isdigit():
        return int(value)
    try:
        return float(value)
    except ValueError:
        pass

    # Return as string
    return value


def parse_yaml(yaml_string: str) -> dict[str, Any]:
    """
    Simple YAML parser for structured output.
    Handles basic YAML structures: strings, numbers, booleans, arrays, objects.

    Args:
        yaml_string: YAML string to parse

    Returns:
        Parsed Python dictionary
    """
    lines = yaml_string.split("\n")
    result: dict[str, Any] = {}
    current_key: str | None = None
    in_array = False

    for line in lines:
        # Skip empty lines and comments
        if not line.strip() or line.strip().startswith("#"):
            continue

        # Check for array item
        array_match = line.lstrip()
        if array_match.startswith("- ") and in_array and current_key:
            value = array_match[2:].strip()
            if current_key not in result:
                result[current_key] = []
            result[current_key].append(parse_yaml_value(value))
            continue

        # Check for key-value pair
        if ":" in line:
            colon_idx = line.index(":")
            key = line[:colon_idx].strip()
            value = line[colon_idx + 1:].strip()

            current_key = key

            if value == "" or value == "|" or value == ">":
                # Array or multiline will follow
                in_array = True
                result[key] = []
            else:
                in_array = False
                result[key] = parse_yaml_value(value)

    return result


def to_yaml(obj: dict[str, Any], indent: int = 0) -> str:
    """
    Convert Python dictionary to YAML string.

    Args:
        obj: Dictionary to convert
        indent: Current indentation level

    Returns:
        YAML string
    """
    spaces = "  " * indent
    result = ""

    for key, value in obj.items():
        if isinstance(value, list):
            result += f"{spaces}{key}:\n"
            for item in value:
                if isinstance(item, dict):
                    result += f"{spaces}  -\n"
                    result += to_yaml(item, indent + 2)
                else:
                    result += f"{spaces}  - {format_yaml_value(item)}\n"
        elif isinstance(value, dict):
            result += f"{spaces}{key}:\n"
            result += to_yaml(value, indent + 1)
        else:
            result += f"{spaces}{key}: {format_yaml_value(value)}\n"

    return result


def format_yaml_value(value: Any) -> str:
    """
    Format a value for YAML output.

    Args:
        value: Value to format

    Returns:
        Formatted value string
    """
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, str):
        # Quote strings that might be ambiguous
        if ":" in value or "#" in value or "\n" in value or value.startswith("-"):
            return f'"{value}"'
        return value
    return str(value)


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
    print("  GEMINI STRUCTURED OUTPUT (YAML) CHAT COMPLETION")
    print(SEPARATOR)

    # Print the question/prompt for context
    print("\n[PROMPT]")
    print(THIN_SEPARATOR)
    print(question)

    # Print schema info if provided
    if schema_info:
        print("\n[YAML SCHEMA]")
        print(THIN_SEPARATOR)
        print(schema_info.get("system_prompt", ""))

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

    # Print the raw YAML response
    choice = response.choices[0] if response.choices else None
    if choice and choice.message.yaml_content:
        print("\n[YAML RESPONSE]")
        print(THIN_SEPARATOR)
        print(choice.message.yaml_content)

    # Print the parsed structured response as JSON
    if choice and choice.message.parsed:
        print("\n[PARSED RESPONSE (JSON)]")
        print(THIN_SEPARATOR)
        print(json.dumps(choice.message.parsed, indent=2))

    # Print parse error if any
    if choice and choice.message.parse_error:
        print("\n[PARSE ERROR]")
        print(THIN_SEPARATOR)
        print(choice.message.parse_error)

    # Print raw content for non-YAML responses
    if choice and not choice.message.yaml_content and choice.message.content:
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

def define_yaml_schema(
    name: str,
    properties: dict[str, Any],
    required: list[str] | None = None,
) -> dict[str, Any]:
    """
    Defines a schema for structured YAML output.
    Creates a system prompt that instructs the model to respond in YAML format.

    Args:
        name: Schema name
        properties: Property definitions with type info
        required: Required property names (defaults to all)

    Returns:
        Schema definition with YAML instructions
    """
    required_fields = required or list(properties.keys())

    # Build example YAML structure
    example_yaml = ""
    for key, value in properties.items():
        if isinstance(value, list):
            example_yaml += f"{key}:\n  - item1\n  - item2\n"
        else:
            example_yaml += f"{key}: value\n"

    # Build YAML schema description with explicit example
    schema_description = f"""You MUST respond with ONLY valid YAML. No explanations, no markdown, no code blocks, no backticks - just raw YAML text.

Output format ({name}):
{example_yaml}
Field descriptions:"""

    for key, value in properties.items():
        if isinstance(value, str):
            type_desc = value
        elif isinstance(value, list):
            type_desc = f"list of {value[0]}"
        elif isinstance(value, dict) and "type" in value:
            if "enum" in value:
                type_desc = f"{value['type']} (one of: {', '.join(value['enum'])})"
            else:
                type_desc = value["type"]
        else:
            type_desc = "string"
        is_required = "required" if key in required_fields else "optional"
        schema_description += f"\n- {key}: {type_desc} ({is_required})"

    schema_description += "\n\nRespond with ONLY the YAML, nothing else."

    return {
        "name": name,
        "properties": properties,
        "required": required_fields,
        "system_prompt": schema_description,
        "_schema": {
            "name": name,
            "properties": properties,
            "required": required_fields,
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

    body.update(kwargs)

    response = client.post("/chat/completions", json=body)
    response.raise_for_status()

    data = response.json()

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


def chat_completion_parse_yaml(
    client: httpx.Client,
    messages: list[dict[str, str]],
    yaml_schema: dict[str, Any],
    model: str = DEFAULT_MODEL,
    temperature: float | None = None,
    max_tokens: int | None = None,
    top_p: float | None = None,
    n: int | None = None,
    stop: str | list[str] | None = None,
    **kwargs: Any,
) -> ChatCompletionResponse:
    """
    Performs a structured chat completion request with YAML response format.

    Args:
        client: httpx Client from create_client()
        messages: Array of {role, content} message objects
        yaml_schema: YAML schema from define_yaml_schema()
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

    if not yaml_schema:
        raise ValueError("yaml_schema is required for structured YAML output")

    # Merge system prompts: combine YAML schema instructions with any existing system message
    messages_with_schema = []
    has_system_message = False

    for msg in messages:
        if msg.get("role") == "system":
            # Combine the YAML schema with the existing system message
            messages_with_schema.append({
                "role": "system",
                "content": f"{yaml_schema['system_prompt']}\n\nAdditional instructions: {msg['content']}",
            })
            has_system_message = True
        else:
            messages_with_schema.append(msg)

    # If no system message was present, prepend the YAML schema
    if not has_system_message:
        messages_with_schema.insert(0, {"role": "system", "content": yaml_schema["system_prompt"]})

    # Build request body
    body: dict[str, Any] = {
        "model": model,
        "messages": messages_with_schema,
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

    body.update(kwargs)

    response = client.post("/chat/completions", json=body)
    response.raise_for_status()

    data = response.json()

    choices = []
    for choice_data in data.get("choices", []):
        message_data = choice_data.get("message", {})

        # Parse the YAML content from the response
        content = message_data.get("content", "")
        parsed = None
        yaml_content = None
        parse_error = None

        if content:
            try:
                # Clean up the content (remove markdown code blocks if present)
                yaml_content = content.strip()
                if yaml_content.startswith("```yaml"):
                    yaml_content = yaml_content[7:]
                elif yaml_content.startswith("```"):
                    yaml_content = yaml_content[3:]
                if yaml_content.endswith("```"):
                    yaml_content = yaml_content[:-3]
                yaml_content = yaml_content.strip()

                parsed = parse_yaml(yaml_content)
            except Exception as e:
                parse_error = str(e)

        message = Message(
            role=message_data.get("role", ""),
            content=content,
            parsed=parsed,
            yaml_content=yaml_content,
            parse_error=parse_error,
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
    """Main execution - demonstrates structured YAML output API with sample question."""
    log_progress("INIT", "Starting Gemini Structured Output (YAML) API Client...")

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

        # Now demonstrate structured YAML output (similar to Python Pydantic example)
        log_progress("STRUCTURED", "Demonstrating structured YAML output capability...")

        # Define YAML schema for CalendarEvent (like Pydantic BaseModel)
        calendar_event_schema = define_yaml_schema("CalendarEvent", {
            "name": "string",
            "date": "string",
            "participants": ["string"],
        })

        log_progress("SCHEMA", "Created CalendarEvent YAML schema")

        event_prompt = "John and Susan are going to an AI conference on Friday."

        structured_request_options = {
            "model": "gemini-2.0-flash",
            "temperature": 0.1,  # Lower temperature for consistent YAML output
        }

        log_progress("API", "Sending structured YAML request to Gemini API...")
        structured_response = chat_completion_parse_yaml(
            client,
            messages=[
                {"role": "system", "content": "Extract the event information."},
                {"role": "user", "content": event_prompt},
            ],
            yaml_schema=calendar_event_schema,
            model=structured_request_options["model"],
            temperature=structured_request_options["temperature"],
        )
        log_progress("API", "Received structured YAML response from API")

        format_output(
            event_prompt,
            structured_response,
            structured_request_options,
            calendar_event_schema,
        )

        # Print the parsed result similar to Python example
        if structured_response.choices and structured_response.choices[0].message.parsed:
            parsed = structured_response.choices[0].message.parsed
            log_progress("RESULT", "Parsed CalendarEvent from YAML:")
            print(f"  Name: {parsed.get('name')}")
            print(f"  Date: {parsed.get('date')}")
            participants = parsed.get('participants', [])
            if isinstance(participants, list):
                print(f"  Participants: {', '.join(str(p) for p in participants)}")
            else:
                print(f"  Participants: {participants}")

        # Additional example: Recipe structured output in YAML
        log_progress("STRUCTURED", "Demonstrating another YAML structured output example...")

        recipe_schema = define_yaml_schema("Recipe", {
            "recipe_name": "string",
            "ingredients": ["string"],
            "cooking_time_minutes": "integer",
            "difficulty": {"type": "string", "enum": ["easy", "medium", "hard"]},
        })

        recipe_prompt = "Give me a simple pasta recipe with tomatoes and garlic that takes about 20 minutes."

        log_progress("API", "Sending recipe YAML request to Gemini API...")
        recipe_response = chat_completion_parse_yaml(
            client,
            messages=[
                {"role": "system", "content": "Extract recipe information."},
                {"role": "user", "content": recipe_prompt},
            ],
            yaml_schema=recipe_schema,
            model="gemini-2.0-flash",
            temperature=0.1,
        )
        log_progress("API", "Received recipe YAML response from API")

        format_output(
            recipe_prompt,
            recipe_response,
            {"model": "gemini-2.0-flash", "temperature": 0.1},
            recipe_schema,
        )

        if recipe_response.choices and recipe_response.choices[0].message.parsed:
            recipe_parsed = recipe_response.choices[0].message.parsed
            log_progress("RESULT", "Parsed Recipe from YAML:")
            print(f"  Name: {recipe_parsed.get('recipe_name')}")
            print(f"  Cooking Time: {recipe_parsed.get('cooking_time_minutes')} minutes")
            print(f"  Difficulty: {recipe_parsed.get('difficulty')}")
            print("  Ingredients:")
            ingredients = recipe_parsed.get("ingredients", [])
            if isinstance(ingredients, list):
                for i, ing in enumerate(ingredients, 1):
                    print(f"    {i}. {ing}")
            else:
                print(f"    {ingredients}")

        # Demonstrate YAML serialization
        log_progress("YAML", "Demonstrating YAML serialization...")
        if recipe_response.choices and recipe_response.choices[0].message.parsed:
            print("\n--- Re-serialized to YAML ---")
            print(to_yaml(recipe_response.choices[0].message.parsed))

        log_progress("COMPLETE", "Structured YAML output demo completed successfully")

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
