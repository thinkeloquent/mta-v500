#!/usr/bin/env python3
"""
Gemini OpenAI-Compatible REST API Client - Liquid Template Code Generation
Single-file implementation using Python 3.11+ httpx

Features:
- RAG context via Markdown with annotations
- Structured JSON output from LLM
- Liquid template rendering for code generation
- Pipeline: Markdown → JSON → Liquid Template → Generated Code
- User can provide custom Liquid templates
- Proxy support (optional)
- Certificate/CA bundle support (optional)
- Keep-alive with configurable connections
- Custom headers
- Full OpenAI-compatible chat completion parameters
- User-friendly JSON output with metadata

Use Case:
- User provides Markdown context with annotations
- LLM generates structured JSON output
- JSON is fed into Liquid template
- Final code is rendered from template

Based on: https://ai.google.dev/gemini-api/docs/openai#rest
Liquid Template: https://shopify.github.io/liquid/
"""

import os
import json
import re
import httpx
from datetime import datetime
from dataclasses import dataclass, field
from typing import Any
from liquid import Template  # pip install python-liquid

# Default configuration
DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai"
DEFAULT_MODEL = "gemini-2.0-flash"
DEFAULT_TIMEOUT = 60.0  # 60 seconds
DEFAULT_MAX_CONNECTIONS = 10

# Output formatting
SEPARATOR = "=" * 70
THIN_SEPARATOR = "-" * 70

# Annotation markers
ANNOTATION_MARKERS = [
    "@TODO",
    "@ADD",
    "@REMOVE",
    "@REPLACE",
    "@HOOK",
    "@STATE",
    "@EFFECT",
    "@API",
    "@USER",
    "@NOTE",
    "@HINT",
    "@TEMPLATE",  # Special marker for template hints
    "@OUTPUT",    # Expected output structure hints
]


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


@dataclass
class TemplateContext:
    """Context for Liquid template rendering."""
    component_name: str
    imports: list[str]
    state_variables: list[dict[str, Any]]
    effects: list[dict[str, Any]]
    jsx_content: str
    props: dict[str, Any]
    api_config: dict[str, Any]
    extra: dict[str, Any] = field(default_factory=dict)


# =============================================================================
# Liquid Template Functions
# =============================================================================

def get_default_react_template() -> str:
    """Returns the default Liquid template for React components."""
    return '''{% comment %}
React Component Template - Liquid Format
Variables: componentName, imports, stateVariables, effects, jsxContent, props, apiConfig
{% endcomment %}
{%- for import in imports -%}
{{ import }}
{%- endfor %}

{% if stateVariables.size > 0 -%}
export default function {{ componentName }}({% if props.size > 0 %}{ {% for prop in props %}{{ prop.name }}{% unless forloop.last %}, {% endunless %}{% endfor %} }{% endif %}) {
  {%- for state in stateVariables %}
  const [{{ state.name }}, {{ state.setter }}] = useState({{ state.initial }});
  {%- endfor %}

  {%- for effect in effects %}
  useEffect(() => {
    {{ effect.body | indent: 4 }}
  }, [{{ effect.deps | join: ", " }}]);
  {%- endfor %}

  {% if apiConfig.hasLoading -%}
  if (loading) {
    return {{ apiConfig.loadingComponent }};
  }
  {%- endif %}

  {% if apiConfig.hasError -%}
  if (error) {
    return {{ apiConfig.errorComponent }};
  }
  {%- endif %}

  return (
{{ jsxContent }}
  );
}
{%- else -%}
export default function {{ componentName }}() {
  return (
{{ jsxContent }}
  );
}
{%- endif %}
'''


