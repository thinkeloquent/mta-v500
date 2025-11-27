import type { RequestEnhancementOptions } from './types.js';

/**
 * Default configuration for request enhancement plugin
 */
export const defaultConfig: RequestEnhancementOptions = {
  // Rate limiting
  rateLimitMax: 100,
  rateLimitTimeWindow: '1 minute',

  // CORS mode (default: allow origin with credentials)
  corsUseOrigin: false,
  corsUseAnyHost: false,
  corsAllowLocalhost: false,
  corsAllowedOrigins: [],

  // All plugins enabled by default
  plugins: {
    sensible: true,
    etag: true,
    helmet: true,
    rateLimit: true,
    cors: true,
    compress: true,
    formbody: true,
    multipart: true,
  },
};

/**
 * Development configuration - more permissive for local development
 */
export const devConfig: RequestEnhancementOptions = {
  rateLimitMax: 1000,
  rateLimitTimeWindow: '1 minute',
  corsUseAnyHost: false,
  corsAllowLocalhost: true, // Allow any localhost in dev
  plugins: {
    sensible: true,
    etag: true,
    helmet: false, // Disable for easier debugging
    rateLimit: false, // Disable for development
    cors: true,
    compress: false, // Disable for easier debugging
    formbody: true,
    multipart: true,
  },
};

/**
 * Production configuration - strict security settings
 */
export const prodConfig: RequestEnhancementOptions = {
  rateLimitMax: 50,
  rateLimitTimeWindow: '1 minute',
  corsUseOrigin: true, // Use request origin
  corsUseAnyHost: false, // Explicitly disable permissive mode
  plugins: {
    sensible: true,
    etag: true,
    helmet: true,
    rateLimit: true,
    cors: true,
    compress: true,
    formbody: true,
    multipart: true,
  },
};
