# fetch-proxy-dispatcher

Environment-aware proxy dispatcher for `httpx`.

This package provides utilities for configuring HTTP clients with proxy settings based on environment variables. It supports both synchronous and asynchronous clients via `httpx`.

## Features

- **Environment-Aware:** Automatically detects `APP_ENV` (`DEV`, `STAGE`, `QA`, `PROD`) and applies the corresponding proxy URL.
- **Corporate Proxy Support:** Obeys standard `HTTP_PROXY` and `HTTPS_PROXY` environment variables.
- **Zero-Configuration Simple API:** For most use cases, `get_proxy_dispatcher()` works out-of-the-box.
- **Advanced Factory API:** For complex scenarios, the `ProxyDispatcherFactory` provides fine-grained control over the configuration.
- **Sync and Async Support:** Provides configured clients for both `httpx.Client` and `httpx.AsyncClient`.
- **Adapter-based:** Can be extended to support other HTTP clients (e.g., `requests`, `aiohttp`).

## Installation

```bash
pip install fetch_proxy_dispatcher
```

## Quick Start

The simplest way to use the dispatcher is to import `get_proxy_dispatcher` and use the returned client.

### Simple API: `get_proxy_dispatcher`

This function automatically determines the correct dispatcher based on environment variables.

**Logic:**
1. If `HTTPS_PROXY` or `HTTP_PROXY` is set, a proxy is configured with that URL.
2. If `PROXY_<APP_ENV>_URL` is set (e.g., `PROXY_DEV_URL`), a proxy is configured.
3. SSL verification is **disabled by default** (`verify=False`).
4. Otherwise, a standard client with no proxy is returned.

**Example:**

```python
import asyncio
from fetch_proxy_dispatcher import get_proxy_dispatcher

async def fetch_data(url):
    # Get a configured async client (default)
    result = get_proxy_dispatcher()
    
    async with result.client as client:
        response = await client.get(url)
    
    print(f"Used proxy: {result.config.proxy_url}")
    return response.json()

    return response.json()

# Example: Using a synchronous client
import httpx # Import httpx for Client type hinting if not already imported

def make_sync_post_request():
    result = get_proxy_dispatcher(async_client=False)
    with result.client as client:
        response = client.post("https://api.example.com/sync-data", json={"sync_key": "sync_value"})
        print(f"Synchronous POST response: {response.status_code}")
        return response.json()

# Call the synchronous function
# make_sync_post_request()
```

### Environment Variables

The simple API is configured through these environment variables:

- `APP_ENV`: Sets the application environment. Can be `DEV`, `STAGE`, `QA`, or `PROD`. Defaults to `DEV`.
- `PROXY_DEV_URL`: Proxy URL for the `DEV` environment.
- `PROXY_STAGE_URL`: Proxy URL for the `STAGE` environment.
- `PROXY_QA_URL`: Proxy URL for the `QA` environment.
- `PROXY_PROD_URL`: Proxy URL for the `PROD` environment.
- `HTTP_PROXY` / `HTTPS_PROXY`: Standard corporate proxy URLs. `HTTPS_PROXY` takes precedence.

## Advanced Usage

### Factory API: `ProxyDispatcherFactory`

For more control, you can use the `ProxyDispatcherFactory`. This is useful for dependency injection, testing, or when you need to manage configuration explicitly.

**Example:**

