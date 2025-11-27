# AI SDK Examples - Stream Protocol

Demonstrates AI SDK streaming with Fastify backend and React frontend, showcasing three different streaming approaches from the Vercel AI SDK with support for multiple AI providers (OpenAI, Google Gemini, and Anthropic Claude).

## Features

- **Backend**: Fastify plugin with 6 AI SDK streaming routes
- **Frontend**: React + Vite interface with input format toggle and Tailwind CSS
- **Multi-Provider Support**: OpenAI (GPT-4o), Google (Gemini), Anthropic (Claude)
- **Flexible Configuration**: Environment variables and request headers for provider/model selection
- **Two Input Formats**:
  1. **Messages Array** - Chat-style with conversation history
  2. **Simple Prompt** - One-off text generation
- **Three Streaming Modes**:
  1. **Data Stream Protocol** - Full featured stream with v1 protocol headers
  2. **Text Stream** - Simple text-only streaming
  3. **Custom Data Stream** - Custom data writer with error handling

## Project Structure

```
ai-sdk-examples/
├── src/
│   ├── index.mjs              # Fastify plugin entry point
│   └── stream-protocol.mjs    # Streaming route handlers
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # React chat interface
│   │   ├── main.tsx          # React entry point
│   │   └── index.css         # Tailwind styles
│   ├── vite.config.ts        # Vite configuration
│   └── package.json
├── server.mjs                 # Standalone dev server
├── package.json
└── README.md
```

## Setup

### 1. Install Dependencies

```bash
# Install root and all workspace dependencies
npm install
```

### 2. Configure Environment

**Option A: Using .env file**

```bash
# Copy example env file
cp .env.example .env

# Edit .env and add your API keys
OPENAI_API_KEY=sk-your-openai-key-here
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# Optional: Set default model (defaults to gpt-4o)
APP_AI_INIT_CONFIG_DEFAULT_CHAT_MODEL=gpt-4o
```

**Option B: Using command-line arguments**

```bash
# Pass API key via command-line argument
node server.test.mjs --openai-key=sk-your-key-here

# Short form
node server.test.mjs -k sk-your-key-here

# With additional options
node server.test.mjs --openai-key=sk-xxx --port=3001 --log-level=debug
```

**Option C: Using environment variables**

```bash
# Pass API key via environment variable (OpenAI by default)
OPENAI_API_KEY=sk-your-key-here node server.test.mjs

# Use Gemini instead
APP_AI_INIT_CONFIG_DEFAULT_CHAT_MODEL=gemini-1.5-pro \
GOOGLE_GENERATIVE_AI_API_KEY=your-key node server.test.mjs

# Use Claude
APP_AI_INIT_CONFIG_DEFAULT_CHAT_MODEL=claude-sonnet-4 \
ANTHROPIC_API_KEY=sk-ant-your-key node server.test.mjs
```

Available command-line arguments:
- `--openai-key`, `-k`: OpenAI API key (overrides .env)
- `--port`, `-p`: Server port (default: 3000)
- `--host`, `-h`: Server host (default: 0.0.0.0)
- `--log-level`, `-l`: Log level (default: info)

### 3. Development Mode

**Option A: Standalone Server (Recommended for Testing)**

```bash
# Terminal 1: Run backend server
npm run dev

# Terminal 2: Run frontend dev server
cd frontend && npm run dev

# Open browser: http://localhost:5174
```

**Option B: Integrated with Main Fastify Server**

The plugin can be registered with the main MTA Fastify server:

```javascript
// In fastify-apps/main/server.mjs
import aiSdkExamplesPlugin from '../ai-sdk-examples/src/index.mjs';

await fastify.register(aiSdkExamplesPlugin);
```

## Multi-Provider Support

The application supports three AI providers with automatic model detection:

### Supported Providers

