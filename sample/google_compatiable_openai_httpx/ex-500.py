#!/usr/bin/env python3
"""
Gemini OpenAI-Compatible REST API Client - Image/Vision Example
Single-file implementation using Python 3.11+ httpx

Features:
- Image/Vision support with base64 encoding
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
import base64
import httpx
from datetime import datetime
from dataclasses import dataclass
from pathlib import Path
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

# MIME type mapping for images
MIME_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
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
class ImageMetadata:
    """Represents metadata about an encoded image."""
    url: str
    mime_type: str
    file_name: str
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
    image_info: dict[str, Any] | None = None,
) -> None:
    """
    Formats and prints the response in a user-friendly way.

    Args:
        question: The original question asked
        response: The API response object
        request_options: The request options used
        image_info: Optional image metadata
    """
    request_options = request_options or {}

    print(f"\n{SEPARATOR}")
    print("  GEMINI VISION CHAT COMPLETION")
    print(SEPARATOR)

    # Print the question for context
    print("\n[QUESTION]")
    print(THIN_SEPARATOR)
    print(question)

    # Print image info if provided
    if image_info:
        print("\n[IMAGE INFO]")
        print(THIN_SEPARATOR)
        print(json.dumps(image_info, indent=2))

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
    choice = response.choices[0] if response.choices else None

    print("\n[RESPONSE]")
    print(THIN_SEPARATOR)
    if choice and choice.message.content:
        print(choice.message.content)
    else:
        print("(No content in response)")

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
# Image Encoding Functions
# =============================================================================

def encode_image_to_base64(image_path: str) -> ImageMetadata:
    """
    Encodes an image file to base64 data URL.

    Args:
        image_path: Path to the image file

    Returns:
        ImageMetadata with base64 URL and metadata
    """
    path = Path(image_path)

    if not path.exists():
        raise FileNotFoundError(f"Image file not found: {image_path}")

    ext = path.suffix.lower()
    mime_type = MIME_TYPES.get(ext)

    if not mime_type:
        supported = ", ".join(MIME_TYPES.keys())
        raise ValueError(f"Unsupported image format: {ext}. Supported: {supported}")

    image_bytes = path.read_bytes()
    base64_data = base64.b64encode(image_bytes).decode("utf-8")
    data_url = f"data:{mime_type};base64,{base64_data}"

    return ImageMetadata(
        url=data_url,
        mime_type=mime_type,
        file_name=path.name,
        size_bytes=len(image_bytes),
        base64_length=len(base64_data),
    )


def create_image_content(image_source: str) -> dict[str, Any]:
    """
    Creates an image content part for the message.

    Args:
        image_source: Either a file path or URL

    Returns:
        Image URL content part
    """
    # Check if it's a URL or file path
    if image_source.startswith("http://") or image_source.startswith("https://"):
        return {
            "type": "image_url",
            "image_url": {"url": image_source},
        }

    # It's a file path - encode to base64
    encoded = encode_image_to_base64(image_source)
    return {
        "type": "image_url",
        "image_url": {"url": encoded.url},
        "_metadata": {
            "fileName": encoded.file_name,
            "mimeType": encoded.mime_type,
            "sizeBytes": encoded.size_bytes,
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


def create_vision_message(
    text: str,
    images: str | list[str],
) -> dict[str, Any]:
    """
    Creates a vision message with text and image(s).

    Args:
        text: The text prompt
        images: Image path(s) or URL(s)

    Returns:
        Message object with content array
    """
    image_list = images if isinstance(images, list) else [images]

    content: list[dict[str, Any]] = [create_text_content(text)]

    for image in image_list:
        content.append(create_image_content(image))

    return {
        "role": "user",
        "content": content,
    }


def generate_sample_image() -> dict[str, Any]:
    """
    Generates a sample base64 image for testing (1x1 red pixel PNG).

    Returns:
        Base64 image data
    """
    # Minimal 1x1 red PNG (base64)
    red_pixel_png = (
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
    )

    return {
        "url": f"data:image/png;base64,{red_pixel_png}",
        "mimeType": "image/png",
        "fileName": "sample-red-pixel.png",
        "description": "1x1 red pixel PNG for testing",
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
    Performs a chat completion request with vision support.

    Args:
        client: httpx Client from create_client()
        messages: Array of message objects
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
                clean_part = {k: v for k, v in part.items() if not k.startswith("_")}
                cleaned_content.append(clean_part)
            cleaned_messages.append({**msg, "content": cleaned_content})
        else:
            cleaned_messages.append(msg)

    body: dict[str, Any] = {
        "model": model,
        "messages": cleaned_messages,
    }

    # Add optional parameters
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
    """Main execution - demonstrates image/vision API with sample question."""
    log_progress("INIT", "Starting Gemini Vision API Client...")

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

    # Sample question
    question = "Explain to me how AI works"

    log_progress("QUESTION", f'Preparing question: "{question}"')

    # Build request options
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
        )
        log_progress("API", "Received response from API")

        format_output(question, response, request_options)

        # Demonstrate image/vision capability
        log_progress("VISION", "Demonstrating image/vision capability...")

        # Generate a sample base64 image for testing
        sample_image = generate_sample_image()
        log_progress("VISION", f"Generated sample image: {sample_image['description']}")

        vision_question = "What is in this image?"

        # Create vision message with the sample image
        vision_message = {
            "role": "user",
            "content": [
                create_text_content(vision_question),
                {
                    "type": "image_url",
                    "image_url": {"url": sample_image["url"]},
                },
            ],
        }

        vision_request_options = {
            "model": "gemini-2.0-flash",
        }

        log_progress("API", "Sending vision request to Gemini API...")
        vision_response = chat_completion(
            client,
            messages=[vision_message],
            model=vision_request_options["model"],
        )
        log_progress("API", "Received vision response from API")

        format_output(
            vision_question,
            vision_response,
            vision_request_options,
            {
                "type": "sample_image",
                "mimeType": sample_image["mimeType"],
                "description": sample_image["description"],
            },
        )

        log_progress("COMPLETE", "Vision demo completed successfully")

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