def get_react_with_api_template() -> str:
    """Returns a Liquid template for React components with API integration."""
    return '''{% comment %}
React Component with API Integration - Liquid Template
Generated from structured JSON output
{% endcomment %}
{%- for import in imports -%}
{{ import }}
{%- endfor %}

/**
 * {{ componentName }}
 * {{ description }}
 *
 * API: {{ apiConfig.endpoint }}
 * Data Field: {{ apiConfig.displayField }}
 */
export default function {{ componentName }}({% if props.size > 0 %}{ {% for prop in props %}{{ prop.name }}{% if prop.defaultValue %} = {{ prop.defaultValue }}{% endif %}{% unless forloop.last %}, {% endunless %}{% endfor %} }{% endif %}) {
  // State Management
  {%- for state in stateVariables %}
  const [{{ state.name }}, {{ state.setter }}] = useState{% if state.type %}{% endif %}({{ state.initial }});
  {%- endfor %}

  // API Effect
  {%- for effect in effects %}
  useEffect(() => {
    {{ effect.body }}
  }, [{{ effect.deps | join: ", " }}]);
  {%- endfor %}

  // Loading State
  {%- if apiConfig.hasLoading %}
  if (loading) {
    return (
      {{ apiConfig.loadingComponent }}
    );
  }
  {%- endif %}

  // Error State
  {%- if apiConfig.hasError %}
  if (error) {
    return (
      {{ apiConfig.errorComponent }}
    );
  }
  {%- endif %}

  // Main Render
  return (
{{ jsxContent }}
  );
}
'''


def render_liquid_template(template_str: str, context: dict[str, Any]) -> str:
    """
    Renders a Liquid template with the given context.

    Args:
        template_str: The Liquid template string
        context: Dictionary of variables for the template

    Returns:
        Rendered template string
    """
    try:
        template = Template(template_str)
        return template.render(**context)
    except Exception as e:
        return f"// Template rendering error: {e}\n// Context: {json.dumps(context, indent=2)}"


# =============================================================================
# Markdown Parsing Functions
# =============================================================================

def parse_markdown_context(markdown: str) -> dict[str, Any]:
    """
    Parses a Markdown document to extract RAG context.

    Args:
        markdown: The Markdown content

    Returns:
        Dictionary with parsed sections
    """
    sections: dict[str, Any] = {
        "title": "",
        "description": "",
        "code_blocks": [],
        "annotations": [],
        "requirements": [],
        "template_hints": [],
        "output_schema": None,
    }

    lines = markdown.split("\n")
    current_section = None
    current_content: list[str] = []
    in_code_block = False
    code_block_lang = ""
    code_block_content: list[str] = []

    for line in lines:
        # Handle code blocks
        if line.startswith("```"):
            if in_code_block:
                sections["code_blocks"].append({
                    "language": code_block_lang,
                    "content": "\n".join(code_block_content),
                })
                code_block_content = []
                in_code_block = False
            else:
                in_code_block = True
                code_block_lang = line[3:].strip()
            continue

        if in_code_block:
            code_block_content.append(line)
            continue

        # Handle headers
        if line.startswith("# "):
            sections["title"] = line[2:].strip()
        elif line.startswith("## "):
            current_section = line[3:].strip().lower()
            current_content = []
        elif line.startswith("- ") or line.startswith("* "):
            item = line[2:].strip()
            if current_section == "requirements":
                sections["requirements"].append(item)
            elif current_section == "template hints":
                sections["template_hints"].append(item)

        # Extract annotations from inline comments
        for marker in ANNOTATION_MARKERS:
            pattern = rf"(?://|#|<!--)\s*({re.escape(marker)}):\s*(.+?)(?:-->)?$"
            match = re.search(pattern, line)
            if match:
                sections["annotations"].append({
                    "marker": match.group(1),
                    "content": match.group(2).strip(),
                })

    return sections


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


