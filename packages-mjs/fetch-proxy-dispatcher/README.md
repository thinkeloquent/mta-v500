# @internal/fetch-proxy-dispatcher

Environment-aware proxy dispatcher for `fetch`/`undici`.

This is a pure ESM module designed to simplify HTTP/HTTPS proxy configuration when using `fetch` (or `undici` directly) in Node.js applications. It automatically selects the appropriate dispatcher (`Agent` or `ProxyAgent`) based on environment variables or explicit configuration, making it seamless to work in different network environments (development, staging, production, or behind a corporate proxy).

## Features

- **Environment-Aware:** Automatically detects `APP_ENV` (`DEV`, `STAGE`, `QA`, `PROD`) and applies the corresponding proxy URL.
- **Corporate Proxy Support:** Obeys standard `HTTP_PROXY` and `HTTPS_PROXY` environment variables.
- **Zero-Configuration simple API:** For most use cases, you can use `getProxyDispatcher()` without any configuration.
- **Advanced Factory API:** For complex scenarios, the `ProxyDispatcherFactory` provides fine-grained control over the configuration.
- **Pre-configured Agents:** Includes pre-configured `undici` agents for common scenarios (`DEV`, `stayAlive`, `doNotStayAlive`).
- **Pure ESM:** Written in TypeScript and distributed as pure ES Modules.

## Installation

This package is internal and not intended for public distribution. It is used within the monorepo.

## Quick Start

The simplest way to use the dispatcher is to import `getProxyDispatcher` and pass it to the `dispatcher` option of `fetch`.

### Simple API: `getProxyDispatcher`

This function automatically determines the correct dispatcher based on environment variables.

**Logic:**
1. If `HTTPS_PROXY` or `HTTP_PROXY` is set, a `ProxyAgent` is used with that URL.
2. If `PROXY_<APP_ENV>_URL` is set (e.g., `PROXY_DEV_URL`), a `ProxyAgent` is used.
3. If `APP_ENV` is `DEV` and no proxy is set, a special `DevAgent` is used which **disables TLS certificate validation**.
4. If the `stayAlive` option is `true` and no proxy is set, a `StayAliveAgent` is used.
5. Otherwise, `undefined` is returned, and `fetch` uses its default behavior.

**Example:**

```typescript
import { fetch } from 'undici';
import { getProxyDispatcher } from '@internal/fetch-proxy-dispatcher';

async function fetchData(url) {
  const response = await fetch(url, {
    // Automatically selects the right dispatcher
    dispatcher: getProxyDispatcher(),
  });
  return response.json();
}
```

### Environment Variables

The simple API is configured through these environment variables:

- `APP_ENV`: Sets the application environment. Can be `DEV`, `STAGE`, `QA`, or `PROD`. Defaults to `DEV`.
- `PROXY_DEV_URL`: Proxy URL for the `DEV` environment.
- `PROXY_STAGE_URL`: Proxy URL for the `STAGE` environment.
- `PROXY_QA_URL`: Proxy URL for the `QA` environment.
- `PROXY_PROD_URL`: Proxy URL for the `PROD` environment.
- `HTTP_PROXY` / `HTTPS_PROXY`: Standard agent proxy URLs. `HTTPS_PROXY` takes precedence.

## Advanced Usage

### Factory API: `ProxyDispatcherFactory`

For more control, you can use the `ProxyDispatcherFactory`. This is useful for dependency injection, testing, or when you need to manage configuration explicitly instead of relying on environment variables.

**Example:**

```typescript
import { fetch } from 'undici';
import { ProxyDispatcherFactory } from '@internal/fetch-proxy-dispatcher';

// Create a factory with explicit configuration
const factory = new ProxyDispatcherFactory({
  proxyUrls: {
    PROD: 'http://proxy.my-company.com:8080',
    QA: 'http://qa-proxy.my-company.com:8080',
  },
  defaultEnvironment: 'PROD',
});

async function fetchData(url) {
  const response = await fetch(url, {
    // Get a dispatcher configured by the factory
    dispatcher: factory.getProxyDispatcher(),
  });
  return response.json();
}

// You can also get a dispatcher for a specific environment
const qaDispatcher = factory.getDispatcherForEnvironment('QA');
```

## APIs

### `getProxyDispatcher(options)`

- `options.disableTls` (boolean): If `true`, forces TLS certificate validation to be disabled. Defaults to `false`. In a `DEV` environment, TLS is disabled by default.
- `options.stayAlive` (boolean): If `true` and no proxy is configured, a `StayAliveAgent` will be used to keep connections open. Defaults to `false`.

### `ProxyDispatcherFactory(config)`

- `config.proxyUrls` (object): A map of environment names to proxy URLs (e.g., `{ PROD: '...' }`).
- `config.agentProxy` (object): Explicitly set `httpProxy` or `httpsProxy`.
- `config.defaultEnvironment` (string): The default environment to use if `APP_ENV` is not set.

### Agents

You can also use the pre-configured agents directly.

- `createDevAgent()`: Disables TLS validation.
- `createStayAliveAgent()`: Keeps connections alive.
- `createDoNotStayAliveAgent()`: Closes connections immediately.
- `createProxyAgent(proxyUrl, disableTls)`: Creates a proxy agent.

**Example:**

```typescript
import { fetch } from 'undici';
import { createStayAliveAgent } from '@internal/fetch-proxy-dispatcher/agents';

async function fetchData(url) {
  const response = await fetch(url, {
    dispatcher: createStayAliveAgent(),
  });
  return response.json();
}
```

## Building

To build the package from source, run:

```bash
npm run build
```
