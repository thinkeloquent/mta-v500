/**
 * Core Static App Plugin
 *
 * A Fastify plugin for serving static files with SPA support.
 * Perfect for serving Vite-built applications.
 *
 * @module @internal/core-static-app
 */

export { default } from './plugin.js';
export type { StaticAppOptions } from './types.js';
export { StaticAppOptionsSchema } from './types.js';
