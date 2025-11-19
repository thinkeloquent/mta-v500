import fastifyCompress from '@fastify/compress';
import fastifyCors, { type FastifyCorsOptions } from '@fastify/cors';
import fastifyEtag from '@fastify/etag';
import fastifyFormbody from '@fastify/formbody';
import fastifyHelmet from '@fastify/helmet';
import fastifyMultipart from '@fastify/multipart';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifySensible from '@fastify/sensible';
import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { defaultConfig } from './config.js';
import type { RequestEnhancementOptions } from './types.js';
import { createCorsPolicyEngine, type CorsPolicyEngine } from '../../lib/cors-policy-engine.js';
import { loadCorsConfig, validateCorsConfig } from '../../lib/cors-config-loader.js';

/**
 * Header Request Enhancements Plugin
 *
 * Bundles essential Fastify plugins for production-ready HTTP handling:
 *
 * 1. @fastify/sensible - HTTP utilities and better error handling
 * 2. @fastify/etag - Automatic ETag generation for caching
 * 3. @fastify/helmet - Security headers (XSS, CSP, HSTS, etc.)
 * 4. @fastify/rate-limit - Request rate limiting
 * 5. @fastify/cors - Cross-Origin Resource Sharing with advanced delegation
 * 6. @fastify/compress - Response compression (gzip/deflate/brotli)
 * 7. @fastify/formbody - Parse application/x-www-form-urlencoded
 * 8. @fastify/multipart - Handle multipart/form-data file uploads
 *
 * @example
 * ```ts
 * import { headerRequestEnhancements } from './plugins/header-request-enhancements';
 *
 * // Use with default config
 * fastify.register(headerRequestEnhancements);
 *
 * // Use with custom config
 * fastify.register(headerRequestEnhancements, {
 *   corsUseAnyHost: true,
 *   rateLimitMax: 200
 * });
 * ```
 */
