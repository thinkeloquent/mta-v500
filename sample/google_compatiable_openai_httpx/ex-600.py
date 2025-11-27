#!/usr/bin/env python3
"""
Gemini OpenAI-Compatible REST API Client - Audio Transcription Example
Single-file implementation using Python 3.11+ httpx

Features:
- Audio transcription support with base64 encoding
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
import base64
import struct
from datetime import datetime
from dataclasses import dataclass
from typing import Any
from pathlib import Path

# Default configuration
DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai"
DEFAULT_MODEL = "gemini-2.0-flash"
DEFAULT_TIMEOUT = 60.0  # 60 seconds
DEFAULT_KEEP_ALIVE_TIMEOUT = 5.0  # 5 seconds
DEFAULT_MAX_CONNECTIONS = 10

# Output formatting
SEPARATOR = "=" * 60
THIN_SEPARATOR = "-" * 60

# Audio format mapping
AUDIO_FORMATS = {
    ".wav": "wav",
    ".mp3": "mp3",
    ".aiff": "aiff",
    ".aac": "aac",
    ".ogg": "ogg",
    ".flac": "flac",
    ".m4a": "m4a",
    ".opus": "opus",
    ".webm": "webm",
}


# =============================================================================
# Data Classes for Response Models
# =============================================================================

@dataclass
class Message:
    """Represents a chat message."""
    role: str
    content: str


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
class AudioMetadata:
    """Represents audio file metadata."""
    file_name: str
    format: str
    size_bytes: int
    base64_length: int


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
    audio_info: dict[str, Any] | None = None,
) -> None:
    """
    Formats and prints the response in a user-friendly way.

    Args:
        question: The original question asked
        response: The API response object
        request_options: The request options used
        audio_info: Optional audio metadata
    """
    request_options = request_options or {}

    print(f"\n{SEPARATOR}")
    print("  GEMINI AUDIO TRANSCRIPTION CHAT COMPLETION")
    print(SEPARATOR)

    # Print the question for context
    print("\n[QUESTION]")
    print(THIN_SEPARATOR)
    print(question)

    # Print audio info if provided
    if audio_info:
        print("\n[AUDIO INFO]")
        print(THIN_SEPARATOR)
        print(json.dumps(audio_info, indent=2))

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

    # Print the response content
    print("\n[RESPONSE]")
    print(THIN_SEPARATOR)
    if response.choices and len(response.choices) > 0:
        print(response.choices[0].message.content)
    else:
        print("(No content in response)")

    # Print finish reason
    if response.choices and response.choices[0].finish_reason:
        print("\n[FINISH REASON]")
        print(THIN_SEPARATOR)
        print(response.choices[0].finish_reason)

    # Print metadata
    print("\n[METADATA]")
    print(THIN_SEPARATOR)
    metadata = {
        "id": response.id or "N/A",
        "model": response.model or "N/A",
        "created": datetime.fromtimestamp(response.created).isoformat()
            if response.created else "N/A",
        "finish_reason": response.choices[0].finish_reason
            if response.choices else "N/A",
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
# Audio Encoding Functions
# =============================================================================

def encode_audio_to_base64(audio_path: str) -> dict[str, Any]:
    """
    Encodes an audio file to base64.

    Args:
        audio_path: Path to the audio file

    Returns:
        Object with base64 data and metadata
    """
    path = Path(audio_path)

    if not path.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    ext = path.suffix.lower()
    audio_format = AUDIO_FORMATS.get(ext)

    if not audio_format:
        supported = ", ".join(AUDIO_FORMATS.keys())
        raise ValueError(f"Unsupported audio format: {ext}. Supported: {supported}")

    audio_bytes = path.read_bytes()
    base64_data = base64.b64encode(audio_bytes).decode("utf-8")

    return {
        "data": base64_data,
        "format": audio_format,
        "file_name": path.name,
        "size_bytes": len(audio_bytes),
        "base64_length": len(base64_data),
    }


def create_audio_content(audio_source: str) -> dict[str, Any]:
    """
    Creates an audio content part for the message.

    Args:
        audio_source: File path to audio

    Returns:
        Input audio content part
    """
    encoded = encode_audio_to_base64(audio_source)
    return {
        "type": "input_audio",
        "input_audio": {
            "data": encoded["data"],
            "format": encoded["format"],
        },
        "_metadata": {
            "file_name": encoded["file_name"],
            "format": encoded["format"],
            "size_bytes": encoded["size_bytes"],
        },
    }


def create_text_content(text: str) -> dict[str, Any]:
    """
    Creates a text content part for the message.

    Args:
        text: The text content

    Returns:
        Text content part
    """
    return {
        "type": "text",
        "text": text,
    }


def create_audio_message(text: str, audio_path: str) -> dict[str, Any]:
    """
    Creates an audio transcription message.

    Args:
        text: The text prompt (e.g., "Transcribe this audio file.")
        audio_path: Path to the audio file

    Returns:
        Message object with content array
    """
    return {
        "role": "user",
        "content": [create_text_content(text), create_audio_content(audio_path)],
    }


def generate_sample_audio() -> dict[str, Any]:
    """
    Generates a sample WAV audio for testing (minimal valid WAV header with silence).

    Returns:
        Base64 audio data
    """
    # Minimal WAV file: 44-byte header + 100ms of silence at 8kHz mono 8-bit
    sample_rate = 8000
    duration = 0.1  # 100ms of silence
    num_samples = int(sample_rate * duration)
    data_size = num_samples
    file_size = 44 + data_size - 8

    buffer = bytearray(44 + data_size)

    # RIFF header
    buffer[0:4] = b"RIFF"
    struct.pack_into("<I", buffer, 4, file_size)
    buffer[8:12] = b"WAVE"

    # fmt chunk
    buffer[12:16] = b"fmt "
    struct.pack_into("<I", buffer, 16, 16)  # chunk size
    struct.pack_into("<H", buffer, 20, 1)   # audio format (PCM)
    struct.pack_into("<H", buffer, 22, 1)   # num channels
    struct.pack_into("<I", buffer, 24, sample_rate)  # sample rate
    struct.pack_into("<I", buffer, 28, sample_rate)  # byte rate
    struct.pack_into("<H", buffer, 32, 1)   # block align
    struct.pack_into("<H", buffer, 34, 8)   # bits per sample

    # data chunk
    buffer[36:40] = b"data"
    struct.pack_into("<I", buffer, 40, data_size)

    # Silence (128 is silence for 8-bit PCM)
    for i in range(num_samples):
        buffer[44 + i] = 128

    return {
        "data": base64.b64encode(bytes(buffer)).decode("utf-8"),
        "format": "wav",
        "file_name": "sample-silence.wav",
        "description": "100ms silence WAV for testing",
        "size_bytes": len(buffer),
    }


# =============================================================================
# API Functions
# =============================================================================

def chat_completion(
    client: httpx.Client,
    messages: list[dict[str, Any]],
    model: str = DEFAULT_MODEL,
    temperature: float | None = None,
    max_tokens: int | None = None,
    top_p: float | None = None,
    n: int | None = None,
    stop: str | list[str] | None = None,
    **kwargs: Any,
) -> ChatCompletionResponse:
    """
    Performs a chat completion request with audio support.

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

    # Build request body - strip _metadata from content parts
    cleaned_messages = []
    for msg in messages:
        if isinstance(msg.get("content"), list):
            cleaned_content = []
            for part in msg["content"]:
                clean_part = {k: v for k, v in part.items() if k != "_metadata"}
                cleaned_content.append(clean_part)
            cleaned_messages.append({**msg, "content": cleaned_content})
        else:
            cleaned_messages.append(msg)

    body: dict[str, Any] = {
        "model": model,
        "messages": cleaned_messages,
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

    # Execute request
    response = client.post("/chat/completions", json=body)
    response.raise_for_status()

    data = response.json()

    # Parse response into dataclasses
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


# =============================================================================
# Main Execution
# =============================================================================

def main() -> None:
    """Main execution - demonstrates audio transcription API with sample question."""
    log_progress("INIT", "Starting Gemini Audio Transcription API Client...")

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

    request_options = {
        "model": "gemini-2.0-flash",
        # "temperature": 0.7,
        # "max_tokens": 1000,
    }

    log_progress("REQUEST", "Preparing request...")
    log_progress("REQUEST", f"Model: {request_options['model']}")

    try:
        # Execute text-only request first
        log_progress("API", "Sending text request to Gemini API...")
        response = chat_completion(
            client,
            messages=[{"role": "user", "content": question}],
            model=request_options["model"],
            # temperature=0.7,
            # max_tokens=1000,
        )
        log_progress("API", "Received response from API")

        format_output(question, response, request_options)

        # Demonstrate audio transcription capability
        log_progress("AUDIO", "Demonstrating audio transcription capability...")

        # Generate a sample WAV audio for testing
        sample_audio = generate_sample_audio()
        log_progress("AUDIO", f"Generated sample audio: {sample_audio['description']}")

        audio_question = "Transcribe this audio file."

        # Create audio message with the sample audio
        audio_message = {
            "role": "user",
            "content": [
                create_text_content(audio_question),
                {
                    "type": "input_audio",
                    "input_audio": {
                        "data": sample_audio["data"],
                        "format": sample_audio["format"],
                    },
                },
            ],
        }

        audio_request_options = {
            "model": "gemini-2.0-flash",
        }

        log_progress("API", "Sending audio transcription request to Gemini API...")
        audio_response = chat_completion(
            client,
            messages=[audio_message],
            model=audio_request_options["model"],
        )
        log_progress("API", "Received audio transcription response from API")

        format_output(
            audio_question,
            audio_response,
            audio_request_options,
            {
                "type": "sample_audio",
                "format": sample_audio["format"],
                "description": sample_audio["description"],
                "size_bytes": sample_audio["size_bytes"],
            },
        )

        log_progress("COMPLETE", "Audio transcription demo completed successfully")

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
