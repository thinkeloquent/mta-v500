#!/usr/bin/env python3
"""
Gemini OpenAI-Compatible REST API Client - React Component with Annotated Comments
Single-file implementation using Python 3.11+ httpx

Features:
- Two-step approach: Annotate original code, then generate modified version
- Adds inline comments to original code indicating required changes
- Structured output for React component modifications
- Template-based input (RAG-style: source code + changes)
- Proxy support (optional)
- Certificate/CA bundle support (optional)
- Keep-alive with configurable connections
- Custom headers
- Full OpenAI-compatible chat completion parameters
- User-friendly JSON output with metadata

Use Case:
- Step 1: Annotate original React component with comments showing where changes are needed
- Step 2: Generate the modified component with API integration

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


def format_annotation_output(
    original_code: str,
    changes: list[str],
    response: ChatCompletionResponse,
    request_options: dict[str, Any] | None = None,
) -> str | None:
    """
    Formats and prints the annotation response.

    Args:
        original_code: The original React code
        changes: List of requested changes
        response: The API response object
        request_options: The request options used

    Returns:
        The annotated code if successfully parsed, None otherwise
    """
    request_options = request_options or {}

    print(f"\n{SEPARATOR}")
    print("  STEP 1: CODE ANNOTATION")
    print(SEPARATOR)

    # Print the question/task first for UX context
    print("\n[TASK DESCRIPTION]")
    print(THIN_SEPARATOR)
    print("Annotate React component with comments indicating required changes")
    print("API: https://api.nobelprize.org/v1/prize.json")
    print("Goal: Add inline comments showing where modifications are needed")

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
    print("\n[CHANGES TO ANNOTATE]")
    print(THIN_SEPARATOR)
    for i, change in enumerate(changes, 1):
        print(f"  {i}. {change}")

    choice = response.choices[0] if response.choices else None
    annotated_code = None

    # Print parsed annotation info
    if choice and choice.message.parsed:
        parsed = choice.message.parsed

        print("\n[ANNOTATION SUMMARY]")
        print(THIN_SEPARATOR)
        summary = {
            "totalAnnotations": parsed.get("totalAnnotations"),
            "annotationTypes": parsed.get("annotationTypes"),
            "sectionsModified": parsed.get("sectionsModified"),
        }
        print(json.dumps(summary, indent=2))

        print("\n[ANNOTATED CODE]")
        print(THIN_SEPARATOR)
        if parsed.get("annotatedCode"):
            annotated_code = parsed["annotatedCode"]
            print(annotated_code)

        if parsed.get("annotationLegend"):
            print("\n[ANNOTATION LEGEND]")
            print(THIN_SEPARATOR)
            for item in parsed["annotationLegend"]:
                print(f"  {item.get('marker', '?')}: {item.get('description', 'N/A')}")

    # Print parse error if any
    if choice and choice.message.parse_error:
        print("\n[PARSE ERROR]")
        print(THIN_SEPARATOR)
        print(choice.message.parse_error)
        print("\n[RAW CONTENT]")
        print(THIN_SEPARATOR)
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

    return annotated_code


def format_modification_output(
    annotated_code: str,
    changes: list[str],
    response: ChatCompletionResponse,
    request_options: dict[str, Any] | None = None,
) -> None:
    """
    Formats and prints the modification response.

    Args:
        annotated_code: The annotated React code
        changes: List of requested changes
        response: The API response object
        request_options: The request options used
    """
    request_options = request_options or {}

    print(f"\n{SEPARATOR}")
    print("  STEP 2: CODE MODIFICATION (FROM ANNOTATIONS)")
    print(SEPARATOR)

    # Print the question/task first for UX context
    print("\n[TASK DESCRIPTION]")
    print(THIN_SEPARATOR)
    print("Generate modified React component based on annotations")
    print("API: https://api.nobelprize.org/v1/prize.json")
    print("Goal: Implement all annotated changes with proper React hooks")

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

        if parsed.get("stateInstructions"):
            print("\n[STATE INSTRUCTIONS]")
            print(THIN_SEPARATOR)
            print(parsed["stateInstructions"])

        if parsed.get("apiIntegration"):
            print("\n[API INTEGRATION DETAILS]")
            print(THIN_SEPARATOR)
            print(json.dumps(parsed["apiIntegration"], indent=2))

        if parsed.get("annotationsResolved"):
            print("\n[ANNOTATIONS RESOLVED]")
            print(THIN_SEPARATOR)
            for item in parsed["annotationsResolved"]:
                status = "DONE" if item.get("resolved") else "PENDING"
                print(f"  [{status}] {item.get('annotation', 'N/A')}")

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

def define_annotation_schema(
    component_name: str,
    changes: list[str],
    api_endpoint: str,
) -> dict[str, Any]:
    """
    Defines a schema for annotating React component with change comments.

    Args:
        component_name: Name of the component being annotated
        changes: List of changes to annotate
        api_endpoint: The API endpoint to integrate

    Returns:
        Schema definition with system prompt
    """
    changes_text = "\n".join(f"  {i}. {change}" for i, change in enumerate(changes, 1))

    system_prompt = f"""You are a code annotator specializing in React components. Your task is to add inline comments to the original code that indicate where changes need to be made.