```python
from fetch_proxy_dispatcher import ProxyDispatcherFactory, FactoryConfig, ProxyUrlConfig

# Create a factory with explicit configuration
factory = ProxyDispatcherFactory(
    config=FactoryConfig(
        proxy_urls=ProxyUrlConfig(
            PROD="http://proxy.my-company.com:8080",
            QA="http://qa-proxy.my-company.com:8080",
        ),
        default_environment="PROD",
    )
)

# Get a dispatcher configured by the factory
result = factory.get_proxy_dispatcher()

# You can also get a dispatcher for a specific environment
qa_result = factory.get_dispatcher_for_environment("QA")
# Note: You use `qa_result.client` (the httpx client), not `qa_result` directly.

async with qa_result.client as client:
    response = await client.post("https://api.qa.example.com/data", json={"key": "value"})
    print(f"QA environment POST response: {response.status_code}")

# Example: Using a synchronous client from the factory for a specific environment
def make_sync_qa_post_request():
    # Get a dispatcher for the QA environment, explicitly requesting a synchronous client
    qa_sync_result = factory.get_dispatcher_for_environment("QA", async_client=False)
    with qa_sync_result.client as client:
        response = client.post("https://api.qa.example.com/sync-data", json={"sync_key": "sync_value"})
        print(f"Synchronous QA POST response: {response.status_code}")
        return response.json()

# Call the synchronous function
# make_sync_qa_post_request()

```

# Custom Client Configuration

If you need to create your own `httpx` client with custom settings (http2, limits, event hooks, etc.), use `get_proxy_config()` to get the proxy/SSL kwargs.

**Note:** Unlike `get_request_kwargs()` (for top-level functions), `get_proxy_config()` supports the `cert` parameter because `httpx.Client` accepts it.

**Example: Custom client with HTTP/2 and connection limits**

```python
import httpx
from fetch_proxy_dispatcher import get_proxy_config

# Get proxy config with client certificate for proxy auth
proxy_kwargs = get_proxy_config(cert="/path/to/client.crt")

# Create a custom client with additional options
with httpx.Client(
    **proxy_kwargs,
    http2=True,
    limits=httpx.Limits(max_connections=100, max_keepalive_connections=20),
) as client:
    response = client.post("https://api.example.com/data", json={"key": "value"})
    print(response.status_code)
```

**Example: Factory API with custom client**

```python
import httpx
from fetch_proxy_dispatcher import ProxyDispatcherFactory, FactoryConfig, ProxyUrlConfig

factory = ProxyDispatcherFactory(
    config=FactoryConfig(
        proxy_urls=ProxyUrlConfig(QA="http://proxy.company.com:8080"),
        cert="/path/to/client.crt",  # Default cert for all requests
    )
)

# Get config for custom client creation
proxy_kwargs = factory.get_proxy_config("QA")

# Create custom client with your own options
with httpx.Client(**proxy_kwargs, http2=True) as client:
    response = client.post("https://api.qa.example.com/data", json={"key": "value"})
```

**Example: Making a POST request using a client from the factory**

When you obtain a `DispatcherResult` from `get_proxy_dispatcher` or `ProxyDispatcherFactory`, it contains a fully configured `httpx` client. You should use this client directly to make requests.

```python
import httpx
from fetch_proxy_dispatcher import ProxyDispatcherFactory, FactoryConfig, ProxyUrlConfig

factory = ProxyDispatcherFactory(
    config=FactoryConfig(
        proxy_urls=ProxyUrlConfig(
            PROD="http://proxy.my-company.com:8080",
            QA="http://qa-proxy.my-company.com:8080",
        ),
        default_environment="PROD",
    )
)

# Get a dispatcher configured by the factory
result = factory.get_proxy_dispatcher()

# Use the client directly to make a POST request
async with result.client as client:
    response = await client.post("https://api.example.com/data", json={"key": "value"})
    print(f"POST response using factory client: {response.status_code}")
```

## Development

To set up the development environment:

```bash
poetry install
```

To run tests:

```bash
poetry run pytest
```

---

### Using httpx Top-Level Functions

You can use `get_request_kwargs` to get a dictionary of kwargs suitable for httpx top-level functions (`httpx.get()`, `httpx.post()`, etc.). This is useful when you don't need a persistent client.

**Note:** SSL verification is disabled by default (`verify=False`). Use `ca_bundle` to enable verification with a custom CA certificate.

**Example: Using `get_request_kwargs` with top-level httpx functions**

