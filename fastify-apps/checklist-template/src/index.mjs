/**
 * Checklist Template - Fastify Plugin
 * Provides API routes for the main Fastify server
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import fastifyPlugin from 'fastify-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Checklist Template Plugin
 * Registers API endpoints
 *
 * @param {object} fastify - Fastify instance
 * @param {object} _options - Plugin options
 * @param {string} [_options.frontendPrefix] - URL prefix for serving frontend static files
 * @param {string} [_options.apiPrefix] - URL prefix for API routes
 */
async function checklistTemplatePlugin(fastify, _options) {
  fastify.log.info('→ Initializing Checklist Template plugin...');

  // Health check endpoint
  fastify.get('/api/checklist-template', async (_request, _reply) => {
    return {
      status: 'ok',
      service: 'checklist-template',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: 'GET /api/checklist-template',
        hello: 'GET /api/checklist-template/hello',
        echo: 'POST /api/checklist-template/echo',
      },
    };
  });
  fastify.log.info('  ✓ Registered route: GET /api/checklist-template (health check)');

  // Example GET endpoint
  fastify.get('/api/checklist-template/hello', async (request, _reply) => {
    const name = request.query.name || 'World';
    return {
      message: `Hello, ${name}!`,
      timestamp: new Date().toISOString(),
    };
  });
  fastify.log.info('  ✓ Registered route: GET /api/checklist-template/hello');

  // Example POST endpoint
  fastify.post(
    '/api/checklist-template/echo',
    {
      schema: {
        description: 'Echo back the request body',
        tags: ['Checklist Template'],
        body: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
    },
    async (request, _reply) => {
      return {
        echo: request.body,
        timestamp: new Date().toISOString(),
      };
    },
  );
  fastify.log.info('  ✓ Registered route: POST /api/checklist-template/echo');

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

  fastify.log.info('✅ Checklist Template plugin successfully loaded');
}

// Export as Fastify plugin
export default fastifyPlugin(checklistTemplatePlugin, {
  name: 'checklist-template',
  fastify: '5.x',
});

// Also export the plugin function for direct use
export { checklistTemplatePlugin };