IMPORTANT: You must return the ORIGINAL code with ADDED comments. Do NOT modify the actual code logic yet.

Changes to annotate:
{changes_text}

API to integrate: {api_endpoint}

Comment Format Guidelines:
- Use // @TODO: for changes that need to be made
- Use // @ADD: for new code that needs to be added
- Use // @REMOVE: for code that should be removed
- Use // @REPLACE: for code that should be replaced
- Use // @HOOK: for React hooks that need to be added
- Use // @STATE: for state variables needed
- Use // @EFFECT: for useEffect hooks needed
- Use // @API: for API integration points

Output Format - Respond with ONLY valid JSON (no markdown, no code blocks, no backticks):
{{
  "componentName": "{component_name}",
  "annotatedCode": "The original code with inline annotation comments added",
  "totalAnnotations": 0,
  "annotationTypes": {{
    "TODO": 0,
    "ADD": 0,
    "REMOVE": 0,
    "REPLACE": 0,
    "HOOK": 0,
    "STATE": 0,
    "EFFECT": 0,
    "API": 0
  }},
  "sectionsModified": ["list of sections that have annotations"],
  "annotationLegend": [
    {{ "marker": "@TODO", "description": "General change needed" }},
    {{ "marker": "@ADD", "description": "New code to add" }},
    {{ "marker": "@REMOVE", "description": "Code to remove" }},
    {{ "marker": "@REPLACE", "description": "Code to replace" }},
    {{ "marker": "@HOOK", "description": "React hook needed" }},
    {{ "marker": "@STATE", "description": "State variable needed" }},
    {{ "marker": "@EFFECT", "description": "useEffect needed" }},
    {{ "marker": "@API", "description": "API integration point" }}
  ]
}}

Important:
- Keep the original code structure intact
- Only ADD comments, do not change the actual code
- Place comments on the line ABOVE the code they reference
- Be specific about what change is needed at each annotation
- Include line-specific context in each annotation"""

    return {
        "name": f"{component_name}Annotator",
        "component_name": component_name,
        "changes": changes,
        "api_endpoint": api_endpoint,
        "system_prompt": system_prompt,
    }


def define_modification_schema(
    component_name: str,
    changes: list[str],
    api_endpoint: str,
    response_field: str,
) -> dict[str, Any]:
    """
    Defines a schema for modifying annotated React component.

    Args:
        component_name: Name of the component being modified
        changes: List of changes to apply
        api_endpoint: The API endpoint to integrate
        response_field: The field to extract from API response

    Returns:
        Schema definition with system prompt
    """
    changes_text = "\n".join(f"  {i}. {change}" for i, change in enumerate(changes, 1))

    system_prompt = f"""You are a React component modifier. You will receive an ANNOTATED React component with inline comments indicating required changes.

Your task:
1. Read and understand ALL annotations (marked with @TODO, @ADD, @REMOVE, @REPLACE, @HOOK, @STATE, @EFFECT, @API)
2. Implement ALL the annotated changes
3. Remove the annotation comments after implementing
4. Add proper React hooks (useState, useEffect) for API integration
5. Handle loading and error states
6. Return the result as a JSON object

API Integration Details:
- Endpoint: {api_endpoint}
- Extract: {response_field}

Original change requests:
{changes_text}

Output Format - Respond with ONLY valid JSON (no markdown, no code blocks, no backticks):
{{
  "componentName": "{component_name}",
  "description": "Brief description of the component and its purpose",
  "changesApplied": [
    "Description of each change that was applied"
  ],
  "modifiedCode": "The complete modified React component code (annotations resolved, no comment markers)",
  "explanation": "Detailed explanation of all modifications made",
  "stateInstructions": "Description of state variables and their purposes",
  "props": {{
    "propName": {{ "type": "string", "description": "prop description" }}
  }},
  "imports": ["list of import statements needed"],
  "apiIntegration": {{
    "endpoint": "{api_endpoint}",
    "method": "GET",
    "dataPath": "response path to data",
    "displayField": "{response_field}"
  }},
  "annotationsResolved": [
    {{ "annotation": "@TODO: description", "resolved": true, "implementation": "how it was resolved" }}
  ]
}}

