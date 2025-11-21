/**
 * @module @internal/core-no-cache
 * Fastify plugin for setting no-cache headers on all responses
 */

import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import type { NoCacheOptions, NoCacheResult } from './types.js';
import { NoCacheOptionsSchema } from './types.js';

/**
 * Default options for the no-cache plugin
 */
const DEFAULT_OPTIONS: Required<NoCacheOptions> = {
  enabled: true,
};

/**
 * Fastify plugin for no-cache headers
 *
 * Sets the following headers on all responses:
 * - Cache-Control: no-cache, no-store, must-revalidate
 * - Pragma: no-cache
 * - Expires: 0
 *
 * These headers prevent browsers and proxies from caching responses,
 * ensuring fresh content is always loaded.
 */
const noCachePlugin: FastifyPluginAsync<NoCacheOptions> = async (fastify, options) => {
  // Validate and merge options with defaults
  const validatedOptions = NoCacheOptionsSchema.parse(options);
  const opts: Required<NoCacheOptions> = {
    ...DEFAULT_OPTIONS,
    ...validatedOptions,
  };

  // Skip if disabled
  if (!opts.enabled) {
    fastify.log.info('No-cache plugin is disabled');

    const result: NoCacheResult = {
      success: true,
      enabled: false,
    };

    fastify.decorate('noCacheResult', result);
    return;
  }

  fastify.log.info('Initializing no-cache plugin...');

  try {
    // Add onSend hook to set no-cache headers on all responses
    fastify.addHook('onSend', async (_request, reply) => {
      // Set Cache-Control header
      reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');

      // Set Pragma header for HTTP/1.0 compatibility
      reply.header('Pragma', 'no-cache');

      // Set Expires header for legacy clients
      reply.header('Expires', '0');
    });

    const result: NoCacheResult = {
      success: true,
      enabled: true,
    };

    fastify.decorate('noCacheResult', result);

    fastify.log.info(
      {
        enabled: opts.enabled,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      },
      'No-cache plugin initialized successfully',
    );
  } catch (error) {
    fastify.log.error({ error }, 'Failed to initialize no-cache plugin');

    const errorResult: NoCacheResult = {
      success: false,
      enabled: opts.enabled,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    fastify.decorate('noCacheResult', errorResult);
    throw error;
  }
};

// Export as fastify plugin
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default fp(noCachePlugin as any, {
  name: 'core-no-cache',
  fastify: '>=4.0.0',
});

// Augment Fastify type definitions
declare module 'fastify' {
  interface FastifyInstance {
    noCacheResult?: NoCacheResult;
  }
}
