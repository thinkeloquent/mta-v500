#!/usr/bin/env python3
"""
Gemini OpenAI-Compatible REST API Client - Structured Output (React Component) Example
Single-file implementation using Python 3.11+ httpx

Features:
- Structured output for generating React components
- Component schema with props, state, and JSX template
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
SEPARATOR = "=" * 70
THIN_SEPARATOR = "-" * 70


# =============================================================================
# Data Classes for Response Models
# =============================================================================

@dataclass
class Message:
    """Represents a chat message."""
    role: str
    content: str
    parsed: dict[str, Any] | None = None
    raw_json: str | None = None
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


def generate_component_file(parsed: dict[str, Any] | None) -> str:
    """
    Generates a complete React component file from parsed response.

    Args:
        parsed: Parsed component data

    Returns:
        Complete component file content
    """
    if not parsed:
        return ""

    # If fullCode is provided, use it directly
    if parsed.get("fullCode"):
        return parsed["fullCode"]

    # Otherwise, build from parts
    code = ""

    # Imports
    imports = parsed.get("imports", [])
    if imports:
        code += "\n".join(imports) + "\n\n"
    else:
        code += "import React from 'react';\n\n"

    # Component code
    if parsed.get("componentCode"):
        code += parsed["componentCode"] + "\n\n"

    # PropTypes
    if parsed.get("propTypes"):
        code += parsed["propTypes"] + "\n\n"

    # Default props
    if parsed.get("defaultProps"):
        code += parsed["defaultProps"] + "\n\n"

    # Export
    component_name = parsed.get("componentName", "Component")
    if f"export default {component_name}" not in code:
        code += f"export default {component_name};\n"

    return code


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
    print("  GEMINI STRUCTURED OUTPUT (REACT COMPONENT) CHAT COMPLETION")
    print(SEPARATOR)

    # Print the question/prompt for context
    print("\n[PROMPT]")
    print(THIN_SEPARATOR)
    print(question)

    # Print schema info if provided
    if schema_info:
        print("\n[COMPONENT SCHEMA]")
        print(THIN_SEPARATOR)
        print(f"Name: {schema_info.get('name', 'N/A')}")
        print(f"Type: {schema_info.get('component_type', 'functional')}")
        if schema_info.get("description"):
            print(f"Description: {schema_info['description']}")
        props = schema_info.get("props", [])
        if props:
            print(f"Props: {', '.join(p['name'] for p in props)}")
        state = schema_info.get("state", [])
        if state:
            print(f"State: {', '.join(s['name'] for s in state)}")

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
    print(json.dumps(params, indent=2))

    choice = response.choices[0] if response.choices else None

    # Print parsed component info
    if choice and choice.message.parsed:
        parsed = choice.message.parsed

        print("\n[GENERATED COMPONENT INFO]")
        print(THIN_SEPARATOR)
        print(json.dumps({
            "componentName": parsed.get("componentName"),
            "componentType": parsed.get("componentType"),
            "props": parsed.get("props"),
            "state": parsed.get("state"),
        }, indent=2))

        print("\n[GENERATED CODE]")
        print(THIN_SEPARATOR)
        print(generate_component_file(parsed))

        if parsed.get("usage"):
            print("\n[USAGE EXAMPLE]")
            print(THIN_SEPARATOR)
            print(parsed["usage"])

    # Print parse error if any
    if choice and choice.message.parse_error:
        print("\n[PARSE ERROR]")
        print(THIN_SEPARATOR)
        print(choice.message.parse_error)
        print("\n[RAW CONTENT]")
        print(THIN_SEPARATOR)
        print(choice.message.content)

    # Print raw content for non-parsed responses
    if choice and not choice.message.parsed and choice.message.content and not choice.message.parse_error:
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

def define_react_component_schema(
    name: str,
    description: str = "",
    props: list[dict[str, Any]] | None = None,
    state: list[dict[str, Any]] | None = None,
    template: str = "",
    imports: list[str] | None = None,
    component_type: str = "functional",
) -> dict[str, Any]:
    """
    Defines a React component schema for structured output.

    Args:
        name: Component name (PascalCase)
        description: Component description
        props: Props definitions [{name, type, description, required, defaultValue}]
        state: State definitions [{name, type, initialValue, description}]
        template: JSX template hint (e.g., "<div>{{content}}</div>")
        imports: Required imports
        component_type: "functional" or "class" (default: functional)

    Returns:
        Schema definition
    """
    props = props or []
    state = state or []
    imports = imports or []

    # Build props description
    if props:
        props_desc_lines = []
        for p in props:
            desc = f"  - {p['name']}: {p.get('type', 'any')}"
            if p.get("required"):
                desc += " (required)"
            if p.get("defaultValue") is not None:
                desc += f" = {json.dumps(p['defaultValue'])}"
            if p.get("description"):
                desc += f" - {p['description']}"
            props_desc_lines.append(desc)
        props_desc = "\n".join(props_desc_lines)
    else:
        props_desc = "  (no props)"

    # Build state description
    if state:
        state_desc_lines = []
        for s in state:
            desc = f"  - {s['name']}: {s.get('type', 'any')}"
            if s.get("initialValue") is not None:
                desc += f" = {json.dumps(s['initialValue'])}"
            if s.get("description"):
                desc += f" - {s['description']}"
            state_desc_lines.append(desc)
        state_desc = "\n".join(state_desc_lines)
    else:
        state_desc = "  (no state)"

    # Build imports hint
    imports_hint = f"Required imports: {', '.join(imports)}" if imports else ""

    # Build template hint
    template_hint = f"Template structure hint: {template}" if template else ""

    system_prompt = f"""You are a React component generator. Generate a complete, working React {component_type} component.

