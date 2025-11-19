import type { FastifyCorsOptions } from '@fastify/cors';
import type { FastifyRequest } from 'fastify';
import type { CorsPolicyEngine } from '../../lib/cors-policy-engine.js';

/**
 * CORS delegation callback type
 */
export type CorsDelegatorCallback = (error: Error | null, corsOptions?: FastifyCorsOptions) => void;

/**
 * CORS delegator function type
 */
export type CorsDelegator = (req: FastifyRequest, callback: CorsDelegatorCallback) => void;

/**
 * Configuration options for the header-request-enhancements plugin
 */
export interface RequestEnhancementOptions {
  /**
   * Use the new centralized CORS policy engine
   * When true, loads configuration from common/config/cors.json
   * This is the recommended approach for enterprise deployments
   */
  useCorsEngine?: boolean;

  /**
   * Pre-configured CORS policy engine instance
   * If provided, useCorsEngine is ignored
   */
  corsEngine?: CorsPolicyEngine;

  /**
   * App name for app-specific CORS overrides
   * Used when useCorsEngine is true
   */
  appName?: string;

  /**
   * Path to custom cors.json configuration file
   * Only used when useCorsEngine is true
   */
  corsConfigPath?: string;

  /**
   * Custom CORS delegators array
   * When provided, the first delegator will be used for CORS handling
   * @deprecated Use useCorsEngine with cors.json configuration instead
   */
  corsDelegators?: CorsDelegator[];

  /**
   * Use the request origin header for CORS validation
   * If true, allows requests from any origin that provides an Origin header
   * @deprecated Use useCorsEngine with cors.json configuration instead
   */
  corsUseOrigin?: boolean;

  /**
   * Allow any host with full CORS permissions
   * This is the most permissive mode - use with caution in production
   * @deprecated Use useCorsEngine with cors.json configuration instead
   */
  corsUseAnyHost?: boolean;

  /**
   * Allow any localhost origin (any port) in development
   * Useful for local development with multiple services on different ports
   * @deprecated Use useCorsEngine with cors.json configuration instead
   */
  corsAllowLocalhost?: boolean;

  /**
   * Allowed origins for production mode
   * Can be set via CORS_ALLOW_ORIGINS environment variable (comma-separated)
   * @deprecated Use useCorsEngine with cors.json configuration instead
   */
  corsAllowedOrigins?: string[];

  /**
   * Maximum number of requests per time window (default: 100)
   */
  rateLimitMax?: number;

  /**
   * Time window for rate limiting (default: "1 minute")
   */
  rateLimitTimeWindow?: string;

  /**
   * Enable/disable specific plugins
   */
  plugins?: {
    sensible?: boolean;
    etag?: boolean;
    helmet?: boolean;
    rateLimit?: boolean;
    cors?: boolean;
    compress?: boolean;
    formbody?: boolean;
    multipart?: boolean;
  };
}