| Provider | Model Prefix | Example Models | API Key Environment Variable |
|----------|-------------|----------------|----------------------------|
| OpenAI | `gpt-*`, `o1-*`, `text-*` | `gpt-4o`, `gpt-4`, `gpt-3.5-turbo` | `OPENAI_API_KEY` |
| Google (Gemini) | `gemini-*` | `gemini-1.5-pro`, `gemini-1.5-flash` | `GOOGLE_GENERATIVE_AI_API_KEY` |
| Anthropic (Claude) | `claude-*` | `claude-sonnet-4`, `claude-3-opus` | `ANTHROPIC_API_KEY` |

### Model Selection Priority

The system resolves which model to use based on this priority order:

1. **Request Header** (`X-AI-Model`) - Highest priority, per-request override
2. **Environment Variable** (`APP_AI_INIT_CONFIG_DEFAULT_CHAT_MODEL`)
3. **Default** (`gpt-4o`) - Fallback if nothing else is specified

### Using Request Headers

You can override the default model for any request by adding the `X-AI-Model` header:

```bash
# Use GPT-4o (OpenAI)
curl -X POST http://localhost:3000/api/ai-sdk-examples/stream-text \
  -H "Content-Type: application/json" \
  -H "X-AI-Model: gpt-4o" \
  -d '{"prompt":"Tell me a joke"}'

# Use Gemini 1.5 Pro (Google)
curl -X POST http://localhost:3000/api/ai-sdk-examples/stream-text \
  -H "Content-Type: application/json" \
  -H "X-AI-Model: gemini-1.5-pro" \
  -d '{"prompt":"Tell me a joke"}'

# Use Claude Sonnet 4 (Anthropic)
curl -X POST http://localhost:3000/api/ai-sdk-examples/stream-text \
  -H "Content-Type: application/json" \
  -H "X-AI-Model: claude-sonnet-4" \
  -d '{"prompt":"Tell me a joke"}'
```

### API Key Validation

- API keys are validated at **request time** (not on startup)
- If the required API key for a provider is missing, the request returns:
  - **Status**: `401 Unauthorized`
  - **Response**: `{ "error": "Missing API key: {ENV_VAR_NAME} environment variable is required for {provider} provider" }`

### Provider Detection

The provider is automatically inferred from the model name:
- Models starting with `gpt-`, `o1-`, or `text-` → OpenAI
- Models starting with `gemini-` → Google
- Models starting with `claude-` → Anthropic

If an unknown model is specified, the system returns an error.

## API Endpoints

The backend provides **6 routes** (3 streaming modes × 2 input formats):

### Messages Array Input Routes

#### POST /api/ai-sdk-examples/stream-protocol

Stream AI responses using the Vercel AI SDK data stream protocol with v1 headers.

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "Hello!" }
  ]
}
```

**Response Headers:**
- `X-Vercel-AI-Data-Stream: v1`
- `Content-Type: text/plain; charset=utf-8`

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/ai-sdk-examples/stream-protocol \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Invent a new holiday"}]}'
```

#### POST /api/ai-sdk-examples/stream-text

Simple text-only streaming without protocol headers.

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "Hello!" }
  ]
}
```

**Response Headers:**
- `Content-Type: text/plain; charset=utf-8`

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/ai-sdk-examples/stream-text \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Tell me a joke"}]}'
```

#### POST /api/ai-sdk-examples/stream-custom

Custom data stream with error handling and initialization messages.

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "Hello!" }
  ]
}
```

**Response Headers:**
- `X-Vercel-AI-Data-Stream: v1`
- `Content-Type: text/plain; charset=utf-8`

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/ai-sdk-examples/stream-custom \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Write a haiku"}]}'
```

---

### Simple Prompt Input Routes

#### POST /api/ai-sdk-examples/stream-protocol-prompt

Stream AI responses using data stream protocol with simple prompt string.

**Request:**
```json
{
  "prompt": "Invent a new holiday and describe its traditions"
}
```