Component Requirements:
- Name: {name}
- Type: {component_type} component
{f'- Description: {description}' if description else ''}

Props:
{props_desc}

State:
{state_desc}

{imports_hint}
{template_hint}

Output Format - Respond with ONLY valid JSON (no markdown, no code blocks):
{{
  "componentName": "{name}",
  "componentType": "{component_type}",
  "imports": ["import statements as strings"],
  "props": {{
    "propName": {{ "type": "string", "required": true, "defaultValue": null }}
  }},
  "state": {{
    "stateName": {{ "type": "string", "initialValue": "" }}
  }},
  "propTypes": "PropTypes definition as string or null",
  "defaultProps": "defaultProps definition as string or null",
  "componentCode": "The complete component function/class code as a string",
  "fullCode": "The complete file content including imports, component, and exports",
  "usage": "Example usage of the component as JSX string"
}}

Generate clean, modern React code following best practices. Use hooks for functional components."""

    return {
        "name": name,
        "description": description,
        "props": props,
        "state": state,
        "template": template,
        "imports": imports,
        "component_type": component_type,
        "system_prompt": system_prompt,
        "_schema": {
            "name": name,
            "description": description,
            "props": props,
            "state": state,
            "template": template,
            "imports": imports,
            "component_type": component_type,
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


def chat_completion_parse_component(
    client: httpx.Client,
    messages: list[dict[str, str]],
    component_schema: dict[str, Any],
    model: str = DEFAULT_MODEL,
    temperature: float | None = None,
    max_tokens: int | None = None,
    top_p: float | None = None,
    n: int | None = None,
    stop: str | list[str] | None = None,
    **kwargs: Any,
) -> ChatCompletionResponse:
    """
    Performs a structured chat completion request for React component generation.

    Args:
        client: httpx Client from create_client()
        messages: Array of {role, content} message objects
        component_schema: Schema from define_react_component_schema()
        model: Model to use
        temperature: Sampling temperature (0-2)
        max_tokens: Maximum tokens to generate
        top_p: Nucleus sampling parameter
        n: Number of completions to generate
        stop: Stop sequence(s)
        **kwargs: Additional parameters passed to the API

    Returns:
        ChatCompletionResponse object with parsed component
    """
    if not messages or not isinstance(messages, list):
        raise ValueError("messages is required and must be a list")

    if not component_schema:
        raise ValueError("component_schema is required for React component generation")

    # Merge system prompts
    messages_with_schema = []
    has_system_message = False

    for msg in messages:
        if msg.get("role") == "system":
            # Combine the component schema with the existing system message
            messages_with_schema.append({
                "role": "system",
                "content": f"{component_schema['system_prompt']}\n\nAdditional instructions: {msg['content']}",
            })
            has_system_message = True
        else:
            messages_with_schema.append(msg)

    if not has_system_message:
        messages_with_schema.insert(0, {"role": "system", "content": component_schema["system_prompt"]})

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

        # Parse the JSON component from the response
        content = message_data.get("content", "")
        parsed = None
        raw_json = None
        parse_error = None

        if content:
            try:
                # Clean up the content (remove markdown code blocks if present)
                raw_json = content.strip()
                if raw_json.startswith("```json"):
                    raw_json = raw_json[7:]
                elif raw_json.startswith("```"):
                    raw_json = raw_json[3:]
                if raw_json.endswith("```"):
                    raw_json = raw_json[:-3]
                raw_json = raw_json.strip()

                parsed = json.loads(raw_json)
            except json.JSONDecodeError as e:
                parse_error = str(e)

        message = Message(
            role=message_data.get("role", ""),
            content=content,
            parsed=parsed,
            raw_json=raw_json,
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
    """Main execution - demonstrates React component generation."""
    log_progress("INIT", "Starting Gemini React Component Generator API Client...")

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
        # Standard chat completion first
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

        # Example 1: Simple Header Component
        log_progress("COMPONENT", "Generating simple Header component...")

        header_schema = define_react_component_schema(
            name="Header",
            description="A simple page header component with title and subtitle",
            component_type="functional",
            props=[
                {"name": "title", "type": "string", "required": True, "description": "Main title text"},
                {"name": "subtitle", "type": "string", "required": False, "description": "Optional subtitle"},
                {"name": "className", "type": "string", "required": False, "defaultValue": ""},
            ],
            template="<header><h1>{{title}}</h1><p>{{subtitle}}</p></header>",
        )

        header_prompt = "Generate a Header component with the specified props. Style it with inline styles for a modern look."

        log_progress("API", "Sending Header component request to Gemini API...")
        header_response = chat_completion_parse_component(
            client,
            messages=[
                {"role": "system", "content": "Generate clean, production-ready React code."},
                {"role": "user", "content": header_prompt},
            ],
            component_schema=header_schema,
            model="gemini-2.0-flash",
            temperature=0.2,
        )
        log_progress("API", "Received Header component response from API")

        format_output(header_prompt, header_response, {"model": "gemini-2.0-flash", "temperature": 0.2}, header_schema)

        # Example 2: Counter Component with State
        log_progress("COMPONENT", "Generating Counter component with state...")

        counter_schema = define_react_component_schema(
            name="Counter",
            description="An interactive counter component with increment/decrement buttons",
            component_type="functional",
            props=[
                {"name": "initialValue", "type": "number", "required": False, "defaultValue": 0},
                {"name": "step", "type": "number", "required": False, "defaultValue": 1},
                {"name": "min", "type": "number", "required": False},
                {"name": "max", "type": "number", "required": False},
                {"name": "onChange", "type": "function", "required": False, "description": "Callback when value changes"},
            ],
            state=[
                {"name": "count", "type": "number", "initialValue": 0, "description": "Current counter value"},
            ],
            imports=["React", "useState"],
            template="<div><button>-</button><span>{{count}}</span><button>+</button></div>",
        )

        counter_prompt = "Generate a Counter component using hooks. Include styled buttons and respect min/max limits if provided."

        log_progress("API", "Sending Counter component request to Gemini API...")
        counter_response = chat_completion_parse_component(
            client,
            messages=[
                {"role": "system", "content": "Generate clean, accessible React code with proper ARIA labels."},
                {"role": "user", "content": counter_prompt},
            ],
            component_schema=counter_schema,
            model="gemini-2.0-flash",
            temperature=0.2,
        )
        log_progress("API", "Received Counter component response from API")

        format_output(counter_prompt, counter_response, {"model": "gemini-2.0-flash", "temperature": 0.2}, counter_schema)

        # Example 3: Card Component
        log_progress("COMPONENT", "Generating Card component...")

        card_schema = define_react_component_schema(
            name="Card",
            description="A reusable card component for displaying content with optional image, title, and actions",
            component_type="functional",
            props=[
                {"name": "title", "type": "string", "required": True},
                {"name": "description", "type": "string", "required": False},
                {"name": "imageUrl", "type": "string", "required": False},
                {"name": "children", "type": "ReactNode", "required": False},
                {"name": "onClick", "type": "function", "required": False},
                {"name": "variant", "type": "string", "required": False, "defaultValue": "default", "description": "Card style variant: default, outlined, elevated"},
            ],
            template="""<article class="card">
  <img src="{{imageUrl}}" />
  <h3>{{title}}</h3>
  <p>{{description}}</p>
  {{children}}