Important:
- Resolve ALL annotations from the input code
- Use React hooks (useState, useEffect) for state management
- Handle loading state while fetching
- Handle error state if fetch fails
- Display the data in a user-friendly manner
- Remove all annotation comments from the final code
- The modifiedCode should be complete and ready to use"""

    return {
        "name": f"{component_name}Modifier",
        "component_name": component_name,
        "changes": changes,
        "api_endpoint": api_endpoint,
        "response_field": response_field,
        "system_prompt": system_prompt,
    }


# =============================================================================
# API Functions
# =============================================================================

def chat_completion_with_schema(
    client: httpx.Client,
    messages: list[dict[str, str]],
    schema: dict[str, Any],
    model: str = DEFAULT_MODEL,
    temperature: float | None = None,
    max_tokens: int | None = None,
    top_p: float | None = None,
    n: int | None = None,
    stop: str | list[str] | None = None,
    **kwargs: Any,
) -> ChatCompletionResponse:
    """
    Performs a structured chat completion request.

    Args:
        client: httpx Client from create_client()
        messages: Array of {role, content} message objects
        schema: Schema with system_prompt
        model: Model to use
        temperature: Sampling temperature (0-2)
        max_tokens: Maximum tokens to generate
        top_p: Nucleus sampling parameter
        n: Number of completions to generate
        stop: Stop sequence(s)
        **kwargs: Additional parameters passed to the API

    Returns:
        ChatCompletionResponse object with parsed content
    """
    if not messages or not isinstance(messages, list):
        raise ValueError("messages is required and must be a list")

    if not schema:
        raise ValueError("schema is required")

    # Merge system prompts
    messages_with_schema = []
    has_system_message = False

    for msg in messages:
        if msg.get("role") == "system":
            messages_with_schema.append({
                "role": "system",
                "content": f"{schema['system_prompt']}\n\nAdditional instructions: {msg['content']}",
            })
            has_system_message = True
        else:
            messages_with_schema.append(msg)

    if not has_system_message:
        messages_with_schema.insert(0, {"role": "system", "content": schema["system_prompt"]})

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
    """Main execution - demonstrates the two-step annotation and modification approach."""
    log_progress("INIT", "Starting Gemini React Component Annotator & Modifier...")
    log_progress("INIT", "Two-step approach: 1) Annotate code, 2) Generate modifications")

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

    # API integration details
    api_endpoint = "https://api.nobelprize.org/v1/prize.json"
    response_field = "firstname"

    # Requested changes
    changes = [
        "Add service call to https://api.nobelprize.org/v1/prize.json using useEffect",
        "Display firstname of each laureate from response.prizes[].laureates[].firstname",
        "Add loading state while fetching data",
        "Add error handling for failed requests",
        "Replace 'Word of the Day' section with list of Nobel Prize laureate firstnames",
    ]

    log_progress("INPUT", "Preparing annotation request...")
    log_progress("INPUT", "Component: BasicCard")
    log_progress("INPUT", f"API Endpoint: {api_endpoint}")
    log_progress("INPUT", f"Changes requested: {len(changes)}")

    request_options = {
        "model": "gemini-2.0-flash",
        "temperature": 0.2,
        "max_tokens": 4096,
    }

    try:
        # =====================================================================
        # STEP 1: Annotate the original code
        # =====================================================================
        log_progress("STEP1", "Creating annotation schema...")
        annotation_schema = define_annotation_schema(
            component_name="BasicCard",
            changes=changes,
            api_endpoint=api_endpoint,
        )
        log_progress("STEP1", "Annotation schema created")

        annotation_prompt = f"""Please annotate the following React component with inline comments indicating where changes need to be made.

ORIGINAL COMPONENT:
```jsx
{original_code}
```

Add annotation comments (using @TODO, @ADD, @REMOVE, @REPLACE, @HOOK, @STATE, @EFFECT, @API markers) to indicate:
1. Where to add React hooks imports
2. Where to add state variables
3. Where to add useEffect for API call
4. Which sections to modify or replace
5. Where to display the fetched data

