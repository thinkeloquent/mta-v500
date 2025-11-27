#!/usr/bin/env python3
"""
Gemini OpenAI-Compatible REST API Client - Structured Output (CSV) Example
Single-file implementation using Python 3.11+ httpx

Features:
- Structured output with CSV format response
- CSV parser/serializer (no external dependencies)
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
    parsed: list[dict[str, Any]] | None = None
    csv_content: str | None = None
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
# CSV Parser/Serializer Functions
# =============================================================================

def parse_csv(
    csv_string: str,
    delimiter: str = ",",
    has_header: bool = True,
) -> list[dict[str, Any]]:
    """
    Parse CSV string to array of objects.
    Handles quoted fields, escaped quotes, and multiline values.

    Args:
        csv_string: CSV string to parse
        delimiter: Field delimiter
        has_header: First row is header

    Returns:
        Array of row objects
    """
    lines: list[list[str]] = []
    current_line: list[str] = []
    current_field = ""
    in_quotes = False

    # Parse character by character to handle quoted fields properly
    i = 0
    while i < len(csv_string):
        char = csv_string[i]
        next_char = csv_string[i + 1] if i + 1 < len(csv_string) else ""

        if in_quotes:
            if char == '"' and next_char == '"':
                # Escaped quote
                current_field += '"'
                i += 1  # Skip next quote
            elif char == '"':
                # End of quoted field
                in_quotes = False
            else:
                current_field += char
        else:
            if char == '"':
                # Start of quoted field
                in_quotes = True
            elif char == delimiter:
                # Field separator
                current_line.append(current_field.strip())
                current_field = ""
            elif char == "\n" or (char == "\r" and next_char == "\n"):
                # End of line
                if char == "\r":
                    i += 1  # Skip \n in \r\n
                current_line.append(current_field.strip())
                if any(f != "" for f in current_line):
                    lines.append(current_line)
                current_line = []
                current_field = ""
            else:
                current_field += char

        i += 1

    # Handle last field/line
    if current_field or current_line:
        current_line.append(current_field.strip())
        if any(f != "" for f in current_line):
            lines.append(current_line)

    if not lines:
        return []

    # Convert to objects if header row exists
    if has_header and lines:
        headers = lines[0]
        rows = lines[1:]

        result = []
        for row in rows:
            obj: dict[str, Any] = {}
            for idx, header in enumerate(headers):
                value: Any = row[idx] if idx < len(row) else ""

                # Try to parse as number
                if isinstance(value, str):
                    if value.lstrip("-").isdigit():
                        value = int(value)
                    else:
                        try:
                            value = float(value)
                        except ValueError:
                            pass

                    # Check for boolean
                    if isinstance(value, str):
                        if value.lower() == "true":
                            value = True
                        elif value.lower() == "false":
                            value = False

                    # Handle array fields (pipe-separated)
                    if isinstance(value, str) and "|" in value:
                        value = [v.strip() for v in value.split("|")]

                obj[header] = value
            result.append(obj)

        return result

    return [{"row": row} for row in lines]


def to_csv(
    data: list[dict[str, Any]],
    delimiter: str = ",",
    columns: list[str] | None = None,
) -> str:
    """
    Convert array of objects to CSV string.

    Args:
        data: Array of objects to convert
        delimiter: Field delimiter
        columns: Column order (defaults to all keys from first object)

    Returns:
        CSV string
    """
    if not data:
        return ""

    # Get columns from first object if not specified
    if columns is None:
        columns = list(data[0].keys())

    def escape_field(value: Any) -> str:
        if value is None:
            return ""

        # Handle arrays (join with pipe)
        if isinstance(value, list):
            value = "|".join(str(v) for v in value)

        s = str(value)

        # Quote if contains delimiter, quotes, or newlines
        if delimiter in s or '"' in s or "\n" in s or "\r" in s:
            return f'"{s.replace(chr(34), chr(34)+chr(34))}"'

        return s

    # Build CSV
    lines = []

    # Header row
    lines.append(delimiter.join(escape_field(col) for col in columns))

    # Data rows
    for row in data:
        values = [escape_field(row.get(col)) for col in columns]
        lines.append(delimiter.join(values))

    return "\n".join(lines)


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
    print("  GEMINI STRUCTURED OUTPUT (CSV) CHAT COMPLETION")
    print(SEPARATOR)

    # Print the question/prompt for context
    print("\n[PROMPT]")
    print(THIN_SEPARATOR)
    print(question)

    # Print schema info if provided
    if schema_info:
        print("\n[CSV SCHEMA]")
        print(THIN_SEPARATOR)
        print(f"Name: {schema_info.get('name', 'N/A')}")
        columns = schema_info.get("columns", [])
        if columns:
            print(f"Columns: {', '.join(c['name'] for c in columns)}")

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

    # Print the raw CSV response
    choice = response.choices[0] if response.choices else None
    if choice and choice.message.csv_content:
        print("\n[CSV RESPONSE]")
        print(THIN_SEPARATOR)
        print(choice.message.csv_content)

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

    # Print raw content for non-CSV responses
    if choice and not choice.message.csv_content and choice.message.content:
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

def define_csv_schema(
    name: str,
    columns: list[dict[str, str]],
) -> dict[str, Any]:
    """
    Defines a schema for structured CSV output.
    Creates a system prompt that instructs the model to respond in CSV format.

    Args:
        name: Schema name
        columns: Column definitions [{name, type, description}]

    Returns:
        Schema definition with CSV instructions
    """
    # Build header row from column names
    header_row = ",".join(col["name"] for col in columns)

    # Build example row
    example_values = []
    for col in columns:
        col_type = col.get("type", "string")
        if col_type in ("array", "list"):
            example_values.append("item1|item2")
        elif col_type in ("integer", "number"):
            example_values.append("123")
        elif col_type == "boolean":
            example_values.append("true")
        else:
            example_values.append("value")
    example_row = ",".join(example_values)

    # Build column descriptions
    column_descriptions = []
    for col in columns:
        desc = f"- {col['name']}: {col.get('type', 'string')}"
        if col.get("description"):
            desc += f" - {col['description']}"
        if col.get("type") in ("array", "list"):
            desc += " (use | as separator for multiple values)"
        column_descriptions.append(desc)

    system_prompt = f"""You MUST respond with ONLY valid CSV format. No explanations, no markdown, no code blocks, no backticks - just raw CSV text.

