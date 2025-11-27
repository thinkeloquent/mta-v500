#!/usr/bin/env python3
"""
Gemini OpenAI-Compatible REST API Client - React Component with User Annotations
Single-file implementation using Python 3.11+ httpx

Features:
- User can add their own annotations/comments to original code
- Two-step approach: Enhance annotations, then generate modified version
- Preserves and respects user-provided annotations
- Shows user annotations alongside AI-generated annotations in resolved output
- Structured output for React component modifications
- Template-based input (RAG-style: source code + changes)
- Proxy support (optional)
- Certificate/CA bundle support (optional)
- Keep-alive with configurable connections
- Custom headers
- Full OpenAI-compatible chat completion parameters
- User-friendly JSON output with metadata

Use Case:
- User adds their own annotations to guide the modification
- AI enhances with additional annotations
- Both user and AI annotations are tracked and resolved

Based on: https://ai.google.dev/gemini-api/docs/openai#rest
"""

import os
import json
import re
import httpx
from datetime import datetime
from dataclasses import dataclass, field
from typing import Any

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
    "@USER",  # Special marker for user annotations
    "@NOTE",  # User notes/context
    "@HINT",  # User hints for AI
]


# =============================================================================
# Data Classes for Response Models
# =============================================================================

@dataclass
class Annotation:
    """Represents a single annotation in the code."""
    marker: str
    content: str
    line_number: int | None = None
    source: str = "ai"  # "user" or "ai"
    resolved: bool = False
    implementation: str | None = None


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
# Annotation Parsing Functions
# =============================================================================

def extract_annotations(code: str) -> tuple[list[Annotation], dict[str, int]]:
    """
    Extracts annotations from code and counts by type.

    Args:
        code: Source code with annotations

    Returns:
        Tuple of (list of Annotation objects, dict of counts by marker)
    """
    annotations = []
    counts: dict[str, int] = {marker.lstrip("@"): 0 for marker in ANNOTATION_MARKERS}

    lines = code.split("\n")
    for i, line in enumerate(lines, 1):
        for marker in ANNOTATION_MARKERS:
            # Match patterns like // @TODO: description or # @TODO: description
            pattern = rf"(?://|#)\s*({re.escape(marker)}):\s*(.+?)$"
            match = re.search(pattern, line)
            if match:
                marker_found = match.group(1)
                content = match.group(2).strip()
                marker_key = marker_found.lstrip("@")

                # Determine source based on marker
                source = "user" if marker_found in ["@USER", "@NOTE", "@HINT"] else "ai"

                annotations.append(Annotation(
                    marker=marker_found,
                    content=content,
                    line_number=i,
                    source=source,
                ))
                counts[marker_key] = counts.get(marker_key, 0) + 1

    return annotations, counts


def format_annotations_for_display(annotations: list[Annotation]) -> str:
    """Formats annotations for display output."""
    if not annotations:
        return "  No annotations found"

    lines = []
    user_annotations = [a for a in annotations if a.source == "user"]
    ai_annotations = [a for a in annotations if a.source == "ai"]

    if user_annotations:
        lines.append("  [USER ANNOTATIONS]")
        for ann in user_annotations:
            status = "DONE" if ann.resolved else "PENDING"
            line_info = f"L{ann.line_number}" if ann.line_number else "?"
            lines.append(f"    [{status}] {line_info} {ann.marker}: {ann.content}")
            if ann.implementation:
                lines.append(f"           -> {ann.implementation}")

    if ai_annotations:
        if user_annotations:
            lines.append("")
        lines.append("  [AI ANNOTATIONS]")
        for ann in ai_annotations:
            status = "DONE" if ann.resolved else "PENDING"
            line_info = f"L{ann.line_number}" if ann.line_number else "?"
            lines.append(f"    [{status}] {line_info} {ann.marker}: {ann.content}")
            if ann.implementation:
                lines.append(f"           -> {ann.implementation}")

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


