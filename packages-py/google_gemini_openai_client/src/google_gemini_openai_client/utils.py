"""
google_gemini_openai_client - Utilities

Logging, formatting, and helper functions.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from .models import ChatCompletionResponse, Usage, StructuredOutputSchema
from .config import SEPARATOR, THIN_SEPARATOR

# =============================================================================
# Logging Utilities
# =============================================================================


def log_progress(stage: str, message: str = "") -> None:
    """
    Logs a progress message with timestamp and stage.

    Args:
        stage: Current stage name (e.g., "INIT", "CLIENT", "API")
        message: Optional descriptive message

    Example:
        >>> log_progress("API", "Calling Gemini...")
        [12:34:56.789] [API] Calling Gemini...
    """
    timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    print(f"[{timestamp}] [{stage}] {message}")


# =============================================================================
# Formatting Utilities
# =============================================================================


def format_output(question: str, response: ChatCompletionResponse) -> None:
    """
    Formats and prints a chat completion response in a user-friendly way.

    Args:
        question: The original question asked
        response: The API response object
    """
    print(f"\n{SEPARATOR}")
    print("  GEMINI CHAT COMPLETION")
    print(SEPARATOR)

    # Print the question for context
    print("\n[QUESTION]")
    print(THIN_SEPARATOR)
    print(question)

    # Print the response content
    print("\n[RESPONSE]")
    print(THIN_SEPARATOR)
    if response.choices and len(response.choices) > 0:
        print(response.choices[0].message.content)

    # Print metadata
    print("\n[METADATA]")
    print(THIN_SEPARATOR)
    metadata = {
        "id": response.id or "N/A",
        "model": response.model or "N/A",
        "created": (
            datetime.fromtimestamp(response.created).isoformat()
            if response.created
            else "N/A"
        ),
        "finish_reason": (
            response.choices[0].finish_reason if response.choices else "N/A"
        ),
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


def format_usage(usage: Usage | None) -> str:
    """
    Formats usage statistics as a string.

    Args:
        usage: Token usage statistics

    Returns:
        Formatted usage string
    """
    if not usage:
        return "N/A"
    return (
        f"Prompt: {usage.prompt_tokens}, "
        f"Completion: {usage.completion_tokens}, "
        f"Total: {usage.total_tokens}"
    )


# =============================================================================
# Schema Utilities
# =============================================================================


def create_json_schema(
    name: str,
    properties: dict[str, dict[str, Any]],
    required: list[str] | None = None,
    description: str | None = None,
) -> StructuredOutputSchema:
    """
    Creates a JSON schema definition for structured output.

    Args:
        name: Schema name
        properties: Object properties definition
        required: Required property names
        description: Optional schema description

    Returns:
        StructuredOutputSchema object

    Example:
        >>> schema = create_json_schema(
        ...     "user_info",
        ...     {
        ...         "name": {"type": "string", "description": "User name"},
        ...         "age": {"type": "number", "description": "User age"},
        ...     },
        ...     required=["name", "age"],
        ... )
    """
    return StructuredOutputSchema(
        name=name,
        description=description,
        schema={
            "type": "object",
            "properties": properties,
            "required": required or [],
            "additionalProperties": False,
        },
        strict=True,
    )


def create_simple_schema(
    name: str,
    property_name: str,
    property_type: str,
    description: str | None = None,
) -> StructuredOutputSchema:
    """
    Creates a simple JSON schema for a single value extraction.

    Args:
        name: Schema name
        property_name: Name of the property to extract
        property_type: Type of the property ('string', 'number', 'boolean', etc.)
        description: Optional property description

    Returns:
        StructuredOutputSchema object
    """
    return StructuredOutputSchema(
        name=name,
        schema={
            "type": "object",
            "properties": {
                property_name: {
                    "type": property_type,
                    "description": description,
                }
                if description
                else {"type": property_type},
            },
            "required": [property_name],
            "additionalProperties": False,
        },
        strict=True,
    )


# =============================================================================
# Message Utilities
# =============================================================================


def system_message(content: str) -> dict[str, str]:
    """
    Creates a system message.

    Args:
        content: System message content

    Returns:
        Message dict
    """
    return {"role": "system", "content": content}


def user_message(content: str) -> dict[str, str]:
    """
    Creates a user message.

    Args:
        content: User message content

    Returns:
        Message dict
    """
    return {"role": "user", "content": content}


def assistant_message(content: str) -> dict[str, str]:
    """
    Creates an assistant message.

    Args:
        content: Assistant message content

    Returns:
        Message dict
    """
    return {"role": "assistant", "content": content}