**Response Headers:**
- `X-Vercel-AI-Data-Stream: v1`
- `Content-Type: text/plain; charset=utf-8`

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/ai-sdk-examples/stream-protocol-prompt \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Invent a new holiday"}'
```

#### POST /api/ai-sdk-examples/stream-text-prompt

Simple text-only streaming with prompt string.

**Request:**
```json
{
  "prompt": "Tell me a joke"
}
```

**Response Headers:**
- `Content-Type: text/plain; charset=utf-8`

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/ai-sdk-examples/stream-text-prompt \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Tell me a joke about programming"}'
```

#### POST /api/ai-sdk-examples/stream-custom-prompt

Custom data stream with prompt string and custom data writer.

**Request:**
```json
{
  "prompt": "Write a haiku"
}
```

**Response Headers:**
- `X-Vercel-AI-Data-Stream: v1`
- `Content-Type: text/plain; charset=utf-8`

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/ai-sdk-examples/stream-custom-prompt \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Write a haiku about coding"}'
```

## Frontend

The React frontend provides:
- **Input Format Toggle**: Switch between Messages Array (chat) and Simple Prompt modes
- **Stream Mode Selector**: Choose data stream / text stream / custom stream
- **Messages Mode**: Chat interface with conversation history
- **Prompt Mode**: Single-prompt text generation
- Real-time streaming with visual indicators
- Clean, responsive UI with Tailwind CSS

### Frontend Development

```bash
cd frontend

# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Frontend Configuration

The Vite config (`frontend/vite.config.ts`) includes:
- API proxy to backend (`/api` → `http://localhost:3000`)
- Production base path: `/static/app/ai-sdk-examples/frontend/dist/`
- Clean build output without content hashes

## Production Build

```bash
# Build frontend
cd frontend && npm run build

# The built files will be in frontend/dist/
# These can be served as static assets by the main Fastify server
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | - |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google Gemini API key | - |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | - |
| `APP_AI_INIT_CONFIG_DEFAULT_CHAT_MODEL` | Default model to use (e.g., `gpt-4o`, `gemini-1.5-pro`, `claude-sonnet-4`) | `gpt-4o` |
| `PORT` | Server port | 3000 |
| `HOST` | Server host | 0.0.0.0 |
| `LOG_LEVEL` | Logging level | info |
| `VITE_API_URL` | Frontend API proxy URL | http://localhost:3000 |

**Note**: Only the API key for your selected provider is required. For example, if using the default `gpt-4o`, only `OPENAI_API_KEY` is needed.

## Integration with Main Server

To integrate with the main MTA server:

1. **Register the plugin** in `fastify-apps/main/server.mjs`
2. **Add to config** in `fastify-apps/main/mta-prisma.config.json`
3. **Build frontend** and ensure static files are served

Example registration:

```javascript
import aiSdkExamplesPlugin from '../ai-sdk-examples/src/index.mjs';

await fastify.register(aiSdkExamplesPlugin, {
  // Optional configuration
});
```

## Troubleshooting

### Missing API Key Error (401)
```json
{
  "error": "Missing API key: OPENAI_API_KEY environment variable is required for openai provider"
}
```
**Solution:** Set the required API key in your `.env` file based on which provider you're using:
- OpenAI: `OPENAI_API_KEY=sk-your-key-here`
- Google Gemini: `GOOGLE_GENERATIVE_AI_API_KEY=your-key-here`
- Anthropic Claude: `ANTHROPIC_API_KEY=sk-ant-your-key-here`

### Unknown Model Error
```
Error: Unknown model: some-model. Supported prefixes: gpt-, o1-, gemini-, claude-
```
**Solution:** Ensure you're using a valid model name with one of the supported prefixes. Examples:
- OpenAI: `gpt-4o`, `gpt-4`, `gpt-3.5-turbo`
- Gemini: `gemini-1.5-pro`, `gemini-1.5-flash`
- Claude: `claude-sonnet-4`, `claude-3-opus`

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use
```
**Solution:** Change `PORT` in `.env` or kill the process using the port

### Frontend Can't Connect to Backend
**Solution:** Ensure backend is running on the expected port and `VITE_API_URL` is set correctly

## License

UNLICENSED