def format_annotation_output(
    original_code: str,
    user_annotations: list[Annotation],
    changes: list[str],
    response: ChatCompletionResponse,
    request_options: dict[str, Any] | None = None,
) -> str | None:
    """
    Formats and prints the annotation response.

    Args:
        original_code: The original React code (with user annotations)
        user_annotations: User-provided annotations extracted from code
        changes: List of requested changes
        response: The API response object
        request_options: The request options used

    Returns:
        The annotated code if successfully parsed, None otherwise
    """
    request_options = request_options or {}

    print(f"\n{SEPARATOR}")
    print("  STEP 1: CODE ANNOTATION (WITH USER HINTS)")
    print(SEPARATOR)

    # Print the question/task first for UX context
    print("\n[TASK DESCRIPTION]")
    print(THIN_SEPARATOR)
    print("Enhance React component annotations based on user hints")
    print("API: https://api.nobelprize.org/v1/prize.json")
    print("Goal: Combine user annotations with AI-generated annotations")

    # Print user annotations summary
    if user_annotations:
        print("\n[USER-PROVIDED ANNOTATIONS]")
        print(THIN_SEPARATOR)
        for ann in user_annotations:
            print(f"  L{ann.line_number or '?'} {ann.marker}: {ann.content}")
    else:
        print("\n[USER-PROVIDED ANNOTATIONS]")
        print(THIN_SEPARATOR)
        print("  None provided")

    # Print the original code (truncated for display)
    print("\n[ORIGINAL CODE (WITH USER ANNOTATIONS)]")
    print(THIN_SEPARATOR)
    lines = original_code.strip().split("\n")
    if len(lines) > 20:
        print("\n".join(lines[:15]))
        print(f"  ... ({len(lines) - 15} more lines)")
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
            "userAnnotationsPreserved": parsed.get("userAnnotationsPreserved"),
            "aiAnnotationsAdded": parsed.get("aiAnnotationsAdded"),
            "annotationTypes": parsed.get("annotationTypes"),
        }
        print(json.dumps(summary, indent=2))

        print("\n[ANNOTATED CODE (ENHANCED)]")
        print(THIN_SEPARATOR)
        if parsed.get("annotatedCode"):
            annotated_code = parsed["annotatedCode"]
            print(annotated_code)

        if parsed.get("userAnnotationContext"):
            print("\n[USER ANNOTATION CONTEXT]")
            print(THIN_SEPARATOR)
            for ctx in parsed["userAnnotationContext"]:
                print(f"  {ctx.get('marker', '?')}: {ctx.get('interpretation', 'N/A')}")

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
    print("  STEP 2: CODE MODIFICATION (USER + AI ANNOTATIONS)")
    print(SEPARATOR)

    # Print the question/task first for UX context
    print("\n[TASK DESCRIPTION]")
    print(THIN_SEPARATOR)
    print("Generate modified React component resolving all annotations")
    print("API: https://api.nobelprize.org/v1/prize.json")
    print("Goal: Implement user hints and AI annotations with proper React hooks")

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

        # Print annotations resolved - separated by source
        if parsed.get("annotationsResolved"):
            print("\n[ANNOTATIONS RESOLVED]")
            print(THIN_SEPARATOR)

            user_resolved = [a for a in parsed["annotationsResolved"] if a.get("source") == "user"]
            ai_resolved = [a for a in parsed["annotationsResolved"] if a.get("source") != "user"]

            if user_resolved:
                print("\n  --- USER ANNOTATIONS ---")
                for item in user_resolved:
                    status = "DONE" if item.get("resolved") else "PENDING"
                    print(f"  [{status}] {item.get('annotation', 'N/A')}")
                    if item.get("implementation"):
                        print(f"          -> {item['implementation']}")

            if ai_resolved:
                print("\n  --- AI ANNOTATIONS ---")
                for item in ai_resolved:
                    status = "DONE" if item.get("resolved") else "PENDING"
                    print(f"  [{status}] {item.get('annotation', 'N/A')}")
                    if item.get("implementation"):
                        print(f"          -> {item['implementation']}")

        # Print user hint acknowledgments
        if parsed.get("userHintAcknowledgments"):
            print("\n[USER HINT ACKNOWLEDGMENTS]")
            print(THIN_SEPARATOR)
            for hint in parsed["userHintAcknowledgments"]:
                print(f"  Hint: {hint.get('hint', 'N/A')}")
                print(f"  Action: {hint.get('actionTaken', 'N/A')}")
                print("")

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
    user_annotations: list[Annotation],
) -> dict[str, Any]:
    """
    Defines a schema for annotating React component with change comments.
    Respects and enhances user-provided annotations.

    Args:
        component_name: Name of the component being annotated
        changes: List of changes to annotate
        api_endpoint: The API endpoint to integrate
        user_annotations: User-provided annotations from the code

    Returns:
        Schema definition with system prompt
    """
    changes_text = "\n".join(f"  {i}. {change}" for i, change in enumerate(changes, 1))

    user_annotations_text = ""
    if user_annotations:
        user_annotations_text = "\n\nUser-provided annotations to PRESERVE and RESPECT:\n"
        for ann in user_annotations:
            user_annotations_text += f"  - Line {ann.line_number or '?'}: {ann.marker}: {ann.content}\n"
        user_annotations_text += "\nIMPORTANT: Keep all user annotations (@USER, @NOTE, @HINT) intact. They provide important context."

    system_prompt = f"""You are a code annotator specializing in React components. Your task is to add inline comments to the code that indicate where changes need to be made.

IMPORTANT RULES:
1. PRESERVE all existing user annotations (@USER, @NOTE, @HINT markers)
2. ADD your own annotations (@TODO, @ADD, @REMOVE, @REPLACE, @HOOK, @STATE, @EFFECT, @API)
3. User annotations provide hints - use them to guide your annotations
4. Do NOT modify the actual code logic yet
{user_annotations_text}

Changes to annotate:
{changes_text}

API to integrate: {api_endpoint}

Comment Format Guidelines:
- // @USER: User-provided annotation (PRESERVE these)
- // @NOTE: User notes/context (PRESERVE these)
- // @HINT: User hints for AI (PRESERVE these and follow them)
- // @TODO: for changes that need to be made
- // @ADD: for new code that needs to be added
- // @REMOVE: for code that should be removed
- // @REPLACE: for code that should be replaced
- // @HOOK: for React hooks that need to be added
- // @STATE: for state variables needed
- // @EFFECT: for useEffect hooks needed
- // @API: for API integration points

Output Format - Respond with ONLY valid JSON (no markdown, no code blocks, no backticks):
{{
  "componentName": "{component_name}",
  "annotatedCode": "The code with ALL annotations (user preserved + AI added)",
  "totalAnnotations": 0,
  "userAnnotationsPreserved": 0,
  "aiAnnotationsAdded": 0,
  "annotationTypes": {{
    "USER": 0,
    "NOTE": 0,
    "HINT": 0,
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
  "userAnnotationContext": [
    {{ "marker": "@USER/@NOTE/@HINT", "original": "original text", "interpretation": "how AI interpreted this hint" }}
  ],
  "annotationLegend": [
    {{ "marker": "@USER", "description": "User-provided annotation", "source": "user" }},
    {{ "marker": "@NOTE", "description": "User context note", "source": "user" }},
    {{ "marker": "@HINT", "description": "User hint for AI", "source": "user" }},
    {{ "marker": "@TODO", "description": "General change needed", "source": "ai" }},
    {{ "marker": "@ADD", "description": "New code to add", "source": "ai" }},
    {{ "marker": "@REMOVE", "description": "Code to remove", "source": "ai" }},
    {{ "marker": "@REPLACE", "description": "Code to replace", "source": "ai" }},
    {{ "marker": "@HOOK", "description": "React hook needed", "source": "ai" }},
    {{ "marker": "@STATE", "description": "State variable needed", "source": "ai" }},
    {{ "marker": "@EFFECT", "description": "useEffect needed", "source": "ai" }},
    {{ "marker": "@API", "description": "API integration point", "source": "ai" }}
  ]
}}"""

    return {
        "name": f"{component_name}Annotator",
        "component_name": component_name,
        "changes": changes,
        "api_endpoint": api_endpoint,
        "user_annotations": user_annotations,
        "system_prompt": system_prompt,
    }