</article>""",
        )

        card_prompt = "Generate a Card component with CSS-in-JS styles (inline styles object). Support hover effects and different variants."

        log_progress("API", "Sending Card component request to Gemini API...")
        card_response = chat_completion_parse_component(
            client,
            messages=[
                {"role": "system", "content": "Generate modern React code with clean styling."},
                {"role": "user", "content": card_prompt},
            ],
            component_schema=card_schema,
            model="gemini-2.0-flash",
            temperature=0.2,
        )
        log_progress("API", "Received Card component response from API")

        format_output(card_prompt, card_response, {"model": "gemini-2.0-flash", "temperature": 0.2}, card_schema)

        # Example 4: Form Input Component
        log_progress("COMPONENT", "Generating FormInput component...")

        form_input_schema = define_react_component_schema(
            name="FormInput",
            description="A form input component with label, validation, and error display",
            component_type="functional",
            props=[
                {"name": "label", "type": "string", "required": True},
                {"name": "name", "type": "string", "required": True},
                {"name": "type", "type": "string", "required": False, "defaultValue": "text"},
                {"name": "value", "type": "string", "required": True},
                {"name": "onChange", "type": "function", "required": True},
                {"name": "error", "type": "string", "required": False},
                {"name": "placeholder", "type": "string", "required": False},
                {"name": "required", "type": "boolean", "required": False, "defaultValue": False},
                {"name": "disabled", "type": "boolean", "required": False, "defaultValue": False},
            ],
            template="""<div class="form-group">
  <label for="{{name}}">{{label}}</label>
  <input type="{{type}}" name="{{name}}" value="{{value}}" />
  <span class="error">{{error}}</span>
</div>""",
        )

        form_input_prompt = "Generate a FormInput component with validation styling. Show error state with red border and error message."

        log_progress("API", "Sending FormInput component request to Gemini API...")
        form_input_response = chat_completion_parse_component(
            client,
            messages=[
                {"role": "system", "content": "Generate accessible form components following WAI-ARIA guidelines."},
                {"role": "user", "content": form_input_prompt},
            ],
            component_schema=form_input_schema,
            model="gemini-2.0-flash",
            temperature=0.2,
        )
        log_progress("API", "Received FormInput component response from API")

        format_output(form_input_prompt, form_input_response, {"model": "gemini-2.0-flash", "temperature": 0.2}, form_input_schema)

        log_progress("COMPLETE", "React component generation demo completed successfully")

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