const headerRequestEnhancementsPlugin: FastifyPluginAsync<RequestEnhancementOptions> = async (
  fastify,
  options,
) => {
  // Merge options with defaults
  const config = { ...defaultConfig, ...options };
  const pluginConfig = { ...defaultConfig.plugins, ...config.plugins };

  const enabledPlugins: string[] = [];
  const disabledPlugins: string[] = [];

  // 1. Sensible - HTTP utilities and error handling
  if (pluginConfig.sensible) {
    await fastify.register(fastifySensible);
    enabledPlugins.push('sensible');
    fastify.log.debug('✓ @fastify/sensible registered');
  } else {
    disabledPlugins.push('sensible');
  }

  // 2. ETag - Automatic ETag generation
  if (pluginConfig.etag) {
    await fastify.register(fastifyEtag);
    enabledPlugins.push('etag');
    fastify.log.debug('✓ @fastify/etag registered');
  } else {
    disabledPlugins.push('etag');
  }

  // 3. Helmet - Security headers
  if (pluginConfig.helmet) {
    await fastify.register(fastifyHelmet, {
      // Disable policies that conflict with CORS
      crossOriginResourcePolicy: pluginConfig.cors ? { policy: 'cross-origin' } : true,
      crossOriginOpenerPolicy: pluginConfig.cors ? { policy: 'same-origin-allow-popups' } : true,
    });
    enabledPlugins.push('helmet');
    fastify.log.debug('✓ @fastify/helmet registered');
  } else {
    disabledPlugins.push('helmet');
  }

  // 4. Rate Limit - Prevent abuse
  if (pluginConfig.rateLimit) {
    await fastify.register(fastifyRateLimit, {
      max: config.rateLimitMax || 100,
      timeWindow: config.rateLimitTimeWindow || '1 minute',
    });
    enabledPlugins.push(`rate-limit(${config.rateLimitMax}/${config.rateLimitTimeWindow})`);
    fastify.log.debug(
      `✓ @fastify/rate-limit registered (${config.rateLimitMax}/${config.rateLimitTimeWindow})`,
    );
  } else {
    disabledPlugins.push('rate-limit');
  }

  // 5. CORS - Cross-Origin Resource Sharing with enterprise policy engine
  if (pluginConfig.cors) {
    let corsMode: string;
    let policyEngine: CorsPolicyEngine | null = null;

    // Check if we should use the new CORS policy engine
    const useCorsEngine = config.useCorsEngine || config.corsEngine;

    if (useCorsEngine) {
      // Use the new enterprise CORS policy engine
      if (config.corsEngine) {
        // Use provided engine instance
        policyEngine = config.corsEngine;
        corsMode = `engine(${policyEngine.getEnvironment()})`;
      } else {
        // Load configuration and create engine
        const corsConfig = loadCorsConfig({
          configPath: config.corsConfigPath,
          logger: fastify.log,
          monorepoRoot: process.env.MONOREPO_ROOT,
        });

        // Validate configuration
        const environment = process.env.NODE_ENV || 'development';
        const validation = validateCorsConfig(corsConfig, environment, fastify.log);

        if (!validation.valid) {
          fastify.log.error(
            { errors: validation.errors },
            'CORS configuration validation failed',
          );
          throw new Error(`CORS configuration invalid: ${validation.errors.join(', ')}`);
        }

        if (validation.warnings.length > 0) {
          fastify.log.warn(
            { warnings: validation.warnings },
            'CORS configuration warnings',
          );
        }

        // Create policy engine
        policyEngine = createCorsPolicyEngine(corsConfig, environment, fastify.log);
        corsMode = `engine(${environment})`;

        fastify.log.info(
          {
            source: corsConfig._source,
            environment,
            envOverrides: corsConfig._envOverrides,
          },
          'CORS policy engine initialized',
        );
      }

      // Get resolved policy
      const policy = policyEngine.resolvePolicy(config.appName);

      // Add manual CORS headers via onSend hook for all responses
      // This ensures headers are added even to encapsulated routes and streaming responses
      fastify.addHook('onSend', async (request, reply) => {
        const origin = request.headers.origin;

        if (origin && policyEngine) {
          const decision = policyEngine.checkOrigin(origin, config.appName);

          if (decision.allowed) {
            reply.header('Access-Control-Allow-Origin', origin);
            reply.header('Access-Control-Allow-Credentials', String(policy.credentials));
            reply.header('Access-Control-Expose-Headers', policy.exposedHeaders.join(', '));
          }
        }
      });

      // Register @fastify/cors for preflight handling with policy engine
      const corsOptions = policyEngine.getFastifyCorsOptions(config.appName) as FastifyCorsOptions;
      await fastify.register(fastifyCors, corsOptions);

      enabledPlugins.push(`cors(${corsMode})`);
      fastify.log.debug(
        {
          mode: corsMode,
          app: config.appName,
          originsCount: policy.origins.length,
        },
        '✓ @fastify/cors registered with enterprise policy engine',
      );
    } else {
      // Legacy CORS handling (deprecated but maintained for backward compatibility)
      if (config.corsAllowLocalhost) {
        corsMode = 'localhost-dev';
      } else if (config.corsUseOrigin) {
        corsMode = 'reflect-origin';
      } else if (config.corsAllowedOrigins && config.corsAllowedOrigins.length > 0) {
        corsMode = 'allowed-list';
      } else {
        corsMode = 'allow-all';
      }

      fastify.log.warn(
        { mode: corsMode },
        'Using legacy CORS configuration. Consider migrating to useCorsEngine for enterprise features.',
      );

      // Add manual CORS headers via onSend hook for all responses
      // This ensures headers are added even to encapsulated routes
      fastify.addHook('onSend', async (request, reply) => {
        const origin = request.headers.origin;

        if (origin) {
          let allowOrigin = false;

          if (config.corsAllowLocalhost) {
            // Allow any localhost origin
            const localhostRegex = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
            allowOrigin = localhostRegex.test(origin);
          } else if (config.corsUseOrigin || !config.corsAllowedOrigins?.length) {
            // Reflect any origin
            allowOrigin = true;
          } else if (config.corsAllowedOrigins?.includes(origin)) {
            // Check allowed list
            allowOrigin = true;
          }

          if (allowOrigin) {
            reply.header('Access-Control-Allow-Origin', origin);
            reply.header('Access-Control-Allow-Credentials', 'true');
            reply.header('Access-Control-Expose-Headers', 'Content-Type, Authorization');
          }
        }
      });

      // Also register @fastify/cors for preflight handling
      const corsOptions: FastifyCorsOptions = {
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-AI-Model'],
        exposedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
        maxAge: 3600,
        origin: config.corsAllowLocalhost || config.corsUseOrigin ? true : config.corsAllowedOrigins,
      };

      await fastify.register(fastifyCors, corsOptions);

      enabledPlugins.push(`cors(${corsMode})`);
      fastify.log.debug(`✓ @fastify/cors registered with manual headers (mode: ${corsMode})`);
    }
  } else {
    disabledPlugins.push('cors');
  }

  // 6. Compress - Response compression
  if (pluginConfig.compress) {
    await fastify.register(fastifyCompress);
    enabledPlugins.push('compress');
    fastify.log.debug('✓ @fastify/compress registered');
  } else {
    disabledPlugins.push('compress');
  }

  // 7. Formbody - Parse URL-encoded forms
  if (pluginConfig.formbody) {
    await fastify.register(fastifyFormbody);
    enabledPlugins.push('formbody');
    fastify.log.debug('✓ @fastify/formbody registered');
  } else {
    disabledPlugins.push('formbody');
  }

  // 8. Multipart - Handle file uploads
  if (pluginConfig.multipart) {
    await fastify.register(fastifyMultipart);
    enabledPlugins.push('multipart');
    fastify.log.debug('✓ @fastify/multipart registered');
  } else {
    disabledPlugins.push('multipart');
  }

  // Summary log at info level with structured data
  fastify.log.info(
    {
      enabledPlugins,
      disabledPlugins,
      enabledCount: enabledPlugins.length,
      disabledCount: disabledPlugins.length,
    },
    `Header Request Enhancements loaded: ${enabledPlugins.length} enabled, ${disabledPlugins.length} disabled`,
  );
};

// Wrap with fastify-plugin to break encapsulation
// This allows hooks and decorators to be inherited by parent and sibling contexts
export const headerRequestEnhancements = fp(headerRequestEnhancementsPlugin, {
  name: 'header-request-enhancements',
  fastify: '5.x',
});

export default headerRequestEnhancements;
