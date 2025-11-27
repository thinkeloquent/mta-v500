# @internal/google-gemini-openai-client

Google Gemini OpenAI-compatible REST API client for Node.js. Features proxy support, certificate handling, and structured JSON output.

## Installation

```bash
npm install @internal/google-gemini-openai-client
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Your Google Gemini API key |

## Standalone Usage

### Basic Chat Completion

```typescript
import { createClient, chatCompletion } from '@internal/google-gemini-openai-client';

// Create client (uses GEMINI_API_KEY env by default)
const client = createClient();

// Simple chat completion
const response = await chatCompletion(client, {
  messages: [
    { role: 'user', content: 'Explain quantum computing in simple terms' }
  ],
  model: 'gemini-2.0-flash',
  temperature: 0.7,
});

console.log(response.choices[0].message.content);
```

### With Proxy and Custom Options

```typescript
import { createClient, chatCompletion } from '@internal/google-gemini-openai-client';

const client = createClient({
  apiKey: 'your-api-key',
  proxy: 'http://proxy.company.com:8080',
  caBundle: '/path/to/ca-bundle.crt',
  timeout: 60000,
  maxConnections: 20,
  customHeaders: {
    'X-Custom-Header': 'value',
  },
});

const response = await chatCompletion(client, {
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

### Structured JSON Output

```typescript
import {
  createClient,
  chatCompletionStructured,
  parseStructuredOutput,
  createJsonSchema,
} from '@internal/google-gemini-openai-client';

const client = createClient();

// Define schema
const schema = createJsonSchema('person_info', {
  name: { type: 'string', description: 'Full name' },
  age: { type: 'number', description: 'Age in years' },
  occupation: { type: 'string', description: 'Job title' },
}, ['name', 'age', 'occupation']);

// Get structured response
const response = await chatCompletionStructured(client, {
  messages: [
    { role: 'user', content: 'Extract info: John Smith is a 35-year-old software engineer.' }
  ],
}, schema);

// Parse the JSON output
const result = parseStructuredOutput<{ name: string; age: number; occupation: string }>(response);

if (result.success) {
  console.log(result.data); // { name: 'John Smith', age: 35, occupation: 'software engineer' }
}
```

### Using External Dispatcher

```typescript
import { createClientWithDispatcher, chatCompletion } from '@internal/google-gemini-openai-client';
import { ProxyAgent } from 'undici';

// Create your own dispatcher
const customAgent = new ProxyAgent({
  uri: 'http://proxy:8080',
  keepAliveTimeout: 10000,
});

const client = createClientWithDispatcher({
  apiKey: 'your-api-key',
}, customAgent);

const response = await chatCompletion(client, {
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

## Fastify Integration

### Plugin Registration

```typescript
import Fastify from 'fastify';
import {
  createClient,
  chatCompletion,
  type ClientConfig,
} from '@internal/google-gemini-openai-client';

const fastify = Fastify({ logger: true });

// Decorate fastify with Gemini client
fastify.decorate('geminiClient', createClient());

// Type augmentation for TypeScript
declare module 'fastify' {
  interface FastifyInstance {
    geminiClient: ClientConfig;
  }
}

// Chat endpoint
fastify.post('/api/chat', async (request, reply) => {
  const { messages } = request.body as { messages: Array<{ role: string; content: string }> };

  const response = await chatCompletion(fastify.geminiClient, {
    messages,
    model: 'gemini-2.0-flash',
  });

  return {
    content: response.choices[0].message.content,
    usage: response.usage,
  };
});

// Structured output endpoint
fastify.post('/api/extract', async (request, reply) => {
  const { text, schema } = request.body as {
    text: string;
    schema: { name: string; properties: Record<string, unknown>; required: string[] };
  };

  const response = await chatCompletion(fastify.geminiClient, {
    messages: [{ role: 'user', content: text }],
    responseFormat: {
      type: 'json_schema',
      json_schema: {
        name: schema.name,
        schema: {
          type: 'object',
          properties: schema.properties,
          required: schema.required,
          additionalProperties: false,
        },
        strict: true,
      },
    },
  });

  return JSON.parse(response.choices[0].message.content);
});

// Graceful shutdown
fastify.addHook('onClose', async () => {
  await closeClient(fastify.geminiClient);
});

await fastify.listen({ port: 3000 });
```

### As Fastify Plugin

```typescript
// plugins/gemini.ts
import fp from 'fastify-plugin';
import { createClient, closeClient, type ClientConfig } from '@internal/google-gemini-openai-client';

export default fp(async (fastify, opts) => {
  const client = createClient(opts);

  fastify.decorate('geminiClient', client);

  fastify.addHook('onClose', async () => {
    await closeClient(client);
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    geminiClient: ClientConfig;
  }
}

// app.ts
import Fastify from 'fastify';
import geminiPlugin from './plugins/gemini.js';

const fastify = Fastify();

await fastify.register(geminiPlugin, {
  // Optional: override defaults
  timeout: 60000,
});

// Now use fastify.geminiClient in routes
```

## API Reference

### `createClient(options?)`

Creates a configured client with undici dispatcher.

**Options:**
- `apiKey` - API key (defaults to `GEMINI_API_KEY` env)
- `baseUrl` - Base URL (defaults to Google's OpenAI-compatible endpoint)
- `proxy` - Proxy URL
- `cert` - Path to client certificate
- `caBundle` - Path to CA bundle
- `customHeaders` - Additional headers
- `timeout` - Request timeout in ms (default: 60000)
- `keepAliveTimeout` - Keep-alive timeout in ms (default: 5000)
- `maxConnections` - Max connections (default: 10)

### `chatCompletion(client, options)`

Performs a chat completion request.

**Options:**
- `messages` - Array of message objects `{ role, content }`
- `model` - Model name (default: `gemini-2.0-flash`)
- `temperature` - Sampling temperature (0-2)
- `maxTokens` - Maximum tokens to generate
- `topP` - Nucleus sampling parameter
- `n` - Number of completions
- `stop` - Stop sequence(s)
- `responseFormat` - Response format for structured output

### `chatCompletionStructured(client, options, schema)`

Chat completion with automatic JSON schema response format.

### `parseStructuredOutput<T>(response)`

Parses JSON from response content.

### `createJsonSchema(name, properties, required?, description?)`

Helper to create JSON schemas for structured output.

## Helper Functions

```typescript
import {
  systemMessage,
  userMessage,
  assistantMessage,
  extractContent,
  formatOutput,
  logProgress,
} from '@internal/google-gemini-openai-client';

// Message helpers
const messages = [
  systemMessage('You are a helpful assistant'),
  userMessage('Hello!'),
  assistantMessage('Hi there!'),
];

// Extract content from response
const content = extractContent(response);

// Format and print response
formatOutput('What is AI?', response);

// Progress logging
logProgress('API', 'Calling Gemini...');
```

## Constants

```typescript
import {
  DEFAULT_BASE_URL,    // 'https://generativelanguage.googleapis.com/v1beta/openai'
  DEFAULT_MODEL,       // 'gemini-2.0-flash'
  DEFAULT_TIMEOUT,     // 60000
  DEFAULT_MAX_CONNECTIONS, // 10
} from '@internal/google-gemini-openai-client';
```

## License

MIT
