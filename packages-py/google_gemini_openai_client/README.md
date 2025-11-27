# google_gemini_openai_client

Google Gemini OpenAI-compatible REST API client for Python. Features proxy support, certificate handling, and structured JSON output.

## Installation

```bash
pip install google_gemini_openai_client
# or
poetry add google_gemini_openai_client
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Your Google Gemini API key |

## Standalone Usage

### Basic Chat Completion

```python
from google_gemini_openai_client import create_client, chat_completion

# Create client (uses GEMINI_API_KEY env by default)
client = create_client()

# Simple chat completion
response = chat_completion(
    client,
    messages=[{"role": "user", "content": "Explain quantum computing in simple terms"}],
    model="gemini-2.0-flash",
    temperature=0.7,
)

print(response.choices[0].message.content)

# Don't forget to close the client
client.close()
```

### With Context Manager

```python
from google_gemini_openai_client import create_client, chat_completion

with create_client() as client:
    response = chat_completion(
        client,
        messages=[{"role": "user", "content": "Hello!"}],
    )
    print(response.choices[0].message.content)
```

### With Proxy and Custom Options

```python
from google_gemini_openai_client import create_client, chat_completion

client = create_client(
    api_key="your-api-key",
    proxy="http://proxy.company.com:8080",
    ca_bundle="/path/to/ca-bundle.crt",
    timeout=60.0,
    max_connections=20,
    custom_headers={
        "X-Custom-Header": "value",
    },
)

response = chat_completion(
    client,
    messages=[{"role": "user", "content": "Hello!"}],
)
```

### Structured JSON Output

```python
from google_gemini_openai_client import (
    create_client,
    chat_completion_structured,
    parse_structured_output,
    create_json_schema,
)

client = create_client()

# Define schema
schema = create_json_schema(
    "person_info",
    {
        "name": {"type": "string", "description": "Full name"},
        "age": {"type": "number", "description": "Age in years"},
        "occupation": {"type": "string", "description": "Job title"},
    },
    required=["name", "age", "occupation"],
)

# Get structured response
response = chat_completion_structured(
    client,
    messages=[
        {"role": "user", "content": "Extract info: John Smith is a 35-year-old software engineer."}
    ],
    schema=schema,
)

# Parse the JSON output
result = parse_structured_output(response)

if result.success:
    print(result.data)  # {'name': 'John Smith', 'age': 35, 'occupation': 'software engineer'}
else:
    print(f"Error: {result.error}")
```

### Async Usage

```python
import asyncio
from google_gemini_openai_client import create_async_client, chat_completion_async

async def main():
    client = await create_async_client()

    async with client:
        response = await chat_completion_async(
            client,
            messages=[{"role": "user", "content": "Hello!"}],
        )
        print(response.choices[0].message.content)

asyncio.run(main())
```

### With fetch_proxy_dispatcher Integration

```python
from fetch_proxy_dispatcher import get_proxy_dispatcher
from google_gemini_openai_client import create_client, chat_completion

# Get pre-configured dispatcher (with corporate proxy, etc.)
dispatcher = get_proxy_dispatcher(async_client=False)

# Create Gemini client using the dispatcher's client
client = create_client(proxy_dispatcher=dispatcher.client)

response = chat_completion(
    client,
    messages=[{"role": "user", "content": "Hello!"}],
)
```

## FastAPI Integration

### Basic Integration

```python
from fastapi import FastAPI, Depends
from google_gemini_openai_client import (
    create_client,
    chat_completion,
    ChatCompletionResponse,
)
import httpx

app = FastAPI()

# Dependency injection
def get_gemini_client() -> httpx.Client:
    return create_client()

@app.post("/api/chat")
async def chat_endpoint(
    messages: list[dict],
    client: httpx.Client = Depends(get_gemini_client)
):
    response = chat_completion(client, messages)
    return {
        "content": response.choices[0].message.content,
        "usage": {
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens,
        } if response.usage else None,
    }

# Cleanup on shutdown
@app.on_event("shutdown")
async def shutdown():
    pass  # Client cleanup handled by FastAPI dependencies
