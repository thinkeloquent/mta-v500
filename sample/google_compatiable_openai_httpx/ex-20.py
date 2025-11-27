#!/usr/bin/env python3
"""
Gemini OpenAI-Compatible REST API Client - React Component Modifier Example
Single-file implementation using Python 3.11+ httpx

Features:
- Structured output for React component modifications
- Template-based input (RAG-style: source code + changes)
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


def format_output(
    original_code: str,
    changes: list[str],
    response: ChatCompletionResponse,
    request_options: dict[str, Any] | None = None,
) -> None:
    """
    Formats and prints the response in a user-friendly way.

    Args:
        original_code: The original React code
        changes: List of requested changes
        response: The API response object
        request_options: The request options used
    """
    request_options = request_options or {}

    print(f"\n{SEPARATOR}")
    print("  GEMINI REACT COMPONENT MODIFIER")
    print(SEPARATOR)

    # Print the original code (truncated for display)
    print("\n[ORIGINAL CODE]")
    print(THIN_SEPARATOR)
    lines = original_code.strip().split("\n")
    if len(lines) > 15:
        print("\n".join(lines[:10]))
        print(f"  ... ({len(lines) - 10} more lines)")
    else:
        print(original_code.strip())

    # Print requested changes
    print("\n[REQUESTED CHANGES]")
    print(THIN_SEPARATOR)
    for i, change in enumerate(changes, 1):
        print(f"  {i}. {change}")

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

        print("\n[MODIFICATION DETAILS]")
        print(THIN_SEPARATOR)
        details = {
            "componentName": parsed.get("componentName"),
            "changesApplied": parsed.get("changesApplied"),
            "description": parsed.get("description"),
        }
        print(json.dumps(details, indent=2))

        print("\n[MODIFIED CODE]")
        print(THIN_SEPARATOR)
        if parsed.get("modifiedCode"):
            print(parsed["modifiedCode"])

        if parsed.get("explanation"):
            print("\n[EXPLANATION]")
            print(THIN_SEPARATOR)
            print(parsed["explanation"])

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

def define_react_modifier_schema(
    component_name: str,
    changes: list[str],
) -> dict[str, Any]:
    """
    Defines a schema for React component modification output.

    Args:
        component_name: Name of the component being modified
        changes: List of changes to apply

    Returns:
        Schema definition with system prompt
    """
    changes_text = "\n".join(f"  {i}. {change}" for i, change in enumerate(changes, 1))

    system_prompt = f"""You are a React component modifier. You will receive a React component and a list of changes to apply.

Your task:
1. Apply ALL the requested changes to the component
2. Return the result as a JSON object

Changes to apply:
{changes_text}

Output Format - Respond with ONLY valid JSON (no markdown, no code blocks, no backticks):
{{
  "componentName": "{component_name}",
  "description": "Brief description of the component and its purpose",
  "changesApplied": [
    "Description of each change that was applied"
  ],
  "modifiedCode": "The complete modified React component code as a string",
  "explanation": "Detailed explanation of all modifications made",
  "props": {{
    "propName": {{ "type": "string", "description": "prop description" }}
  }},
  "imports": ["list of import statements needed"]
}}

