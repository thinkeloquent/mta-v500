/**
 * AI SDK Stream Protocol Routes
 * Thin shell for AI streaming - model resolution is handled externally via getModelForRequest
 */

import { Readable } from 'node:stream';
import { createDataStream, streamText } from 'ai';

/**
 * Route 1: Full Data Stream (toDataStream)
 * Uses X-Vercel-AI-Data-Stream header with v1 protocol
 * @param {function} getModelForRequest - Function to resolve the AI model for a request
 * @returns {function} Fastify route handler
 */
export function createDataStreamHandler(getModelForRequest) {
  return async function handleDataStream(request, reply) {
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
  };
}
