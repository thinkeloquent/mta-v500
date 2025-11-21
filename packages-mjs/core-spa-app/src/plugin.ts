import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import type { SpaAppOptions } from './types.js';
import { SpaAppOptionsSchema } from './types.js';

/**
 * Core SPA App Plugin
 *
 * Serves index.html for SPA client-side routing.
 * Does NOT serve static files - use @internal/core-static-app for that.
 */
const coreSpaAppPlugin: FastifyPluginAsync<SpaAppOptions> = async (
  fastify: FastifyInstance,
  options: SpaAppOptions,
) => {
  // Validate options with Zod
  const opts = SpaAppOptionsSchema.parse(options);

  // Resolve absolute paths
  const rootPath = resolve(opts.root);
  const indexPath = join(rootPath, opts.indexFile);

  // Check if root directory exists
  if (!existsSync(rootPath)) {
    const error = `SPA root directory does not exist: ${rootPath}`;
    fastify.log.error(`[core-spa-app] ${error}`);
    throw new Error(error);
  }

  // Check if index file exists
  if (!existsSync(indexPath)) {
    const error = `SPA index file does not exist: ${indexPath}`;
    fastify.log.error(`[core-spa-app] ${error}`);
    throw new Error(error);
  }

  fastify.log.info(`[core-spa-app] Serving SPA from: ${rootPath}`);
  fastify.log.info(`[core-spa-app] URL prefix: ${opts.prefix}`);
  fastify.log.info(`[core-spa-app] Index file: ${opts.indexFile}`);
  fastify.log.info(`[core-spa-app] No-cache: ${opts.noCache ? 'enabled' : 'disabled'}`);

  // Read index.html content once at startup
  const indexContent = readFileSync(indexPath, 'utf-8');

  // Create route handler for serving index.html
  const serveIndex = async (_request: FastifyRequest, reply: FastifyReply) => {
    if (opts.noCache) {
      reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      reply.header('Pragma', 'no-cache');
      reply.header('Expires', '0');
    }

    reply.type('text/html');
    return reply.send(indexContent);
  };

  // Register exact prefix route (e.g., /apps/auth)
  if (opts.prefix !== '/') {
    fastify.get(opts.prefix, serveIndex);
    fastify.log.info(`[core-spa-app] Registered route: ${opts.prefix}`);
  }

  // Register wildcard route for client-side routing (e.g., /apps/auth/*)
  if (opts.wildcard) {
    const wildcardRoute = opts.prefix === '/' ? '/*' : `${opts.prefix}/*`;
    fastify.get(wildcardRoute, serveIndex);
    fastify.log.info(`[core-spa-app] Registered wildcard route: ${wildcardRoute}`);
  }

  // Register root route if prefix is /
  if (opts.prefix === '/') {
    fastify.get('/', serveIndex);
    fastify.log.info(`[core-spa-app] Registered root route: /`);
  }

  fastify.log.info('[core-spa-app] Plugin initialized successfully');
};

// Export as fastify plugin with metadata
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default fp(coreSpaAppPlugin as any, {
  name: 'core-spa-app',
  fastify: '>=5.0.0',
});