Important:
- Apply ALL requested changes
- Preserve existing functionality that wasn't requested to change
- Use proper React/JSX syntax
- Include all necessary imports
- The modifiedCode should be complete and ready to use"""

    return {
        "name": f"{component_name}Modifier",
        "component_name": component_name,
        "changes": changes,
        "system_prompt": system_prompt,
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
    Performs a standard chat completion request.

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


def chat_completion_modify_component(
    client: httpx.Client,
    messages: list[dict[str, str]],
    modifier_schema: dict[str, Any],
    model: str = DEFAULT_MODEL,
    temperature: float | None = None,
    max_tokens: int | None = None,
    top_p: float | None = None,
    n: int | None = None,
    stop: str | list[str] | None = None,
    **kwargs: Any,
) -> ChatCompletionResponse:
    """
    Performs a structured chat completion request for React component modification.

    Args:
        client: httpx Client from create_client()
        messages: Array of {role, content} message objects
        modifier_schema: Schema from define_react_modifier_schema()
        model: Model to use
        temperature: Sampling temperature (0-2)
        max_tokens: Maximum tokens to generate
        top_p: Nucleus sampling parameter
        n: Number of completions to generate
        stop: Stop sequence(s)
        **kwargs: Additional parameters passed to the API

    Returns:
        ChatCompletionResponse object with parsed modification
    """
    if not messages or not isinstance(messages, list):
        raise ValueError("messages is required and must be a list")

    if not modifier_schema:
        raise ValueError("modifier_schema is required for component modification")

    # Merge system prompts
    messages_with_schema = []
    has_system_message = False

    for msg in messages:
        if msg.get("role") == "system":
            messages_with_schema.append({
                "role": "system",
                "content": f"{modifier_schema['system_prompt']}\n\nAdditional instructions: {msg['content']}",
            })
            has_system_message = True
        else:
            messages_with_schema.append(msg)

    if not has_system_message:
        messages_with_schema.insert(0, {"role": "system", "content": modifier_schema["system_prompt"]})

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

        # Parse the JSON response
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
    """Main execution - demonstrates the React component modifier."""
    log_progress("INIT", "Starting Gemini React Component Modifier...")

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

    # Original React component code (RAG-style template input)
    original_code = """import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

const bull = (
  <Box
    component="span"
    sx={{ display: 'inline-block', mx: '2px', transform: 'scale(0.8)' }}
  >
    •
  </Box>
);

export default function BasicCard() {
  return (
    <Card sx={{ minWidth: 275 }}>
      <CardContent>
        <Typography gutterBottom sx={{ color: 'text.secondary', fontSize: 14 }}>
          Word of the Day
        </Typography>
        <Typography variant="h5" component="div">
          be{bull}nev{bull}o{bull}lent
        </Typography>
        <Typography sx={{ color: 'text.secondary', mb: 1.5 }}>adjective</Typography>
        <Typography variant="body2">
          well meaning and kindly.
          <br />
          {'"a benevolent smile"'}
        </Typography>
      </CardContent>
      <CardActions>
        <Button size="small">Learn More</Button>
      </CardActions>
    </Card>
  );
}"""

    # Requested changes
    changes = [
        "`Word of the Day` > `hello world`",
        "replace `<Typography variant=\"h5\">` with image (https://mui.com/static/images/cards/paella.jpg) element",
        "make `<Button />` green",
    ]

    log_progress("INPUT", "Preparing component modification request...")
    log_progress("INPUT", f"Component: BasicCard")
    log_progress("INPUT", f"Changes requested: {len(changes)}")

    try:
        # Create modifier schema
        modifier_schema = define_react_modifier_schema(
            component_name="BasicCard",
            changes=changes,
        )
        log_progress("SCHEMA", "Created modifier schema")

        # Build user prompt with template (RAG-style)
        user_prompt = f"""Please modify the following React component according to the specified changes.

ORIGINAL COMPONENT:
```jsx
{original_code}
```

Apply all the changes listed in the system prompt and return the modified component."""

        request_options = {
            "model": "gemini-2.0-flash",
            "temperature": 0.2,  # Lower temperature for consistent output
            "max_tokens": 4096,
        }

        log_progress("API", "Sending modification request to Gemini API...")
        response = chat_completion_modify_component(
            client,
            messages=[
                {"role": "system", "content": "Apply changes precisely while maintaining code quality."},
                {"role": "user", "content": user_prompt},
            ],
            modifier_schema=modifier_schema,
            model=request_options["model"],
            temperature=request_options["temperature"],
            max_tokens=request_options["max_tokens"],
        )
        log_progress("API", "Received response from API")

        log_progress("FORMAT", "Formatting output...")
        format_output(original_code, changes, response, request_options)

        # Print summary
        if response.choices and response.choices[0].message.parsed:
            parsed = response.choices[0].message.parsed
            log_progress("RESULT", "Modification completed successfully")
            log_progress("RESULT", f"Component: {parsed.get('componentName', 'N/A')}")
            changes_applied = parsed.get('changesApplied', [])
            log_progress("RESULT", f"Changes applied: {len(changes_applied)}")
            for i, change in enumerate(changes_applied, 1):
                log_progress("RESULT", f"  {i}. {change}")
        else:
            log_progress("WARN", "Could not parse structured response")

        log_progress("COMPLETE", "React component modification completed successfully")

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
