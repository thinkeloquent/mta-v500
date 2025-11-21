/**
 * AI SDK Stream Protocol Routes
 * Demonstrates three different streaming approaches with Vercel AI SDK
 * Supports multiple AI providers: OpenAI, Google (Gemini), and Anthropic (Claude)
 */

import { Readable } from 'node:stream';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createDataStream, streamText } from 'ai';

// Initialize all AI providers using OpenAI-compatible endpoints
const openai = createOpenAICompatible({
  name: 'openai',
  baseURL: 'https://api.openai.com/v1',
  apiKey: process.env.OPENAI_API_KEY,
});

const google = createOpenAICompatible({
  name: 'google',
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const anthropic = createOpenAICompatible({
  name: 'anthropic',
  baseURL: 'https://api.anthropic.com/v1',
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Maps model names to their respective providers
 * @param {string} modelName - The model identifier (e.g., 'gpt-4o', 'gemini-1.5-pro', 'claude-sonnet-4')
 * @returns {{ provider: object, name: string }} Provider instance and normalized model name
 */
function getProviderForModel(modelName) {
  const model = modelName.toLowerCase();

  // OpenAI models: gpt-*, o1-*, etc.
  if (model.startsWith('gpt-') || model.startsWith('o1-') || model.startsWith('text-')) {
    return { provider: openai, name: modelName, providerName: 'openai' };
  }

  // Google/Gemini models: gemini-*, etc.
  if (model.startsWith('gemini-')) {
    return { provider: google, name: modelName, providerName: 'google' };
  }

  // Anthropic models: claude-*, etc.
  if (model.startsWith('claude-')) {
    return { provider: anthropic, name: modelName, providerName: 'anthropic' };
  }

  throw new Error(`Unknown model: ${modelName}. Supported prefixes: gpt-, o1-, gemini-, claude-`);
}

/**
 * Validates that the required API key exists for the selected provider
 * @param {string} providerName - The provider name ('openai', 'google', 'anthropic')
 * @throws {Error} If API key is missing
 */
function validateApiKey(providerName) {
  const keyMap = {
    openai: 'OPENAI_API_KEY',
    google: 'GOOGLE_GENERATIVE_AI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
  };

  const envVarName = keyMap[providerName];
  if (!process.env[envVarName]) {
    throw new Error(
      `Missing API key: ${envVarName} environment variable is required for ${providerName} provider`,
    );
  }
}

/**
 * Resolves the model to use based on priority:
 * 1. X-AI-Model request header
 * 2. APP_AI_INIT_CONFIG_DEFAULT_CHAT_MODEL environment variable
 * 3. Default: gpt-4o
 *
 * @param {object} request - Fastify request object
 * @returns {string} The resolved model name
 */
function resolveModel(request) {
  // Priority 1: Request header
  const headerModel = request.headers['x-ai-model'];
  if (headerModel) {
    return headerModel;
  }

  // Priority 2: Environment variable
  const envModel = process.env.APP_AI_INIT_CONFIG_DEFAULT_CHAT_MODEL;
  if (envModel) {
    return envModel;
  }

  // Priority 3: Default
  return 'gpt-4o';
}

/**
 * Default model resolver - gets the AI model instance for the request
 * Handles model resolution, provider mapping, and API key validation
 *
 * @param {object} request - Fastify request object
 * @returns {object} The AI model instance
 * @throws {Error} If model is unknown or API key is missing
 */
export function defaultGetModelForRequest(request) {
  const modelName = resolveModel(request);
  const { provider, name, providerName } = getProviderForModel(modelName);

  // Validate API key exists for this provider
  validateApiKey(providerName);

  // Use chatModel for OpenAI-compatible providers
  return provider.chatModel(name);
}

/**
 * Route 1: Full Data Stream (toDataStream)
 * Uses X-Vercel-AI-Data-Stream header with v1 protocol
 * @param {function} getModelForRequest - Function to resolve the AI model for a request
 * @returns {function} Fastify route handler
 */
export function createDataStreamHandler(getModelForRequest) {
  return async function handleDataStream(request, reply) {
    try {
      const { messages } = request.body;
      const model = getModelForRequest(request);

      const result = streamText({
        model,
        messages: messages || [
          { role: 'user', content: 'Invent a new holiday and describe its traditions.' },
        ],
      });

      // Mark the response as a v1 data stream
      reply.header('X-Vercel-AI-Data-Stream', 'v1');
      reply.header('Content-Type', 'text/plain; charset=utf-8');

      // Convert Web ReadableStream to Node.js stream for proper Fastify hook handling (CORS, etc.)
      const nodeStream = Readable.fromWeb(result.toDataStream());
      return reply.send(nodeStream);
    } catch (error) {
      if (error.message.includes('Missing API key')) {
        return reply.status(401).send({ error: error.message });
      }
      throw error;
    }
  };
}

/**
 * Route 2: Simple Text Stream
 * Returns only the text content as a stream
 * @param {function} getModelForRequest - Function to resolve the AI model for a request
 * @returns {function} Fastify route handler
 */
export function createTextStreamHandler(getModelForRequest) {
  return async function handleTextStream(request, reply) {
    try {
      const { messages } = request.body;
      const model = getModelForRequest(request);

      const result = streamText({
        model,
        messages: messages || [
          { role: 'user', content: 'Invent a new holiday and describe its traditions.' },
        ],
      });

      reply.header('Content-Type', 'text/plain; charset=utf-8');

      // Convert Web ReadableStream to Node.js stream for proper Fastify hook handling (CORS, etc.)
      const nodeStream = Readable.fromWeb(result.textStream);
      return reply.send(nodeStream);
    } catch (error) {
      if (error.message.includes('Missing API key')) {
        return reply.status(401).send({ error: error.message });
      }
      throw error;
    }
  };
}

/**
 * Route 3: Custom Data Stream Writer
 * Provides fine-grained control with custom data and error handling
 * @param {function} getModelForRequest - Function to resolve the AI model for a request
 * @returns {function} Fastify route handler
 */
export function createCustomDataStreamHandler(getModelForRequest) {
  return async function handleCustomDataStream(request, reply) {
    try {
      const { messages } = request.body;
      const model = getModelForRequest(request);

      // Create data stream with custom executor
      const dataStream = createDataStream({
        execute: async (dataStreamWriter) => {
          // Write custom initialization data
          dataStreamWriter.writeData('initialized call');

          const result = streamText({
            model,
            messages: messages || [
              { role: 'user', content: 'Invent a new holiday and describe its traditions.' },
            ],
          });

          // Merge AI stream into the data stream
          result.mergeIntoDataStream(dataStreamWriter);
        },
        onError: (error) => {
          // Expose error messages to client (customize based on security needs)
          return error instanceof Error ? error.message : String(error);
        },
      });

      // Mark the response as a v1 data stream
      reply.header('X-Vercel-AI-Data-Stream', 'v1');
      reply.header('Content-Type', 'text/plain; charset=utf-8');

      // Convert Web ReadableStream to Node.js stream for proper Fastify hook handling (CORS, etc.)
      const nodeStream = Readable.fromWeb(dataStream);
      return reply.send(nodeStream);
    } catch (error) {
      if (error.message.includes('Missing API key')) {
        return reply.status(401).send({ error: error.message });
      }
      throw error;
    }
  };
}

/**
 * PROMPT-BASED ROUTES (accept simple prompt string instead of messages array)
 */

/**
 * Route 4: Full Data Stream with Simple Prompt
 * Uses X-Vercel-AI-Data-Stream header with v1 protocol
 * @param {function} getModelForRequest - Function to resolve the AI model for a request
 * @returns {function} Fastify route handler
 */
export function createDataStreamPromptHandler(getModelForRequest) {
  return async function handleDataStreamPrompt(request, reply) {
    try {
      const { prompt } = request.body;
      const model = getModelForRequest(request);

      const result = streamText({
        model,
        prompt: prompt || 'Invent a new holiday and describe its traditions.',
      });

      // Mark the response as a v1 data stream
      reply.header('X-Vercel-AI-Data-Stream', 'v1');
      reply.header('Content-Type', 'text/plain; charset=utf-8');

      // Convert Web ReadableStream to Node.js stream for proper Fastify hook handling (CORS, etc.)
      const nodeStream = Readable.fromWeb(result.toDataStream());
      return reply.send(nodeStream);
    } catch (error) {
      if (error.message.includes('Missing API key')) {
        return reply.status(401).send({ error: error.message });
      }
      throw error;
    }
  };
}

/**
 * Route 5: Simple Text Stream with Prompt
 * Returns only the text content as a stream
 * @param {function} getModelForRequest - Function to resolve the AI model for a request
 * @returns {function} Fastify route handler
 */
export function createTextStreamPromptHandler(getModelForRequest) {
  return async function handleTextStreamPrompt(request, reply) {
    try {
      const { prompt } = request.body;
      const model = getModelForRequest(request);

      const result = streamText({
        model,
        prompt: prompt || 'Invent a new holiday and describe its traditions.',
      });

      reply.header('Content-Type', 'text/plain; charset=utf-8');

      // Convert Web ReadableStream to Node.js stream for proper Fastify hook handling (CORS, etc.)
      const nodeStream = Readable.fromWeb(result.textStream);
      return reply.send(nodeStream);
    } catch (error) {
      if (error.message.includes('Missing API key')) {
        return reply.status(401).send({ error: error.message });
      }
      throw error;
    }
  };
}

/**
 * Route 6: Custom Data Stream Writer with Prompt
 * Provides fine-grained control with custom data and error handling
 * @param {function} getModelForRequest - Function to resolve the AI model for a request
 * @returns {function} Fastify route handler
 */
export function createCustomDataStreamPromptHandler(getModelForRequest) {
  return async function handleCustomDataStreamPrompt(request, reply) {
    try {
      const { prompt } = request.body;
      const model = getModelForRequest(request);

      // Create data stream with custom executor
      const dataStream = createDataStream({
        execute: async (dataStreamWriter) => {
          // Write custom initialization data
          dataStreamWriter.writeData('initialized call');

          const result = streamText({
            model,
            prompt: prompt || 'Invent a new holiday and describe its traditions.',
          });

          // Merge AI stream into the data stream
          result.mergeIntoDataStream(dataStreamWriter);
        },
        onError: (error) => {
          // Expose error messages to client (customize based on security needs)
          return error instanceof Error ? error.message : String(error);
        },
      });

      // Mark the response as a v1 data stream
      reply.header('X-Vercel-AI-Data-Stream', 'v1');
      reply.header('Content-Type', 'text/plain; charset=utf-8');

      // Convert Web ReadableStream to Node.js stream for proper Fastify hook handling (CORS, etc.)
      const nodeStream = Readable.fromWeb(dataStream);
      return reply.send(nodeStream);
    } catch (error) {
      if (error.message.includes('Missing API key')) {
        return reply.status(401).send({ error: error.message });
      }
      throw error;
    }
  };
}
