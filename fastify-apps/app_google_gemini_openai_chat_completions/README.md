# App Google Gemini OpenAI Chat Completions

Fastify backend application providing Google Gemini chat completion endpoints via OpenAI-compatible API.

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

The API will be available at `http://localhost:3000`

## Project Structure

```
app_google_gemini_openai_chat_completions/
├── src/
│   └── index.mjs          # Fastify plugin with routes
├── frontend/              # Frontend application (if created)
├── server.test.mjs        # Test file
├── package.json           # Dependencies
└── project.json           # Nx project configuration
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/apps/google-gemini-openai-chat-completions/health` | Health check |
| `POST` | `/api/apps/google-gemini-openai-chat-completions/chat` | Chat completion |
| `POST` | `/api/apps/google-gemini-openai-chat-completions/chat/structured` | Structured JSON response |

## Configuration

Environment variables (from system, not .env file):

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | `` | Google Gemini API key (required) |
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment |

### Proxy Configuration

This app uses `@internal/fetch-proxy-dispatcher` for environment-aware proxy configuration when making requests to the Gemini API.

#### Option 1: Server Entry Point (Recommended)

Configure proxy settings directly in `fastify-apps/main/launch.mjs` for centralized management:

```javascript
// fastify-apps/main/launch.mjs

const PROXY_CONFIG = {
  // Explicit proxy URLs per environment
  proxyUrls: {
    DEV: null,  // No proxy in dev
    STAGE: null,
    QA: null,
    PROD: "http://proxy.company.com:8080",  // Production proxy
  },
  // Agent proxy override (optional)
  agentProxy: {
    httpProxy: null,
    httpsProxy: null,
  },
};

// SSL certificate paths (optional)
const PROXY_CERT = "/path/to/client.crt";  // Client certificate
const PROXY_CA_BUNDLE = "/path/to/ca-bundle.crt";  // CA bundle
```

#### Option 2: Environment Variables (Fallback)

If no explicit config is set in `launch.mjs`, environment variables are used as fallback:

```bash
# Set proxy via environment variables
export APP_ENV=PROD
export PROXY_PROD_URL=http://proxy.company.com:8080

# Or use agent proxy
export HTTPS_PROXY=http://agent-proxy.company.com:8080

# Run the application
npm run dev
```

#### Environment Variables Reference

| Variable | Description |
|----------|-------------|
| `APP_ENV` | Environment detection: `DEV`, `STAGE`, `QA`, `PROD` |
| `PROXY_DEV_URL` | Proxy URL for DEV environment |
| `PROXY_STAGE_URL` | Proxy URL for STAGE environment |
| `PROXY_QA_URL` | Proxy URL for QA environment |
| `PROXY_PROD_URL` | Proxy URL for PROD environment |
| `HTTP_PROXY` | Agent proxy override |
| `HTTPS_PROXY` | Agent proxy override (higher priority) |

#### Proxy Resolution Priority

1. **Explicit config** in `launch.mjs` (highest priority)
2. **Agent proxy** (`HTTPS_PROXY` > `HTTP_PROXY`)
3. **Environment-specific proxy** (`PROXY_{APP_ENV}_URL`)
4. **No proxy** - direct connection

#### TLS Verification

- **DEV**: TLS verification disabled by default (for self-signed certs)
- **STAGE/QA/PROD**: TLS verification enabled (unless ca_bundle is set)

## Usage Examples

### Basic Chat Completion

```bash
curl -X POST http://localhost:3000/api/apps/google-gemini-openai-chat-completions/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ]
  }'
```

### Structured Output

```bash
curl -X POST http://localhost:3000/api/apps/google-gemini-openai-chat-completions/chat/structured \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "John is 30 years old and lives in New York"}
    ],
    "schema_name": "person_info",
    "schema_properties": {
      "name": {"type": "string"},
      "age": {"type": "number"},
      "city": {"type": "string"}
    },
    "schema_required": ["name", "age"]
  }'
```

## Development

```bash
# Run tests
npm test

# Build
npm run build
```

## Dependencies

- `@internal/google-gemini-openai-client` - Gemini API client
- `@internal/fetch-proxy-dispatcher` - Environment-aware proxy configuration
- `fastify-plugin` - Fastify plugin wrapper