def define_modification_schema(
    component_name: str,
    changes: list[str],
    api_endpoint: str,
    response_field: str,
    user_annotations: list[Annotation],
) -> dict[str, Any]:
    """
    Defines a schema for modifying annotated React component.
    Tracks resolution of both user and AI annotations.

    Args:
        component_name: Name of the component being modified
        changes: List of changes to apply
        api_endpoint: The API endpoint to integrate
        response_field: The field to extract from API response
        user_annotations: User-provided annotations from the code

    Returns:
        Schema definition with system prompt
    """
    changes_text = "\n".join(f"  {i}. {change}" for i, change in enumerate(changes, 1))

    user_hints_text = ""
    if user_annotations:
        user_hints_text = "\n\nUser annotations to address (mark as resolved with implementation details):\n"
        for ann in user_annotations:
            user_hints_text += f"  - {ann.marker}: {ann.content}\n"

    system_prompt = f"""You are a React component modifier. You will receive an ANNOTATED React component with:
1. USER annotations (@USER, @NOTE, @HINT) - provided by the developer
2. AI annotations (@TODO, @ADD, @REMOVE, @REPLACE, @HOOK, @STATE, @EFFECT, @API)

Your task:
1. Read and understand ALL annotations from BOTH sources
2. Implement ALL the annotated changes
3. Remove the annotation comments after implementing
4. Add proper React hooks (useState, useEffect) for API integration
5. Handle loading and error states
6. Track which annotations were resolved (both user and AI)
7. Acknowledge user hints and explain how you addressed them
{user_hints_text}

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
  "modifiedCode": "The complete modified React component code (all annotations resolved)",
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
    {{ "annotation": "@MARKER: description", "source": "user|ai", "resolved": true, "implementation": "how it was resolved" }}
  ],
  "userHintAcknowledgments": [
    {{ "hint": "original user hint", "actionTaken": "what was done to address this hint" }}
  ]
}}

Important:
- Resolve ALL annotations from BOTH user and AI
- Clearly indicate which annotations came from user vs AI
- Acknowledge and address all user hints (@HINT markers)
- Use React hooks (useState, useEffect) for state management
- Handle loading state while fetching
- Handle error state if fetch fails
- Remove all annotation comments from the final code
- The modifiedCode should be complete and ready to use"""

    return {
        "name": f"{component_name}Modifier",
        "component_name": component_name,
        "changes": changes,
        "api_endpoint": api_endpoint,
        "response_field": response_field,
        "user_annotations": user_annotations,
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
    """Main execution - demonstrates user annotations enhancement approach."""
    log_progress("INIT", "Starting Gemini React Component Modifier with User Annotations...")
    log_progress("INIT", "Two-step approach: 1) Enhance user annotations, 2) Generate modifications")

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

    # Original React component code WITH USER ANNOTATIONS
    # Users can add their own @USER, @NOTE, @HINT annotations to guide the AI
    original_code = """import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
// @HINT: Add useState and useEffect imports here for API integration

const bull = (
  <Box
    component="span"
    sx={{ display: 'inline-block', mx: '2px', transform: 'scale(0.8)' }}
  >
    •
  </Box>
);

// @USER: This component should display Nobel Prize laureates instead of word of the day
// @NOTE: Keep the Card structure but replace content with laureate firstnames
export default function BasicCard() {
  // @HINT: Add state for laureates, loading, and error here

  // @HINT: Add useEffect to fetch from https://api.nobelprize.org/v1/prize.json

  return (
    <Card sx={{ minWidth: 275 }}>
      <CardContent>
        {/* @USER: Replace this section with Nobel Prize data display */}
        <Typography gutterBottom sx={{ color: 'text.secondary', fontSize: 14 }}>
          Word of the Day
        </Typography>
        {/* @HINT: Show loading spinner or "Loading..." text while fetching */}
        <Typography variant="h5" component="div">
          be{bull}nev{bull}o{bull}lent
        </Typography>
        {/* @NOTE: This typography section can be replaced with a list of firstnames */}
        <Typography sx={{ color: 'text.secondary', mb: 1.5 }}>adjective</Typography>
        <Typography variant="body2">
          well meaning and kindly.
          <br />
          {'"a benevolent smile"'}
        </Typography>
      </CardContent>
      <CardActions>
        {/* @USER: Keep this button but maybe change text to "View All Prizes" */}
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

    # Extract user annotations from the code
    log_progress("PARSE", "Extracting user annotations from code...")
    user_annotations, annotation_counts = extract_annotations(original_code)
    log_progress("PARSE", f"Found {len(user_annotations)} user annotations")

    for ann in user_annotations:
        log_progress("PARSE", f"  L{ann.line_number}: {ann.marker}: {ann.content[:50]}...")

    log_progress("INPUT", "Preparing annotation request...")
    log_progress("INPUT", "Component: BasicCard")
    log_progress("INPUT", f"API Endpoint: {api_endpoint}")
    log_progress("INPUT", f"Changes requested: {len(changes)}")
    log_progress("INPUT", f"User annotations: {len(user_annotations)}")

    request_options = {
        "model": "gemini-2.0-flash",
        "temperature": 0.2,
        "max_tokens": 4096,
    }

    try:
        # =====================================================================
        # STEP 1: Enhance annotations (preserve user, add AI)
        # =====================================================================
        log_progress("STEP1", "Creating annotation schema with user hints...")
        annotation_schema = define_annotation_schema(
            component_name="BasicCard",
            changes=changes,
            api_endpoint=api_endpoint,
            user_annotations=user_annotations,
        )
        log_progress("STEP1", "Annotation schema created")

        annotation_prompt = f"""Please enhance the following React component with additional annotations.

IMPORTANT: The code already contains USER annotations (@USER, @NOTE, @HINT). You MUST:
1. PRESERVE all existing user annotations exactly as they are
2. ADD your own AI annotations (@TODO, @ADD, @REMOVE, @REPLACE, @HOOK, @STATE, @EFFECT, @API)
3. Use the user hints to guide where you place your annotations

ORIGINAL COMPONENT (WITH USER ANNOTATIONS):
```jsx
{original_code}
```

Add AI annotations to complement the user annotations. Return the code with BOTH user and AI annotations."""

        log_progress("STEP1", "Sending annotation request to Gemini API...")
        annotation_response = chat_completion_with_schema(
            client,
            messages=[
                {"role": "system", "content": "Preserve user annotations and add complementary AI annotations."},
                {"role": "user", "content": annotation_prompt},
            ],
            schema=annotation_schema,
            model=request_options["model"],
            temperature=request_options["temperature"],
            max_tokens=request_options["max_tokens"],
        )
        log_progress("STEP1", "Received annotation response from API")

        log_progress("FORMAT", "Formatting annotation output...")
        annotated_code = format_annotation_output(
            original_code, user_annotations, changes, annotation_response, request_options
        )

        if not annotated_code:
            log_progress("WARN", "Failed to get enhanced annotations, using original with user annotations")
            annotated_code = original_code

        # =====================================================================
        # STEP 2: Generate modified code from annotations
        # =====================================================================
        log_progress("STEP2", "Creating modification schema...")
        modification_schema = define_modification_schema(
            component_name="BasicCard",
            changes=changes,
            api_endpoint=api_endpoint,
            response_field=response_field,
            user_annotations=user_annotations,
        )
        log_progress("STEP2", "Modification schema created")

        modification_prompt = f"""Please implement all the annotated changes in the following React component.

The code contains TWO types of annotations:
1. USER annotations (@USER, @NOTE, @HINT) - provided by the developer, pay special attention to these
2. AI annotations (@TODO, @ADD, @REMOVE, @REPLACE, @HOOK, @STATE, @EFFECT, @API)

ANNOTATED COMPONENT:
```jsx
{annotated_code}
```

API DETAILS:
- Endpoint: {api_endpoint}
- Response structure: {{ prizes: [{{ laureates: [{{ firstname: "string", ... }}] }}] }}
- Extract and display: firstname of each laureate

Resolve ALL annotations (both user and AI) and return the complete, working modified component.
Make sure to acknowledge each user hint and explain how you addressed it."""

        log_progress("STEP2", "Sending modification request to Gemini API...")
        modification_response = chat_completion_with_schema(
            client,
            messages=[
                {"role": "system", "content": "Implement all annotations. Pay special attention to user hints."},
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

        # User annotations summary
        print("\n[USER ANNOTATIONS INPUT]")
        print(THIN_SEPARATOR)
        print(f"  Total user annotations provided: {len(user_annotations)}")
        user_by_type: dict[str, int] = {}
        for ann in user_annotations:
            marker = ann.marker.lstrip("@")
            user_by_type[marker] = user_by_type.get(marker, 0) + 1
        for marker, count in user_by_type.items():
            print(f"    @{marker}: {count}")

        if annotation_response.choices and annotation_response.choices[0].message.parsed:
            parsed_annotation = annotation_response.choices[0].message.parsed
            print("\n[ANNOTATION ENHANCEMENT STATS]")
            print(THIN_SEPARATOR)
            print(f"  User annotations preserved: {parsed_annotation.get('userAnnotationsPreserved', 'N/A')}")
            print(f"  AI annotations added: {parsed_annotation.get('aiAnnotationsAdded', 'N/A')}")
            print(f"  Total annotations: {parsed_annotation.get('totalAnnotations', 'N/A')}")

        if modification_response.choices and modification_response.choices[0].message.parsed:
            parsed_mod = modification_response.choices[0].message.parsed
            print("\n[MODIFICATION STATS]")
            print(THIN_SEPARATOR)
            print(f"  Component: {parsed_mod.get('componentName', 'N/A')}")
            changes_applied = parsed_mod.get('changesApplied', [])
            print(f"  Changes applied: {len(changes_applied)}")

            if parsed_mod.get('annotationsResolved'):
                resolved = parsed_mod['annotationsResolved']
                user_resolved = [a for a in resolved if a.get('source') == 'user' and a.get('resolved')]
                ai_resolved = [a for a in resolved if a.get('source') != 'user' and a.get('resolved')]
                print(f"  User annotations resolved: {len(user_resolved)}")
                print(f"  AI annotations resolved: {len(ai_resolved)}")

            if parsed_mod.get('userHintAcknowledgments'):
                print(f"  User hints acknowledged: {len(parsed_mod['userHintAcknowledgments'])}")

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

        log_progress("COMPLETE", "User annotation enhancement and modification completed successfully")

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
