/**
 * Checklist Template Service - Fastify Plugin
 * Provides API routes for managing checklist templates and generating checklist instances
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import fastifyPlugin from 'fastify-plugin';
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';

import { errorHandler } from './plugins/errorHandler.js';
import { testConnection, closeConnection } from './database/index.js';
import { templateRoutes } from './routes/templates.js';
import { checklistRoutes } from './routes/checklists.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface PluginOptions extends FastifyPluginOptions {
  frontendPrefix?: string;
  apiPrefix?: string;
}

/**
 * Checklist Template Plugin
 * Registers API endpoints for template and checklist management
 *
 * @param fastify - Fastify instance
 * @param options - Plugin options
 */
async function checklistTemplatePlugin(
  fastify: FastifyInstance,
  options: PluginOptions
): Promise<void> {
  fastify.log.info('→ Initializing Checklist Template plugin...');

  // Test database connection
  try {
    await testConnection();
    fastify.log.info('  ✓ Database connection established');
  } catch (error) {
    fastify.log.error({ err: error }, '  ✗ Database connection failed');
    throw error;
  }

  // Set up error handler
  fastify.setErrorHandler(errorHandler);
  fastify.log.info('  ✓ Error handler registered');

  // API prefix
  const apiPrefix = options.apiPrefix || '/api/checklist-template';

  // Health check endpoint
  fastify.get(apiPrefix, async (_request, _reply) => {
    return {
      status: 'ok',
      service: 'checklist-template',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: `GET ${apiPrefix}`,
        templates: `GET ${apiPrefix}/templates`,
        templateById: `GET ${apiPrefix}/templates/:id`,
        createTemplate: `POST ${apiPrefix}/templates`,
        updateTemplate: `PUT ${apiPrefix}/templates/:id`,
        deleteTemplate: `DELETE ${apiPrefix}/templates/:id`,
        checklists: `GET ${apiPrefix}/checklists`,
        checklistById: `GET ${apiPrefix}/checklists/:id`,
        generateChecklist: `POST ${apiPrefix}/checklists`,
      },
    };
  });
  fastify.log.info(`  ✓ Registered route: GET ${apiPrefix} (health check)`);

  // Register API routes with prefix
  await fastify.register(
    async (apiInstance) => {
      await apiInstance.register(templateRoutes);
      await apiInstance.register(checklistRoutes);
    },
    { prefix: apiPrefix }
  );
  fastify.log.info(`  ✓ Registered API routes at ${apiPrefix}`);

  // Register static file serving for frontend
  if (options.frontendPrefix) {
    try {
      const lookup = (await import('mime-types')).lookup;
      const staticRoot = resolve(__dirname, '../frontend/dist');

      fastify.log.info(`→ Setting up frontend static serving...`);
      fastify.log.info(`  Root: ${staticRoot}`);
      fastify.log.info(`  Prefix: ${options.frontendPrefix}`);

      // Read index.html once for SPA fallback
      const indexPath = resolve(staticRoot, 'index.html');
      let indexHtml: string | null = null;

      if (existsSync(indexPath)) {
        indexHtml = readFileSync(indexPath, 'utf-8');
      }

      // Route 1: Serve index.html at the root path
      fastify.get(options.frontendPrefix, async (_request, reply) => {
        if (!indexHtml) {
          return reply.code(404).send({ error: 'Frontend not built' });
        }
        reply.type('text/html');
        if (process.env.NODE_ENV === 'development') {
          reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
        return reply.send(indexHtml);
      });

      // Route 2: Serve static files and SPA fallback
      fastify.get(`${options.frontendPrefix}/*`, async (request, reply) => {
        if (!indexHtml) {
          return reply.code(404).send({ error: 'Frontend not built' });
        }

        const requestedPath = request.url.replace(options.frontendPrefix!, '');
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
          fastify.log.debug({ err }, `File not found or error: ${filePath}`);
        }

        // SPA fallback - serve index.html for client-side routes
        reply.type('text/html');
        if (process.env.NODE_ENV === 'development') {
          reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
        return reply.send(indexHtml);
      });

      fastify.log.info(`  ✓ Registered static assets at: ${options.frontendPrefix}`);
      fastify.log.info(`     Serving from: ${staticRoot}`);
    } catch (error) {
      fastify.log.warn(`  ⚠ Failed to register static assets: ${(error as Error).message}`);
      fastify.log.error(error);
    }
  }

  // Graceful shutdown hook
  fastify.addHook('onClose', async () => {
    fastify.log.info('→ Closing database connection...');
    await closeConnection();
    fastify.log.info('  ✓ Database connection closed');
  });

  fastify.log.info('✅ Checklist Template plugin successfully loaded');
}

// Export as Fastify plugin
export default fastifyPlugin(checklistTemplatePlugin, {
  name: 'checklist-template',
  fastify: '5.x',
});

// Also export the plugin function for direct use
export { checklistTemplatePlugin };
