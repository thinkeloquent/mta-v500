#!/usr/bin/env python3
"""
Gemini OpenAI-Compatible REST API Client - Streaming Example
Single-file implementation using Python 3.11+ httpx

Features:
- Server-Sent Events (SSE) streaming support
- Proxy support (optional)
- Certificate/CA bundle support (optional)
- Keep-alive with configurable connections
- Custom headers
- Full OpenAI-compatible chat completion parameters
- User-friendly JSON output with metadata

Based on: https://ai.google.dev/gemini-api/docs/openai#rest
"""

import os
import sys
import json
import httpx
from datetime import datetime
from dataclasses import dataclass, field
from typing import Any, Generator

# Default configuration
DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai"
DEFAULT_MODEL = "gemini-2.0-flash"
DEFAULT_TIMEOUT = 60.0  # 60 seconds for streaming
DEFAULT_KEEP_ALIVE_TIMEOUT = 5.0  # 5 seconds
DEFAULT_MAX_CONNECTIONS = 10

# Output formatting
SEPARATOR = "=" * 60
THIN_SEPARATOR = "-" * 60


# =============================================================================
# Data Classes for Response Models
# =============================================================================

@dataclass
class StreamDelta:
    """Represents a delta in streaming response."""
    content: str | None = None
    role: str | None = None


@dataclass
class StreamChoice:
    """Represents a streaming choice."""
    index: int
    delta: StreamDelta
    finish_reason: str | None = None


@dataclass
class Usage:
    """Represents token usage statistics."""
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


@dataclass
class StreamChunk:
    """Represents a streaming chunk."""
    id: str
    model: str
    created: int
    choices: list[StreamChoice]
    usage: Usage | None = None
    done: bool = False


@dataclass
class StreamMetadata:
    """Represents aggregated stream metadata."""
    id: str | None = None
    model: str | None = None
    created: int | None = None
    finish_reason: str | None = None
    usage: Usage | None = None


