#!/usr/bin/env python3
"""
Gemini OpenAI-Compatible REST API Client - Function Calling Example
Single-file implementation using Python 3.11+ httpx

Features:
- Function/Tool calling support (OpenAI-compatible)
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
class FunctionDefinition:
    """Represents a function definition."""
    name: str
    description: str
    parameters: dict[str, Any]


@dataclass
class Tool:
    """Represents a tool definition."""
    type: str
    function: FunctionDefinition


@dataclass
class ToolCallFunction:
    """Represents a function call within a tool call."""
    name: str
    arguments: str  # JSON string


@dataclass
class ToolCall:
    """Represents a tool call from the model."""
    id: str
    type: str
    function: ToolCallFunction


@dataclass
class Message:
    """Represents a chat message."""
    role: str
    content: str | None = None
    tool_calls: list[ToolCall] | None = None


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
) -> None:
    """
    Formats and prints the response in a user-friendly way.

    Args:
        question: The original question asked
        response: The API response object
        request_options: The request options used
    """
    request_options = request_options or {}

    print(f"\n{SEPARATOR}")
    print("  GEMINI FUNCTION CALLING CHAT COMPLETION")
    print(SEPARATOR)

    # Print the question for context
    print("\n[QUESTION]")
    print(THIN_SEPARATOR)
    print(question)

    # Print request parameters
    print("\n[REQUEST PARAMS]")
    print(THIN_SEPARATOR)
    params: dict[str, Any] = {
        "model": request_options.get("model", DEFAULT_MODEL),
        "tool_choice": request_options.get("tool_choice", "auto"),
        "tools_count": len(request_options.get("tools", [])),
    }
    if "temperature" in request_options:
        params["temperature"] = request_options["temperature"]
    if "max_tokens" in request_options:
        params["max_tokens"] = request_options["max_tokens"]
    print(json.dumps(params, indent=2))

    # Print tools
    tools = request_options.get("tools", [])
    if tools:
        print("\n[AVAILABLE TOOLS]")
        print(THIN_SEPARATOR)
        for tool in tools:
            func = tool.get("function", {})
            print(f"  - {func.get('name')}: {func.get('description')}")

    # Print the response content
    choice = response.choices[0] if response.choices else None

    print("\n[RESPONSE]")
    print(THIN_SEPARATOR)
    if choice and choice.message.content:
        print(choice.message.content)

    # Print tool calls if present
    if choice and choice.message.tool_calls:
        print("\n[TOOL CALLS]")
        print(THIN_SEPARATOR)
        for tool_call in choice.message.tool_calls:
            print(f"  Function: {tool_call.function.name}")
            print(f"  Call ID:  {tool_call.id}")
            print("  Arguments:")
            try:
                args = json.loads(tool_call.function.arguments)
                print(json.dumps(args, indent=4))
            except json.JSONDecodeError:
                print(f"    {tool_call.function.arguments}")
            print()

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


def format_tool_result_output(response: ChatCompletionResponse) -> None:
    """
    Formats output for tool result follow-up.

    Args:
        response: The API response after tool result
    """
    print(f"\n{SEPARATOR}")
    print("  FUNCTION RESULT - FINAL RESPONSE")
    print(SEPARATOR)

    choice = response.choices[0] if response.choices else None

    # Print the final response content
    print("\n[ASSISTANT RESPONSE]")
    print(THIN_SEPARATOR)
    if choice and choice.message.content:
        print(choice.message.content)

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
# Tool Definition Functions
# =============================================================================

def define_tool(
    name: str,
    description: str,
    parameters: dict[str, Any],
) -> dict[str, Any]:
    """
    Defines a function/tool for the API.

    Args:
        name: Function name
        description: Function description
        parameters: JSON Schema for parameters

    Returns:
        Tool definition in OpenAI format
    """
    return {
        "type": "function",
        "function": {
            "name": name,
            "description": description,
            "parameters": parameters,
        },
    }


def extract_tool_calls(response: ChatCompletionResponse) -> list[ToolCall] | None:
    """
    Extracts tool calls from the response.

    Args:
        response: API response

    Returns:
        List of tool calls or None if none
    """
    if not response.choices:
        return None
    if not response.choices[0].message.tool_calls:
        return None
    return response.choices[0].message.tool_calls


def create_tool_response(
    tool_call_id: str,
    name: str,
    result: Any,
) -> dict[str, Any]:
    """
    Creates a tool response message for the conversation.

    Args:
        tool_call_id: The tool_call_id from the assistant's response
        name: The function name
        result: The result to return (will be JSON stringified if not string)

    Returns:
        Tool response message
    """
    content = result if isinstance(result, str) else json.dumps(result)
    return {
        "role": "tool",
        "tool_call_id": tool_call_id,
        "name": name,
        "content": content,
    }


# =============================================================================
# API Functions
# =============================================================================

def chat_completion(
    client: httpx.Client,
    messages: list[dict[str, Any]],
    model: str = DEFAULT_MODEL,
    tools: list[dict[str, Any]] | None = None,
    tool_choice: str | dict[str, Any] | None = None,
    temperature: float | None = None,
    max_tokens: int | None = None,
    top_p: float | None = None,
    n: int | None = None,
    stop: str | list[str] | None = None,
    **kwargs: Any,
) -> ChatCompletionResponse:
    """
    Performs a chat completion request with function calling support.

    Args:
        client: httpx Client from create_client()
        messages: Array of message objects
        model: Model to use
        tools: Array of tool definitions
        tool_choice: Tool choice: "auto", "none", "required", or specific function
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

    # Add tools if provided
    if tools is not None:
        body["tools"] = tools
    if tool_choice is not None:
        body["tool_choice"] = tool_choice
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

        # Parse tool calls if present
        tool_calls = None
        if "tool_calls" in message_data:
            tool_calls = []
            for tc_data in message_data["tool_calls"]:
                func_data = tc_data.get("function", {})
                tool_call = ToolCall(
                    id=tc_data.get("id", ""),
                    type=tc_data.get("type", "function"),
                    function=ToolCallFunction(
                        name=func_data.get("name", ""),
                        arguments=func_data.get("arguments", ""),
                    ),
                )
                tool_calls.append(tool_call)

        message = Message(
            role=message_data.get("role", ""),
            content=message_data.get("content"),
            tool_calls=tool_calls,
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
# Simulated Function Implementations
# =============================================================================

def get_weather(location: str, unit: str = "fahrenheit") -> dict[str, Any]:
    """
    Simulated weather function for demo.

    Args:
        location: The city and state
        unit: Temperature unit (celsius or fahrenheit)

    Returns:
        Weather data dictionary
    """
    weather_data = {
        "Chicago, IL": {"temp": 22, "condition": "Partly cloudy", "humidity": 65},
        "New York, NY": {"temp": 18, "condition": "Sunny", "humidity": 55},
        "Los Angeles, CA": {"temp": 28, "condition": "Clear", "humidity": 40},
    }

    # Find matching location (case-insensitive partial match)
    matched_location = None
    for loc in weather_data:
        if location.lower().split(",")[0] in loc.lower():
            matched_location = loc
            break

    if matched_location:
        data = weather_data[matched_location]
        temp = data["temp"]
        if unit == "fahrenheit":
            temp = round((temp * 9) / 5 + 32)
        return {
            "location": matched_location,
            "temperature": temp,
            "unit": unit,
            "condition": data["condition"],
            "humidity": data["humidity"],
        }

    return {
        "location": location,
        "temperature": 20,
        "unit": unit,
        "condition": "Unknown",
        "humidity": 50,
        "note": "Simulated data for unknown location",
    }


FUNCTION_IMPLEMENTATIONS = {
    "get_weather": get_weather,
}


def execute_tool_call(tool_call: ToolCall) -> Any:
    """
    Executes a tool call using local function implementations.

    Args:
        tool_call: The tool call from the API response

    Returns:
        The function result
    """
    func_name = tool_call.function.name
    args = json.loads(tool_call.function.arguments)

    if func_name in FUNCTION_IMPLEMENTATIONS:
        return FUNCTION_IMPLEMENTATIONS[func_name](**args)

    raise ValueError(f"Function {func_name} not implemented")


# =============================================================================
# Main Execution
# =============================================================================

def main() -> None:
    """Main execution - demonstrates function calling with the API."""
    log_progress("INIT", "Starting Gemini Function Calling API Client...")

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

    # Define the weather tool
    log_progress("TOOLS", "Defining available tools...")
    weather_tool = define_tool(
        name="get_weather",
        description="Get the current weather in a given location",
        parameters={
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "The city and state, e.g. Chicago, IL",
                },
                "unit": {
                    "type": "string",
                    "enum": ["celsius", "fahrenheit"],
                    "description": "Temperature unit",
                },
            },
            "required": ["location"],
        },
    )
    log_progress("TOOLS", f"Registered tool: {weather_tool['function']['name']}")

    question = "What's the weather like in Chicago today?"

    request_options = {
        "model": "gemini-2.0-flash",
        "tools": [weather_tool],
        "tool_choice": "auto",
        # "temperature": 0.7,
        # "max_tokens": 1000,
    }

    log_progress("REQUEST", "Preparing request...")
    log_progress("REQUEST", f"Model: {request_options['model']}")
    log_progress("REQUEST", f'Question: "{question}"')

    try:
        # Step 1: Initial request with function definitions
        log_progress("API", "Sending initial request with tool definitions...")
        response = chat_completion(
            client,
            messages=[{"role": "user", "content": question}],
            model=request_options["model"],
            tools=request_options["tools"],
            tool_choice=request_options["tool_choice"],
        )
        log_progress("API", "Received response from API")

        format_output(question, response, request_options)

        # Step 2: Check if the model wants to call a function
        tool_calls = extract_tool_calls(response)

        if tool_calls:
            log_progress("FUNCTION", "Model requested function call(s)")

            # Execute each tool call
            tool_responses = []
            for tool_call in tool_calls:
                log_progress(
                    "FUNCTION",
                    f"Executing: {tool_call.function.name}({tool_call.function.arguments})"
                )

                result = execute_tool_call(tool_call)
                log_progress("FUNCTION", f"Result: {json.dumps(result)}")

                tool_responses.append(
                    create_tool_response(tool_call.id, tool_call.function.name, result)
                )

            # Step 3: Send tool results back to the model
            log_progress("API", "Sending tool results back to model...")

            # Build assistant message with tool_calls for context
            assistant_message: dict[str, Any] = {
                "role": "assistant",
                "content": response.choices[0].message.content,
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": tc.type,
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in response.choices[0].message.tool_calls
                ],
            }

            follow_up_messages = [
                {"role": "user", "content": question},
                assistant_message,
                *tool_responses,
            ]

            follow_up_response = chat_completion(
                client,
                messages=follow_up_messages,
                model=request_options["model"],
                tools=request_options["tools"],
                tool_choice=request_options["tool_choice"],
            )

            log_progress("API", "Received final response")
            format_tool_result_output(follow_up_response)
        else:
            log_progress("INFO", "No function calls requested by model")

        log_progress("COMPLETE", "Function calling demo completed successfully")

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