```python
import httpx
from fetch_proxy_dispatcher import get_request_kwargs

# Simple API - auto-detects proxy from environment, verify=False by default
kwargs = get_request_kwargs()
response = httpx.get("https://api.example.com/data", **kwargs)
print(f"GET response: {response.status_code}")

# With custom timeout
kwargs = get_request_kwargs(timeout=60.0)
response = httpx.post("https://api.example.com/data", json={"key": "value"}, **kwargs)
print(f"POST response: {response.status_code}")

# With CA bundle for SSL verification
kwargs = get_request_kwargs(ca_bundle="/path/to/ca-bundle.crt")
response = httpx.get("https://api.example.com/data", **kwargs)
```

**Example: Factory API with `get_request_kwargs`**

```python
import httpx
from fetch_proxy_dispatcher import ProxyDispatcherFactory, FactoryConfig, ProxyUrlConfig

factory = ProxyDispatcherFactory(
    config=FactoryConfig(
        proxy_urls=ProxyUrlConfig(
            PROD="http://proxy.my-company.com:8080",
            QA="http://qa-proxy.my-company.com:8080",
        ),
        ca_bundle="/path/to/ca-bundle.crt",  # Optional CA bundle
    )
)

# Get kwargs for a specific environment
kwargs = factory.get_request_kwargs("QA")
response = httpx.post("https://api.qa.example.com/sync-data", json={"sync_key": "sync_value"}, **kwargs)
print(f"QA POST response: {response.status_code}")
```

### Client Certificates for Proxy Authentication (407 errors)

**Important:** httpx top-level functions (`httpx.get()`, `httpx.post()`) do NOT support the `cert` parameter. For client certificates, you MUST use the client pattern:

```python
from fetch_proxy_dispatcher import ProxyDispatcherFactory, FactoryConfig, ProxyUrlConfig

# Factory with client certificate for proxy authentication
factory = ProxyDispatcherFactory(
    config=FactoryConfig(
        proxy_urls=ProxyUrlConfig(
            QA="http://proxy.my-company.com:8080",
        ),
        cert="/path/to/client.crt",  # Client cert for proxy auth
        # Or with cert + key: cert=("/path/to/client.crt", "/path/to/client.key")
    )
)

# Must use client pattern for cert to work
result = factory.get_dispatcher_for_environment("QA", async_client=False)
with result.client as client:
    response = client.post("https://api.example.com/data", json={"key": "value"})
    print(f"Response: {response.status_code}")
```

### Client Pattern vs Top-Level Functions

| Feature | Client Pattern | Top-Level Functions |
|---------|---------------|---------------------|
| Connection pooling | Yes | No |
| HTTP/2 support | Yes | No |
| Client certificates (`cert`) | Yes | **No** |
| Multiple requests | Efficient | Creates new connection each time |

```python
import httpx
from fetch_proxy_dispatcher import get_proxy_dispatcher, get_request_kwargs

# Client pattern - required for cert, better for multiple requests
result = get_proxy_dispatcher(async_client=False)
with result.client as client:
    response1 = client.get("https://api.example.com/data1")
    response2 = client.get("https://api.example.com/data2")

# Top-level functions - simpler for one-off requests (no cert support)
kwargs = get_request_kwargs()
response = httpx.get("https://api.example.com/data", **kwargs)
```

### API Reference

#### `get_request_kwargs(timeout=30.0, ca_bundle=None)`

Returns a dict for httpx top-level functions.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `timeout` | `float` | `30.0` | Request timeout in seconds |
| `ca_bundle` | `str` | `None` | CA bundle path (sets `verify` to this path) |

**Returns:** `{"timeout": ..., "trust_env": False, "verify": False, "proxy": "..."}`

#### `factory.get_request_kwargs(environment=None, timeout=30.0, ca_bundle=None)`

Same as above but uses factory configuration for proxy URLs.

