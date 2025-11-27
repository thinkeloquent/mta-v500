# App AI SDK Chat

FastAPI backend with React frontend for streaming AI chat using OpenAI-compatible APIs.

## Features

- Streaming AI chat with three different protocols:
  - **Text Stream**: Plain text chunks
  - **Data Stream**: Vercel AI SDK protocol with `X-Vercel-AI-Data-Stream: v1` header
  - **Custom Stream**: Initialization data + text streaming
- Support for multiple AI providers (OpenAI, Google, Anthropic)
- Dual input modes:
  - **Messages**: Full chat history with conversation context
  - **Prompt**: Simple one-off prompts
- React frontend with Tailwind CSS

## Quick Start

```bash
# Install backend dependencies with Poetry
poetry install

# Run development server
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

The API will be available at `http://localhost:8080`

## Frontend Development

```bash
cd frontend
pnpm install
pnpm dev
```

The frontend will be available at `http://localhost:5173` with API proxy to the backend.

## Configuration

Environment variables (from system environment):

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | - | OpenAI API key |
| `GOOGLE_GENERATIVE_AI_API_KEY` | - | Google AI API key |
| `ANTHROPIC_API_KEY` | - | Anthropic API key |
| `APP_AI_INIT_CONFIG_DEFAULT_CHAT_MODEL` | `gpt-4o` | Default model |
| `PORT` | `8080` | API port |
| `HOST` | `0.0.0.0` | API host |
| `ENVIRONMENT` | `development` | Environment |

At least one API key must be configured.

## API Endpoints

### Health Check
- `GET /api/ai-sdk-chat` - Service health check
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed status with provider info

### Chat Endpoints (Messages Input)
- `POST /api/ai-sdk-chat/stream-protocol` - Data stream with Vercel protocol
- `POST /api/ai-sdk-chat/stream-text` - Plain text stream
- `POST /api/ai-sdk-chat/stream-custom` - Custom stream with init data

### Chat Endpoints (Prompt Input)
- `POST /api/ai-sdk-chat/stream-protocol-prompt` - Data stream with Vercel protocol
- `POST /api/ai-sdk-chat/stream-text-prompt` - Plain text stream
- `POST /api/ai-sdk-chat/stream-custom-prompt` - Custom stream with init data

### Request Format

**Messages format:**
```json
{
  "messages": [
    {"role": "user", "content": "Hello"},
    {"role": "assistant", "content": "Hi there!"},
    {"role": "user", "content": "How are you?"}
  ]
}
```

**Prompt format:**
```json
{
  "prompt": "Invent a new holiday and describe its traditions."
}
```

### Custom Model Selection

Use the `X-AI-Model` header to override the default model:
```
X-AI-Model: gemini-1.5-flash
```

## Project Structure

```
app-ai-sdk-chat/
├── app/                    # Application package
│   ├── main.py            # FastAPI entry point
│   ├── config.py          # Configuration (AI providers)
│   ├── exceptions.py      # Custom exceptions
│   ├── middleware/        # Request/response middleware
│   ├── schemas/           # Pydantic validation schemas
│   │   └── chat.py        # Chat request/response models
│   ├── routes/            # API endpoint handlers
│   │   ├── chat.py        # Chat streaming routes
│   │   └── health.py      # Health check routes
│   ├── services/          # Business logic
│   │   ├── ai_provider.py # AI provider abstraction
│   │   └── stream_service.py # Streaming implementations
│   └── utils/             # Helper functions
├── frontend/              # React frontend
│   ├── src/
│   │   ├── App.tsx       # Main chat component
│   │   └── main.tsx      # React entry point
│   └── package.json
├── pyproject.toml         # Poetry dependencies
└── tests/                 # Test files
```

## API Documentation

- Swagger UI: `http://localhost:8080/docs`
- ReDoc: `http://localhost:8080/redoc`

## Supported Models

Provider detection is automatic based on model prefix:
- **OpenAI**: `gpt-*`, `o1-*`, `text-*`
- **Google**: `gemini-*`
- **Anthropic**: `claude-*`