def format_pipeline_output(
    markdown_context: dict[str, Any],
    json_output: dict[str, Any],
    liquid_template: str,
    rendered_code: str,
    response: ChatCompletionResponse,
    request_options: dict[str, Any] | None = None,
    template_name: str = "Default",
    rendered_code_alt: str | None = None,
    alt_template_name: str | None = None,
) -> None:
    """
    Formats and prints the complete pipeline output.

    Args:
        markdown_context: Parsed Markdown context
        json_output: Structured JSON from LLM
        liquid_template: The Liquid template used
        rendered_code: The final rendered code
        response: The API response object
        request_options: The request options used
        template_name: Name of the primary template used
        rendered_code_alt: Alternative template output for comparison
        alt_template_name: Name of the alternative template
    """
    request_options = request_options or {}

    print(f"\n{SEPARATOR}")
    print("  LIQUID TEMPLATE CODE GENERATION PIPELINE")
    print(SEPARATOR)

    # Print the task description
    print("\n[TASK DESCRIPTION]")
    print(THIN_SEPARATOR)
    print("Pipeline: Markdown (RAG) → JSON (LLM) → Liquid Template → Code")
    print(f"Title: {markdown_context.get('title', 'N/A')}")

    # Print Markdown context summary
    print("\n[STEP 1: MARKDOWN CONTEXT (RAG)]")
    print(THIN_SEPARATOR)
    print(f"  Code blocks found: {len(markdown_context.get('code_blocks', []))}")
    print(f"  Annotations found: {len(markdown_context.get('annotations', []))}")
    print(f"  Requirements: {len(markdown_context.get('requirements', []))}")
    if markdown_context.get("annotations"):
        print("\n  Annotations:")
        for ann in markdown_context["annotations"][:5]:  # Show first 5
            print(f"    {ann['marker']}: {ann['content'][:50]}...")

    # Print JSON output from LLM
    print("\n[STEP 2: STRUCTURED JSON OUTPUT (LLM)]")
    print(THIN_SEPARATOR)
    if json_output:
        # Print summary, not full JSON
        print(f"  Component: {json_output.get('componentName', 'N/A')}")
        print(f"  Imports: {len(json_output.get('imports', []))}")
        print(f"  State Variables: {len(json_output.get('stateVariables', []))}")
        print(f"  Effects: {len(json_output.get('effects', []))}")
        if json_output.get("apiConfig"):
            print(f"  API Endpoint: {json_output['apiConfig'].get('endpoint', 'N/A')}")

        print("\n  Full JSON Structure:")
        print(json.dumps(json_output, indent=2))

    # Print Liquid template info
    print("\n[STEP 3: LIQUID TEMPLATE]")
    print(THIN_SEPARATOR)
    print(f"  Selected template: {template_name}")
    template_lines = liquid_template.strip().split("\n")
    print(f"  Template lines: {len(template_lines)}")
    print("\n  Template preview (first 15 lines):")
    for line in template_lines[:15]:
        print(f"    {line}")
    if len(template_lines) > 15:
        print(f"    ... ({len(template_lines) - 15} more lines)")

    # Print rendered code (primary template)
    print(f"\n[STEP 4: RENDERED CODE OUTPUT ({template_name})]")
    print(THIN_SEPARATOR)
    print(rendered_code)

    # Print alternative template output if available
    if rendered_code_alt and alt_template_name:
        print(f"\n[STEP 4b: ALTERNATIVE OUTPUT ({alt_template_name})]")
        print(THIN_SEPARATOR)
        print(rendered_code_alt)

    # Print metadata
    print("\n[METADATA]")
    print(THIN_SEPARATOR)
    choice = response.choices[0] if response.choices else None
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