```

### With fetch_proxy_dispatcher

```python
from fastapi import FastAPI, Depends
from fetch_proxy_dispatcher import get_proxy_dispatcher
from google_gemini_openai_client import create_client, chat_completion
import httpx

app = FastAPI()

# Cached client for reuse
_client: httpx.Client | None = None

def get_gemini_client() -> httpx.Client:
    global _client
    if _client is None:
        # Use fetch_proxy_dispatcher for corporate proxy
        dispatcher = get_proxy_dispatcher(async_client=False)
        _client = create_client(proxy_dispatcher=dispatcher.client)
    return _client

@app.post("/api/chat")
async def chat_endpoint(
    messages: list[dict],
    client: httpx.Client = Depends(get_gemini_client)
):
    response = chat_completion(client, messages)
    return {"content": response.choices[0].message.content}

@app.on_event("shutdown")
async def shutdown():
    global _client
    if _client:
        _client.close()
        _client = None
```

### Structured Output Endpoint

```python
from fastapi import FastAPI, Depends
from pydantic import BaseModel
from google_gemini_openai_client import (
    create_client,
    chat_completion_structured,
    parse_structured_output,
    StructuredOutputSchema,
)
import httpx

app = FastAPI()

class ExtractionRequest(BaseModel):
    text: str
    schema_name: str
    properties: dict
    required: list[str]

def get_gemini_client() -> httpx.Client:
    return create_client()

@app.post("/api/extract")
async def extract_endpoint(
    request: ExtractionRequest,
    client: httpx.Client = Depends(get_gemini_client)
):
    schema = StructuredOutputSchema(
        name=request.schema_name,
        schema={
            "type": "object",
            "properties": request.properties,
            "required": request.required,
            "additionalProperties": False,
        },
    )

    response = chat_completion_structured(
        client,
        messages=[{"role": "user", "content": request.text}],
        schema=schema,
    )

    result = parse_structured_output(response)

    if result.success:
        return {"data": result.data}
    return {"error": result.error}
```

## API Reference

### `create_client(**options)`

Creates a configured httpx client.

**Options:**
- `api_key` - API key (defaults to `GEMINI_API_KEY` env)
- `base_url` - Base URL (defaults to Google's OpenAI-compatible endpoint)
- `proxy` - Proxy URL
- `cert` - Path to client certificate or tuple (cert, key)
- `ca_bundle` - Path to CA bundle
- `custom_headers` - Additional headers
- `timeout` - Request timeout in seconds (default: 60.0)
- `max_connections` - Max connections (default: 10)
- `proxy_dispatcher` - Pre-configured httpx client from fetch_proxy_dispatcher

### `chat_completion(client, messages, **options)`

Performs a chat completion request.

**Options:**
- `messages` - List of message dicts `{"role": str, "content": str}`
- `model` - Model name (default: `gemini-2.0-flash`)
- `temperature` - Sampling temperature (0-2)
- `max_tokens` - Maximum tokens to generate
- `top_p` - Nucleus sampling parameter
- `n` - Number of completions
- `stop` - Stop sequence(s)
- `response_format` - Response format for structured output

### `chat_completion_structured(client, messages, schema, **options)`

Chat completion with automatic JSON schema response format.

### `parse_structured_output(response)`

Parses JSON from response content. Returns `StructuredOutputResult`.

### `create_json_schema(name, properties, required=None, description=None)`

Helper to create JSON schemas for structured output.

## Helper Functions

```python
from google_gemini_openai_client import (
    system_message,
    user_message,
    assistant_message,
    extract_content,
    format_output,
    log_progress,
)

# Message helpers
messages = [
    system_message("You are a helpful assistant"),
    user_message("Hello!"),
    assistant_message("Hi there!"),
]

# Extract content from response
content = extract_content(response)

# Format and print response
format_output("What is AI?", response)

# Progress logging
log_progress("API", "Calling Gemini...")
```

## Constants

```python
from google_gemini_openai_client import (
    DEFAULT_BASE_URL,    # 'https://generativelanguage.googleapis.com/v1beta/openai'
    DEFAULT_MODEL,       # 'gemini-2.0-flash'
    DEFAULT_TIMEOUT,     # 60.0
    DEFAULT_MAX_CONNECTIONS,  # 10
)
```

## License

MIT
