/**
 * AI SDK Chat - Fastify Plugin
 * Thin shell for AI streaming routes - model resolution handled externally
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import fastifyPlugin from 'fastify-plugin';
import {
  createCustomDataStreamHandler,
  createCustomDataStreamPromptHandler,
  createDataStreamHandler,
  createDataStreamPromptHandler,
  createTextStreamHandler,
  createTextStreamPromptHandler,
} from './stream-protocol.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * AI SDK Chat Plugin
 * Registers streaming endpoints - requires getModelForRequest to be provided
 *
 * @param {object} fastify - Fastify instance
 * @param {object} _options - Plugin options
 * @param {function} _options.getModelForRequest - Required function to resolve AI model for a request.
 *   Must return a valid AI SDK model instance. All model/provider logic is handled externally.
 * @param {string} [_options.frontendPrefix] - URL prefix for serving frontend static files
 */
async function aiSdkChatPlugin(fastify, _options) {
  fastify.log.info('→ Initializing AI SDK Chat plugin...');

  // Require getModelForRequest
  if (!_options.getModelForRequest) {
    throw new Error('ai-sdk-chat plugin requires getModelForRequest option');
  }
  if (typeof _options.getModelForRequest !== 'function') {
    throw new Error('getModelForRequest must be a function');
  }

  const getModelForRequest = _options.getModelForRequest;

  // Create handlers with the model resolver
  const handleDataStream = createDataStreamHandler(getModelForRequest);
  const handleTextStream = createTextStreamHandler(getModelForRequest);
  const handleCustomDataStream = createCustomDataStreamHandler(getModelForRequest);
  const handleDataStreamPrompt = createDataStreamPromptHandler(getModelForRequest);
  const handleTextStreamPrompt = createTextStreamPromptHandler(getModelForRequest);
  const handleCustomDataStreamPrompt = createCustomDataStreamPromptHandler(getModelForRequest);

  // Health check endpoint
  fastify.get('/api/ai-sdk-chat', async (_request, _reply) => {
    return {
      status: 'ok',
      service: 'ai-sdk-chat',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: 'GET /api/ai-sdk-chat',
        streamProtocol: 'POST /api/ai-sdk-chat/stream-protocol',
        streamText: 'POST /api/ai-sdk-chat/stream-text',
        streamCustom: 'POST /api/ai-sdk-chat/stream-custom',
        streamProtocolPrompt: 'POST /api/ai-sdk-chat/stream-protocol-prompt',
        streamTextPrompt: 'POST /api/ai-sdk-chat/stream-text-prompt',
        streamCustomPrompt: 'POST /api/ai-sdk-chat/stream-custom-prompt',
      },
    };
  });
  fastify.log.info('  ✓ Registered route: GET /api/ai-sdk-chat (health check)');

  // Route 1: Full data stream with protocol headers
  fastify.post(
    '/api/ai-sdk-chat/stream-protocol',
    {
      schema: {
        description: 'Stream AI responses using Vercel AI SDK data stream protocol',
        tags: ['AI SDK'],
        body: {
          type: 'object',
          properties: {
            messages: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  role: { type: 'string', enum: ['user', 'assistant', 'system'] },
                  content: { type: 'string' },
                },
                required: ['role', 'content'],
              },
            },
          },
        },
      },
    },
    handleDataStream,
  );
  fastify.log.info('  ✓ Registered route: POST /api/ai-sdk-chat/stream-protocol');

  // Route 2: Simple text stream
  fastify.post(
    '/api/ai-sdk-chat/stream-text',
    {
      schema: {
        description: 'Stream AI responses as plain text',
        tags: ['AI SDK'],
        body: {
          type: 'object',
          properties: {
            messages: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  role: { type: 'string', enum: ['user', 'assistant', 'system'] },
                  content: { type: 'string' },
                },
                required: ['role', 'content'],
              },
            },
          },
        },
      },
    },
    handleTextStream,
  );
  fastify.log.info('  ✓ Registered route: POST /api/ai-sdk-chat/stream-text');

  // Route 3: Custom data stream with error handling
  fastify.post(
    '/api/ai-sdk-chat/stream-custom',
    {
      schema: {
        description: 'Stream AI responses with custom data writer and error handling',
        tags: ['AI SDK'],
        body: {
          type: 'object',
          properties: {
            messages: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  role: { type: 'string', enum: ['user', 'assistant', 'system'] },
                  content: { type: 'string' },
                },
                required: ['role', 'content'],
              },
            },
          },
        },
      },
    },
    handleCustomDataStream,
  );
  fastify.log.info('  ✓ Registered route: POST /api/ai-sdk-chat/stream-custom');

  // Route 4: Data stream with simple prompt
  fastify.post(
    '/api/ai-sdk-chat/stream-protocol-prompt',
    {
      schema: {
        description:
          'Stream AI responses using Vercel AI SDK data stream protocol with simple prompt',
        tags: ['AI SDK'],
        body: {
          type: 'object',
          properties: {
            prompt: { type: 'string', minLength: 1 },
          },
          required: ['prompt'],
        },
      },
    },
    handleDataStreamPrompt,
  );
  fastify.log.info('  ✓ Registered route: POST /api/ai-sdk-chat/stream-protocol-prompt');

  // Route 5: Text stream with simple prompt
  fastify.post(
    '/api/ai-sdk-chat/stream-text-prompt',
    {
      schema: {
        description: 'Stream AI responses as plain text with simple prompt',
        tags: ['AI SDK'],
        body: {
          type: 'object',
          properties: {
            prompt: { type: 'string', minLength: 1 },
          },
          required: ['prompt'],
        },
      },
    },
    handleTextStreamPrompt,
  );
  fastify.log.info('  ✓ Registered route: POST /api/ai-sdk-chat/stream-text-prompt');

  // Route 6: Custom data stream with simple prompt
  fastify.post(
    '/api/ai-sdk-chat/stream-custom-prompt',
    {
      schema: {
        description:
          'Stream AI responses with custom data writer and error handling using simple prompt',
        tags: ['AI SDK'],
        body: {
          type: 'object',
          properties: {
            prompt: { type: 'string', minLength: 1 },
          },
          required: ['prompt'],
        },
      },
    },
    handleCustomDataStreamPrompt,
  );
  fastify.log.info('  ✓ Registered route: POST /api/ai-sdk-chat/stream-custom-prompt');

  // Register static file serving for frontend
  if (_options.frontendPrefix) {
    try {
      const { readFileSync, existsSync, statSync } = await import('node:fs');
      const { readFile } = await import('node:fs/promises');
      const { lookup } = await import('mime-types');
      const staticRoot = resolve(__dirname, '../frontend/dist');

      fastify.log.info(`→ Setting up frontend static serving...`);
      fastify.log.info(`  Root: ${staticRoot}`);
      fastify.log.info(`  Prefix: ${_options.frontendPrefix}`);

      // Read index.html once for SPA fallback
      const indexPath = resolve(staticRoot, 'index.html');
      const indexHtml = readFileSync(indexPath, 'utf-8');

      // Route 1: Serve index.html at the root path
      fastify.get(_options.frontendPrefix, async (_request, reply) => {
        reply.type('text/html');
        if (process.env.NODE_ENV === 'development') {
          reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
        return reply.send(indexHtml);
      });

      // Route 2: Serve static files and SPA fallback
      fastify.get(`${_options.frontendPrefix}/*`, async (request, reply) => {
        const requestedPath = request.url.replace(_options.frontendPrefix, '');
        const cleanPath = requestedPath.startsWith('/') ? requestedPath.slice(1) : requestedPath;
        const filePath = resolve(staticRoot, cleanPath);

        // Security: ensure path is within staticRoot
        if (!filePath.startsWith(staticRoot)) {
          return reply.code(403).send({ error: 'Forbidden' });
        }

        // Check if file exists and is a file (not directory)
        try {
          if (existsSync(filePath)) {
            const stats = statSync(filePath);
            if (stats.isFile()) {
              // Serve the static file
              const content = await readFile(filePath);
              const mimeType = lookup(filePath) || 'application/octet-stream';

              reply.type(mimeType);
              if (process.env.NODE_ENV === 'development') {
                reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
              }
              return reply.send(content);
            }
          }
        } catch (err) {
          fastify.log.debug(`File not found or error: ${filePath}`, err);
        }

        // SPA fallback - serve index.html for client-side routes
        reply.type('text/html');
        if (process.env.NODE_ENV === 'development') {
          reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
        return reply.send(indexHtml);
      });

      fastify.log.info(`  ✓ Registered static assets at: ${_options.frontendPrefix}`);
      fastify.log.info(`     Serving from: ${staticRoot}`);
    } catch (error) {
      fastify.log.warn(`  ⚠ Failed to register static assets: ${error.message}`);
      fastify.log.error(error);
    }
  }

  fastify.log.info('✅ AI SDK Chat plugin successfully loaded with 6 routes');
  fastify.log.info('   → 3 routes with messages array input');
  fastify.log.info('   → 3 routes with simple prompt input');
}

// Export as Fastify plugin
export default fastifyPlugin(aiSdkChatPlugin, {
  name: 'ai-sdk-chat',
  fastify: '5.x',
});

// Also export the plugin function for direct use
export { aiSdkChatPlugin };