def define_json_output_schema(
    component_name: str,
    api_endpoint: str,
    response_field: str,
    template_structure: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Defines the schema for structured JSON output that will feed into Liquid template.

    Args:
        component_name: Name of the component
        api_endpoint: API endpoint to integrate
        response_field: Field to extract from API response
        template_structure: Optional custom template structure hints

    Returns:
        Schema definition with system prompt
    """
    system_prompt = f"""You are a React code generator. You will receive a React component and requirements.
Your task is to analyze the code and generate a STRUCTURED JSON output that can be used with a Liquid template.

IMPORTANT: Output ONLY valid JSON. No markdown, no code blocks, no explanation text.

The JSON structure must match this exact format for Liquid template compatibility:

{{
  "componentName": "{component_name}",
  "description": "Brief description of the component",
  "imports": [
    "import {{ useState, useEffect }} from 'react';",
    "import Box from '@mui/material/Box';",
    "...other imports as strings"
  ],
  "stateVariables": [
    {{
      "name": "data",
      "setter": "setData",
      "initial": "[]",
      "type": "array",
      "description": "Stores fetched data"
    }},
    {{
      "name": "loading",
      "setter": "setLoading",
      "initial": "true",
      "type": "boolean",
      "description": "Loading state"
    }},
    {{
      "name": "error",
      "setter": "setError",
      "initial": "null",
      "type": "string|null",
      "description": "Error message"
    }}
  ],
  "effects": [
    {{
      "name": "fetchData",
      "deps": [],
      "body": "const fetchData = async () => {{\\n  try {{\\n    setLoading(true);\\n    const response = await fetch('{api_endpoint}');\\n    const json = await response.json();\\n    // Extract {response_field} from response\\n    setData(json);\\n  }} catch (err) {{\\n    setError(err.message);\\n  }} finally {{\\n    setLoading(false);\\n  }}\\n}};\\nfetchData();",
      "description": "Fetches data from API on mount"
    }}
  ],
  "props": [
    {{
      "name": "maxItems",
      "type": "number",
      "defaultValue": "10",
      "description": "Maximum items to display"
    }}
  ],
  "apiConfig": {{
    "endpoint": "{api_endpoint}",
    "method": "GET",
    "displayField": "{response_field}",
    "dataPath": "prizes[].laureates[]",
    "hasLoading": true,
    "hasError": true,
    "loadingComponent": "<Box sx={{{{ display: 'flex', justifyContent: 'center' }}}}>Loading...</Box>",
    "errorComponent": "<Box sx={{{{ color: 'error.main' }}}}>Error: {{{{error}}}}</Box>"
  }},
  "jsxContent": "    <Card sx={{{{ minWidth: 275 }}}}>\\n      <CardContent>\\n        ... JSX content with proper indentation ...\\n      </CardContent>\\n    </Card>",
  "annotations": [
    {{
      "marker": "@USER",
      "content": "Original user annotation",
      "resolved": true,
      "implementation": "How it was addressed"
    }}
  ]
}}

Key requirements:
1. All string values must be properly escaped for JSON
2. JSX content should be a single string with \\n for newlines
3. Effect body should be a single string with proper escaping
4. Include ALL necessary imports
5. State variables must have name, setter, initial, type, description
6. Effects must have name, deps (array), body (string), description
7. Props are optional but should include defaults if present
8. apiConfig must include loading and error component JSX strings"""

    return {
        "name": f"{component_name}JSONGenerator",
        "component_name": component_name,
        "api_endpoint": api_endpoint,
        "response_field": response_field,
        "template_structure": template_structure,
        "system_prompt": system_prompt,
    }


# =============================================================================
# API Functions
# =============================================================================

def chat_completion_for_json(
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
    Performs a chat completion request expecting JSON output.

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
        ChatCompletionResponse object with parsed JSON
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
    """Main execution - demonstrates the Markdown → JSON → Liquid → Code pipeline."""
    log_progress("INIT", "Starting Liquid Template Code Generation Pipeline...")
    log_progress("INIT", "Pipeline: Markdown (RAG) → JSON (LLM) → Liquid Template → Code")

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

    # ==========================================================================
    # STEP 1: Define Markdown Context (RAG Input)
    # ==========================================================================
    log_progress("MARKDOWN", "Preparing Markdown context (RAG input)...")

    markdown_context = """# React Component Modification Request

## Description
Update the BasicCard component to fetch and display Nobel Prize laureate firstnames.

## Original Code
```jsx
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
// @HINT: Add useState and useEffect imports here

const bull = (
  <Box
    component="span"
    sx={{ display: 'inline-block', mx: '2px', transform: 'scale(0.8)' }}
  >
    •
  </Box>
);

// @USER: Replace word of the day with Nobel Prize laureates
// @NOTE: Keep Card structure, update content
export default function BasicCard() {
  // @HINT: Add state variables here
  // @HINT: Add useEffect for API call here

  return (
    <Card sx={{ minWidth: 275 }}>
      <CardContent>
        {/* @TEMPLATE: This section should show laureate list */}
        <Typography gutterBottom sx={{ color: 'text.secondary', fontSize: 14 }}>
          Word of the Day
        </Typography>
        {/* @OUTPUT: Display loading state here */}
        <Typography variant="h5" component="div">
          be{bull}nev{bull}o{bull}lent
        </Typography>
        {/* @OUTPUT: Map laureates.firstname here */}
        <Typography sx={{ color: 'text.secondary', mb: 1.5 }}>adjective</Typography>
        <Typography variant="body2">
          well meaning and kindly.
          <br />
          {'"a benevolent smile"'}
        </Typography>
      </CardContent>
      <CardActions>
        {/* @USER: Change button text to "View All Prizes" */}
        <Button size="small">Learn More</Button>
      </CardActions>
    </Card>
  );
}
```

## Requirements
- Fetch data from https://api.nobelprize.org/v1/prize.json
- Display firstname of each laureate
- Add loading state
- Add error handling
- Keep MUI Card structure

## Template Hints
- Use useState for: data, loading, error
- Use useEffect for API fetch on mount
- Map over prizes[].laureates[] to get firstnames
- Show loading spinner while fetching
- Show error message if fetch fails

## Expected Output Schema
The JSON output should include:
- componentName: string
- imports: array of import statements
- stateVariables: array of {name, setter, initial, type}
- effects: array of {name, deps, body}
- jsxContent: string with proper JSX
- apiConfig: {endpoint, displayField, hasLoading, hasError}
"""

    # Parse Markdown
    parsed_markdown = parse_markdown_context(markdown_context)
    log_progress("MARKDOWN", f"Parsed: {len(parsed_markdown['code_blocks'])} code blocks, {len(parsed_markdown['annotations'])} annotations")

    # ==========================================================================
    # STEP 2: Get Structured JSON from LLM
    # ==========================================================================
    log_progress("LLM", "Creating JSON output schema...")

    api_endpoint = "https://api.nobelprize.org/v1/prize.json"
    response_field = "firstname"

    json_schema = define_json_output_schema(
        component_name="BasicCard",
        api_endpoint=api_endpoint,
        response_field=response_field,
    )
    log_progress("LLM", "Schema created")

    user_prompt = f"""Analyze this Markdown context and generate structured JSON for a Liquid template.

{markdown_context}

Generate JSON output that follows the exact structure specified in the system prompt.
The JSON will be used to render a React component via Liquid template.

Key requirements:
1. Include all necessary React imports (useState, useEffect, MUI components)
2. Define state variables for: laureates data, loading, error
3. Create useEffect to fetch from {api_endpoint}
4. Extract {response_field} from response.prizes[].laureates[]
5. Generate JSX that maps over the data and displays firstnames
6. Include loading and error states in apiConfig"""

    request_options = {
        "model": "gemini-2.0-flash",
        "temperature": 0.2,
        "max_tokens": 4096,
    }

    log_progress("LLM", "Sending request to Gemini API...")
    response = chat_completion_for_json(
        client,
        messages=[
            {"role": "system", "content": "Generate valid JSON for Liquid template rendering."},
            {"role": "user", "content": user_prompt},
        ],
        schema=json_schema,
        model=request_options["model"],
        temperature=request_options["temperature"],
        max_tokens=request_options["max_tokens"],
    )
    log_progress("LLM", "Received response from API")

    # Extract JSON output
    json_output = None
    if response.choices and response.choices[0].message.parsed:
        json_output = response.choices[0].message.parsed
        log_progress("LLM", f"Successfully parsed JSON for component: {json_output.get('componentName', 'N/A')}")
    else:
        log_progress("ERROR", "Failed to parse JSON from LLM response")
        if response.choices and response.choices[0].message.parse_error:
            log_progress("ERROR", f"Parse error: {response.choices[0].message.parse_error}")

    # ==========================================================================
    # STEP 3: Render with Liquid Templates (Both Default and API)
    # ==========================================================================
    log_progress("LIQUID", "Preparing Liquid templates...")

    # Get both templates
    default_template = get_default_react_template()
    api_template = get_react_with_api_template()

    log_progress("LIQUID", f"Default template loaded ({len(default_template)} characters)")
    log_progress("LIQUID", f"API template loaded ({len(api_template)} characters)")

    # Select template based on whether API integration is needed
    has_api = json_output and json_output.get("apiConfig", {}).get("endpoint")
    liquid_template = api_template if has_api else default_template
    template_name = "API Template" if has_api else "Default Template"
    log_progress("LIQUID", f"Selected: {template_name}")

    rendered_code = ""
    rendered_code_alt = ""  # Alternative template rendering

    if json_output:
        log_progress("LIQUID", "Rendering template with JSON context...")

        # Prepare context for Liquid
        template_context = {
            "componentName": json_output.get("componentName", "Component"),
            "description": json_output.get("description", ""),
            "imports": json_output.get("imports", []),
            "stateVariables": json_output.get("stateVariables", []),
            "effects": json_output.get("effects", []),
            "props": json_output.get("props", []),
            "apiConfig": json_output.get("apiConfig", {}),
            "jsxContent": json_output.get("jsxContent", ""),
        }

        # Render with selected template
        rendered_code = render_liquid_template(liquid_template, template_context)
        log_progress("LIQUID", f"Primary template rendered ({len(rendered_code)} characters)")

        # Also render with alternative template for comparison
        alt_template = default_template if has_api else api_template
        rendered_code_alt = render_liquid_template(alt_template, template_context)
        log_progress("LIQUID", f"Alternative template also rendered for comparison")
    else:
        log_progress("ERROR", "Cannot render template without JSON output")
        rendered_code = "// Error: No JSON output from LLM"

    # ==========================================================================
    # STEP 4: Format and Display Output
    # ==========================================================================
    log_progress("OUTPUT", "Formatting pipeline output...")

    alt_template_name = "Default Template" if has_api else "API Template"
    format_pipeline_output(
        markdown_context=parsed_markdown,
        json_output=json_output or {},
        liquid_template=liquid_template,
        rendered_code=rendered_code,
        response=response,
        request_options=request_options,
        template_name=template_name,
        rendered_code_alt=rendered_code_alt if rendered_code_alt else None,
        alt_template_name=alt_template_name,
    )

    # Print final summary
    print(f"\n{SEPARATOR}")
    print("  PIPELINE SUMMARY")
    print(SEPARATOR)

    print("\n[PIPELINE STAGES]")
    print(THIN_SEPARATOR)
    print("  1. Markdown (RAG)    → Parsed context with annotations")
    print("  2. LLM (Gemini)      → Structured JSON output")
    print("  3. Liquid Template   → Code generation")
    print("  4. Output            → Ready-to-use React component")

    print("\n[STATS]")
    print(THIN_SEPARATOR)
    print(f"  Markdown lines: {len(markdown_context.split(chr(10)))}")
    print(f"  Annotations found: {len(parsed_markdown.get('annotations', []))}")
    print(f"  JSON fields: {len(json_output) if json_output else 0}")
    print(f"  Rendered code lines: {len(rendered_code.split(chr(10)))}")

    if response.usage:
        print(f"\n  API tokens used: {response.usage.total_tokens}")

    print(f"\n{SEPARATOR}\n")

    log_progress("COMPLETE", "Liquid template code generation pipeline completed successfully")

    client.close()


if __name__ == "__main__":
    main()