Output format ({name}):
{header_row}
{example_row}

Column descriptions:
{chr(10).join(column_descriptions)}

Rules:
- First row MUST be the header row exactly as shown above
- Use comma (,) as field delimiter
- Use pipe (|) as separator for array/list values within a field
- Quote fields containing commas, quotes, or newlines
- Escape quotes by doubling them ("")

Respond with ONLY the CSV (header + data rows), nothing else."""

    return {
        "name": name,
        "columns": columns,
        "header_row": header_row,
        "system_prompt": system_prompt,
        "_schema": {
            "name": name,
            "columns": columns,
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


def chat_completion_parse_csv(
    client: httpx.Client,
    messages: list[dict[str, str]],
    csv_schema: dict[str, Any],
    model: str = DEFAULT_MODEL,
    temperature: float | None = None,
    max_tokens: int | None = None,
    top_p: float | None = None,
    n: int | None = None,
    stop: str | list[str] | None = None,
    **kwargs: Any,
) -> ChatCompletionResponse:
    """
    Performs a structured chat completion request with CSV response format.

    Args:
        client: httpx Client from create_client()
        messages: Array of {role, content} message objects
        csv_schema: CSV schema from define_csv_schema()
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

    if not csv_schema:
        raise ValueError("csv_schema is required for structured CSV output")

    # Merge system prompts: combine CSV schema instructions with any existing system message
    messages_with_schema = []
    has_system_message = False

    for msg in messages:
        if msg.get("role") == "system":
            # Combine the CSV schema with the existing system message
            messages_with_schema.append({
                "role": "system",
                "content": f"{csv_schema['system_prompt']}\n\nAdditional instructions: {msg['content']}",
            })
            has_system_message = True
        else:
            messages_with_schema.append(msg)

    # If no system message was present, prepend the CSV schema
    if not has_system_message:
        messages_with_schema.insert(0, {"role": "system", "content": csv_schema["system_prompt"]})

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

        # Parse the CSV content from the response
        content = message_data.get("content", "")
        parsed = None
        csv_content = None
        parse_error = None

        if content:
            try:
                # Clean up the content (remove markdown code blocks if present)
                csv_content = content.strip()
                if csv_content.startswith("```csv"):
                    csv_content = csv_content[6:]
                elif csv_content.startswith("```"):
                    csv_content = csv_content[3:]
                if csv_content.endswith("```"):
                    csv_content = csv_content[:-3]
                csv_content = csv_content.strip()

                parsed = parse_csv(csv_content)
            except Exception as e:
                parse_error = str(e)

        message = Message(
            role=message_data.get("role", ""),
            content=content,
            parsed=parsed,
            csv_content=csv_content,
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
    """Main execution - demonstrates structured CSV output API with sample question."""
    log_progress("INIT", "Starting Gemini Structured Output (CSV) API Client...")

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

        # Now demonstrate structured CSV output
        log_progress("STRUCTURED", "Demonstrating structured CSV output capability...")

        # Define CSV schema for CalendarEvent
        calendar_event_schema = define_csv_schema("CalendarEvent", [
            {"name": "name", "type": "string", "description": "Event name"},
            {"name": "date", "type": "string", "description": "Event date"},
            {"name": "participants", "type": "array", "description": "List of participants"},
        ])

        log_progress("SCHEMA", "Created CalendarEvent CSV schema")

        event_prompt = "John and Susan are going to an AI conference on Friday."

        structured_request_options = {
            "model": "gemini-2.0-flash",
            "temperature": 0.1,  # Lower temperature for consistent CSV output
        }

        log_progress("API", "Sending structured CSV request to Gemini API...")
        structured_response = chat_completion_parse_csv(
            client,
            messages=[
                {"role": "system", "content": "Extract the event information."},
                {"role": "user", "content": event_prompt},
            ],
            csv_schema=calendar_event_schema,
            model=structured_request_options["model"],
            temperature=structured_request_options["temperature"],
        )
        log_progress("API", "Received structured CSV response from API")

        format_output(
            event_prompt,
            structured_response,
            structured_request_options,
            calendar_event_schema,
        )

        # Print the parsed result
        if structured_response.choices and structured_response.choices[0].message.parsed:
            parsed = structured_response.choices[0].message.parsed
            log_progress("RESULT", "Parsed CalendarEvent from CSV:")
            for row in parsed:
                print(f"  Name: {row.get('name')}")
                print(f"  Date: {row.get('date')}")
                participants = row.get('participants', [])
                if isinstance(participants, list):
                    print(f"  Participants: {', '.join(str(p) for p in participants)}")
                else:
                    print(f"  Participants: {participants}")

        # Additional example: Multiple events in CSV format
        log_progress("STRUCTURED", "Demonstrating multiple rows CSV output...")

        multi_event_prompt = """Extract all events from this text:
    - Team meeting on Monday with Alice, Bob, and Charlie
    - Product launch on Wednesday with the marketing team
    - Code review on Thursday with developers"""

        log_progress("API", "Sending multi-event CSV request to Gemini API...")
        multi_event_response = chat_completion_parse_csv(
            client,
            messages=[
                {"role": "system", "content": "Extract ALL events as separate rows in the CSV."},
                {"role": "user", "content": multi_event_prompt},
            ],
            csv_schema=calendar_event_schema,
            model="gemini-2.0-flash",
            temperature=0.1,
        )
        log_progress("API", "Received multi-event CSV response from API")

        format_output(
            multi_event_prompt,
            multi_event_response,
            {"model": "gemini-2.0-flash", "temperature": 0.1},
            calendar_event_schema,
        )

        if multi_event_response.choices and multi_event_response.choices[0].message.parsed:
            multi_parsed = multi_event_response.choices[0].message.parsed
            log_progress("RESULT", f"Parsed {len(multi_parsed)} events from CSV:")
            for i, event in enumerate(multi_parsed, 1):
                print(f"  Event {i}:")
                print(f"    Name: {event.get('name')}")
                print(f"    Date: {event.get('date')}")
                participants = event.get('participants', [])
                if isinstance(participants, list):
                    print(f"    Participants: {', '.join(str(p) for p in participants)}")
                else:
                    print(f"    Participants: {participants}")

        # Additional example: Recipe with different data types
        log_progress("STRUCTURED", "Demonstrating Recipe CSV with various data types...")

        recipe_schema = define_csv_schema("Recipe", [
            {"name": "recipe_name", "type": "string", "description": "Name of the recipe"},
            {"name": "ingredients", "type": "array", "description": "List of ingredients"},
            {"name": "cooking_time_minutes", "type": "integer", "description": "Cooking time in minutes"},
            {"name": "difficulty", "type": "string", "description": "Difficulty level (easy, medium, hard)"},
            {"name": "vegetarian", "type": "boolean", "description": "Is the recipe vegetarian?"},
        ])

        recipe_prompt = "Give me a simple pasta recipe with tomatoes and garlic that takes about 20 minutes."

        log_progress("API", "Sending recipe CSV request to Gemini API...")
        recipe_response = chat_completion_parse_csv(
            client,
            messages=[
                {"role": "system", "content": "Extract recipe information."},
                {"role": "user", "content": recipe_prompt},
            ],
            csv_schema=recipe_schema,
            model="gemini-2.0-flash",
            temperature=0.1,
        )
        log_progress("API", "Received recipe CSV response from API")

        format_output(
            recipe_prompt,
            recipe_response,
            {"model": "gemini-2.0-flash", "temperature": 0.1},
            recipe_schema,
        )

        if recipe_response.choices and recipe_response.choices[0].message.parsed:
            recipe_parsed = recipe_response.choices[0].message.parsed
            if recipe_parsed:
                recipe = recipe_parsed[0]
                log_progress("RESULT", "Parsed Recipe from CSV:")
                print(f"  Name: {recipe.get('recipe_name')}")
                print(f"  Cooking Time: {recipe.get('cooking_time_minutes')} minutes")
                print(f"  Difficulty: {recipe.get('difficulty')}")
                print(f"  Vegetarian: {recipe.get('vegetarian')}")
                print("  Ingredients:")
                ingredients = recipe.get("ingredients", [])
                if isinstance(ingredients, list):
                    for i, ing in enumerate(ingredients, 1):
                        print(f"    {i}. {ing}")
                else:
                    print(f"    {ingredients}")

        # Demonstrate CSV serialization
        log_progress("CSV", "Demonstrating CSV serialization...")
        if recipe_response.choices and recipe_response.choices[0].message.parsed:
            print("\n--- Re-serialized to CSV ---")
            print(to_csv(recipe_response.choices[0].message.parsed))

        log_progress("COMPLETE", "Structured CSV output demo completed successfully")

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