@dataclass
class StreamResult:
    """Represents the complete streaming result."""
    content: str
    metadata: StreamMetadata
    chunk_count: int


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
    result: StreamResult,
    request_options: dict[str, Any] | None = None,
) -> None:
    """
    Formats and prints streaming response in a user-friendly way.

    Args:
        question: The original question asked
        result: The aggregated result from streaming
        request_options: The request options used
    """
    request_options = request_options or {}

    print(f"\n{SEPARATOR}")
    print("  GEMINI STREAMING CHAT COMPLETION")
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
        "stream": True,
    }
    if "temperature" in request_options:
        params["temperature"] = request_options["temperature"]
    if "max_tokens" in request_options:
        params["max_tokens"] = request_options["max_tokens"]
    if "top_p" in request_options:
        params["top_p"] = request_options["top_p"]
    print(json.dumps(params, indent=2))

    # Print the response content
    print("\n[RESPONSE]")
    print(THIN_SEPARATOR)
    print(result.content)

    # Print metadata
    print("\n[METADATA]")
    print(THIN_SEPARATOR)
    metadata = {
        "id": result.metadata.id or "N/A",
        "model": result.metadata.model or "N/A",
        "created": datetime.fromtimestamp(result.metadata.created).isoformat()
            if result.metadata.created else "N/A",
        "finish_reason": result.metadata.finish_reason or "N/A",
        "total_chunks": result.chunk_count,
    }
    print(json.dumps(metadata, indent=2))

    # Print usage statistics
    if result.metadata.usage:
        print("\n[USAGE]")
        print(THIN_SEPARATOR)
        usage_dict = {
            "prompt_tokens": result.metadata.usage.prompt_tokens,
            "completion_tokens": result.metadata.usage.completion_tokens,
            "total_tokens": result.metadata.usage.total_tokens,
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
    Creates a configured httpx client for streaming.

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
        "Accept": "text/event-stream",
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
# SSE Parsing Functions
# =============================================================================

def parse_sse_line(line: str) -> StreamChunk | None:
    """
    Parses a single SSE data line.

    Args:
        line: Raw SSE line starting with "data: "

    Returns:
        Parsed StreamChunk or None if invalid/done
    """
    if not line.startswith("data:"):
        return None

    data_str = line[5:].strip()

    if data_str == "[DONE]":
        return StreamChunk(
            id="",
            model="",
            created=0,
            choices=[],
            done=True,
        )

    if not data_str:
        return None

    try:
        data = json.loads(data_str)
    except json.JSONDecodeError:
        return None

    # Parse choices
    choices = []
    for choice_data in data.get("choices", []):
        delta_data = choice_data.get("delta", {})
        delta = StreamDelta(
            content=delta_data.get("content"),
            role=delta_data.get("role"),
        )
        choice = StreamChoice(
            index=choice_data.get("index", 0),
            delta=delta,
            finish_reason=choice_data.get("finish_reason"),
        )
        choices.append(choice)

    # Parse usage if present
    usage = None
    if "usage" in data:
        usage_data = data["usage"]
        usage = Usage(
            prompt_tokens=usage_data.get("prompt_tokens", 0),
            completion_tokens=usage_data.get("completion_tokens", 0),
            total_tokens=usage_data.get("total_tokens", 0),
        )

    return StreamChunk(
        id=data.get("id", ""),
        model=data.get("model", ""),
        created=data.get("created", 0),
        choices=choices,
        usage=usage,
    )


# =============================================================================
# API Functions
# =============================================================================

def chat_completion_stream(
    client: httpx.Client,
    messages: list[dict[str, str]],
    model: str = DEFAULT_MODEL,
    temperature: float | None = None,
    max_tokens: int | None = None,
    top_p: float | None = None,
    n: int | None = None,
    stop: str | list[str] | None = None,
    **kwargs: Any,
) -> Generator[StreamChunk, None, None]:
    """
    Performs a streaming chat completion request.

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

    Yields:
        StreamChunk objects
    """
    if not messages or not isinstance(messages, list):
        raise ValueError("messages is required and must be a list")

    # Build request body with stream: true
    body: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "stream": True,
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

    # Execute streaming request
    with client.stream("POST", "/chat/completions", json=body) as response:
        response.raise_for_status()

        for line in response.iter_lines():
            if not line:
                continue

            chunk = parse_sse_line(line)
            if chunk is not None:
                yield chunk
                if chunk.done:
                    return


def chat_completion_stream_collect(
    client: httpx.Client,
    messages: list[dict[str, str]],
    model: str = DEFAULT_MODEL,
    temperature: float | None = None,
    max_tokens: int | None = None,
    top_p: float | None = None,
    n: int | None = None,
    stop: str | list[str] | None = None,
    **kwargs: Any,
) -> StreamResult:
    """
    Collects streamed response and returns aggregated result.

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
        StreamResult with full content and metadata
    """
    full_content = ""
    metadata = StreamMetadata()
    chunk_count = 0

    for chunk in chat_completion_stream(
        client=client,
        messages=messages,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
        top_p=top_p,
        n=n,
        stop=stop,
        **kwargs,
    ):
        if chunk.done:
            break

        chunk_count += 1

        # Extract metadata from first chunk
        if metadata.id is None and chunk.id:
            metadata.id = chunk.id
            metadata.model = chunk.model
            metadata.created = chunk.created

        # Collect content deltas
        if chunk.choices and chunk.choices[0].delta.content:
            full_content += chunk.choices[0].delta.content

        # Capture finish reason
        if chunk.choices and chunk.choices[0].finish_reason:
            metadata.finish_reason = chunk.choices[0].finish_reason

        # Capture usage if present (usually in final chunk)
        if chunk.usage:
            metadata.usage = chunk.usage

    return StreamResult(
        content=full_content,
        metadata=metadata,
        chunk_count=chunk_count,
    )


# =============================================================================
# Main Execution
# =============================================================================

def main() -> None:
    """Main execution - demonstrates the streaming API client."""
    log_progress("INIT", "Starting Gemini Streaming API Client...")

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

    request_options = {
        "model": "gemini-2.0-flash",
        # "temperature": 0.7,
        # "max_tokens": 1000,
        # "top_p": 0.9,
    }

    log_progress("REQUEST", f"Preparing streaming request...")
    log_progress("REQUEST", f"Model: {request_options['model']}")
    log_progress("REQUEST", f'Question: "{question}"')

    try:
        log_progress("STREAM", "Initiating streaming connection...")

        # Stream with real-time output
        print("\n--- Streaming Response ---\n")

        streamed_content = ""
        stream_metadata = StreamMetadata()
        chunk_count = 0

        for chunk in chat_completion_stream(
            client,
            messages=[{"role": "user", "content": question}],
            model=request_options["model"],
            # temperature=0.7,
            # max_tokens=1000,
        ):
            if chunk.done:
                log_progress("STREAM", "Stream completed [DONE]")
                break

            chunk_count += 1

            # Extract metadata from first chunk
            if stream_metadata.id is None and chunk.id:
                stream_metadata.id = chunk.id
                stream_metadata.model = chunk.model
                stream_metadata.created = chunk.created
                log_progress("STREAM", f"Connected - ID: {chunk.id}")

            # Output content as it arrives
            if chunk.choices and chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                streamed_content += content
                sys.stdout.write(content)
                sys.stdout.flush()

            # Capture finish reason
            if chunk.choices and chunk.choices[0].finish_reason:
                stream_metadata.finish_reason = chunk.choices[0].finish_reason

            # Capture usage if present
            if chunk.usage:
                stream_metadata.usage = chunk.usage

        print("\n\n--- End Stream ---\n")

        log_progress("FORMAT", "Formatting output...")

        # Create result for formatted output
        result = StreamResult(
            content=streamed_content,
            metadata=stream_metadata,
            chunk_count=chunk_count,
        )

        format_output(question, result, request_options)

        log_progress("COMPLETE", "Streaming request completed successfully")

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