Return the original code with annotations added."""

        log_progress("STEP1", "Sending annotation request to Gemini API...")
        annotation_response = chat_completion_with_schema(
            client,
            messages=[
                {"role": "system", "content": "Add clear, specific annotations to guide the modification process."},
                {"role": "user", "content": annotation_prompt},
            ],
            schema=annotation_schema,
            model=request_options["model"],
            temperature=request_options["temperature"],
            max_tokens=request_options["max_tokens"],
        )
        log_progress("STEP1", "Received annotation response from API")

        log_progress("FORMAT", "Formatting annotation output...")
        annotated_code = format_annotation_output(original_code, changes, annotation_response, request_options)

        if not annotated_code:
            log_progress("ERROR", "Failed to get annotated code, using original with manual annotations")
            # Fallback: create basic annotations manually
            annotated_code = f"""// @HOOK: Add useState and useEffect imports here
{original_code.split('export default')[0]}
// @STATE: Add state variables: laureates, loading, error
// @EFFECT: Add useEffect to fetch from {api_endpoint}
// @API: Fetch data and extract firstname from response.prizes[].laureates[]
export default{original_code.split('export default')[1]}"""

        # =====================================================================
        # STEP 2: Generate modified code from annotations
        # =====================================================================
        log_progress("STEP2", "Creating modification schema...")
        modification_schema = define_modification_schema(
            component_name="BasicCard",
            changes=changes,
            api_endpoint=api_endpoint,
            response_field=response_field,
        )
        log_progress("STEP2", "Modification schema created")

        modification_prompt = f"""Please implement all the annotated changes in the following React component.

ANNOTATED COMPONENT (with @TODO, @ADD, @REMOVE, @REPLACE, @HOOK, @STATE, @EFFECT, @API markers):
```jsx
{annotated_code}
```

API DETAILS:
- Endpoint: {api_endpoint}
- Response structure: {{ prizes: [{{ laureates: [{{ firstname: "string", ... }}] }}] }}
- Extract and display: firstname of each laureate

Resolve ALL annotations and return the complete, working modified component."""

        log_progress("STEP2", "Sending modification request to Gemini API...")
        modification_response = chat_completion_with_schema(
            client,
            messages=[
                {"role": "system", "content": "Implement all annotations precisely. Ensure proper React hooks usage."},
                {"role": "user", "content": modification_prompt},
            ],
            schema=modification_schema,
            model=request_options["model"],
            temperature=request_options["temperature"],
            max_tokens=request_options["max_tokens"],
        )
        log_progress("STEP2", "Received modification response from API")

        log_progress("FORMAT", "Formatting modification output...")
        format_modification_output(annotated_code, changes, modification_response, request_options)

        # Print final summary
        print(f"\n{SEPARATOR}")
        print("  FINAL SUMMARY")
        print(SEPARATOR)

        if annotation_response.choices and annotation_response.choices[0].message.parsed:
            parsed_annotation = annotation_response.choices[0].message.parsed
            print("\n[ANNOTATION STATS]")
            print(THIN_SEPARATOR)
            print(f"  Total annotations added: {parsed_annotation.get('totalAnnotations', 'N/A')}")
            if parsed_annotation.get('annotationTypes'):
                for marker, count in parsed_annotation['annotationTypes'].items():
                    if count > 0:
                        print(f"    @{marker}: {count}")

        if modification_response.choices and modification_response.choices[0].message.parsed:
            parsed_mod = modification_response.choices[0].message.parsed
            print("\n[MODIFICATION STATS]")
            print(THIN_SEPARATOR)
            print(f"  Component: {parsed_mod.get('componentName', 'N/A')}")
            changes_applied = parsed_mod.get('changesApplied', [])
            print(f"  Changes applied: {len(changes_applied)}")

            if parsed_mod.get('annotationsResolved'):
                resolved = [a for a in parsed_mod['annotationsResolved'] if a.get('resolved')]
                print(f"  Annotations resolved: {len(resolved)}/{len(parsed_mod['annotationsResolved'])}")

        # Print combined usage
        total_prompt = 0
        total_completion = 0
        if annotation_response.usage:
            total_prompt += annotation_response.usage.prompt_tokens
            total_completion += annotation_response.usage.completion_tokens
        if modification_response.usage:
            total_prompt += modification_response.usage.prompt_tokens
            total_completion += modification_response.usage.completion_tokens

        print("\n[TOTAL USAGE]")
        print(THIN_SEPARATOR)
        print(json.dumps({
            "total_prompt_tokens": total_prompt,
            "total_completion_tokens": total_completion,
            "total_tokens": total_prompt + total_completion,
        }, indent=2))

        print(f"\n{SEPARATOR}\n")

        log_progress("COMPLETE", "Two-step annotation and modification completed successfully")

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
