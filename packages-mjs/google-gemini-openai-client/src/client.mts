/**
 * @internal/google-gemini-openai-client - Client creation
 * Creates configured undici agents for the Gemini API
 */

import { Agent, ProxyAgent } from 'undici';
import type { Dispatcher } from 'undici';
import { readFileSync } from 'node:fs';
import type { ClientOptions, ClientConfig } from './models.mjs';
import {
  DEFAULT_BASE_URL,
  DEFAULT_TIMEOUT,
  DEFAULT_KEEP_ALIVE_TIMEOUT,
  DEFAULT_MAX_CONNECTIONS,
  getApiKey,
} from './config.mjs';

/**
 * Creates a client configuration object with undici dispatcher.
 *
 * @param options - Client configuration options
 * @returns Configured client object
 * @throws Error if no API key is provided
 *
 * @example
 * ```typescript
 * // Basic usage with environment variable
 * const client = createClient();
 *
 * // With explicit options
 * const client = createClient({
 *   apiKey: 'your-api-key',
 *   proxy: 'http://proxy:8080',
 *   timeout: 60000,
 * });
 * ```
 */
export function createClient(options: ClientOptions = {}): ClientConfig {
  const apiKey = getApiKey(options.apiKey);

  if (!apiKey) {
    throw new Error(
      'API key required. Pass apiKey option or set GEMINI_API_KEY environment variable.'
    );
  }

  const config: Omit<ClientConfig, 'dispatcher'> = {
    apiKey,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
    proxy: options.proxy || null,
    cert: options.cert || null,
    caBundle: options.caBundle || null,
    customHeaders: options.customHeaders || {},
    timeout: options.timeout || DEFAULT_TIMEOUT,
    keepAliveTimeout: options.keepAliveTimeout || DEFAULT_KEEP_ALIVE_TIMEOUT,
    maxConnections: options.maxConnections || DEFAULT_MAX_CONNECTIONS,
  };

  // Build TLS options if cert or CA bundle provided
  const tlsOptions: Record<string, Buffer> = {};
  if (config.cert) {
    tlsOptions.cert = readFileSync(config.cert);
  }
  if (config.caBundle) {
    tlsOptions.ca = readFileSync(config.caBundle);
  }

  let dispatcher: Agent | ProxyAgent;

  // Create dispatcher based on proxy configuration
  if (config.proxy) {
    const proxyOpts = {
      uri: config.proxy,
      keepAliveTimeout: config.keepAliveTimeout,
      keepAliveMaxTimeout: config.keepAliveTimeout * 2,
      connections: config.maxConnections,
      requestTls: Object.keys(tlsOptions).length > 0 ? tlsOptions : undefined,
    };

    dispatcher = new ProxyAgent(proxyOpts);
  } else {
    const agentOpts: Record<string, unknown> = {
      keepAliveTimeout: config.keepAliveTimeout,
      keepAliveMaxTimeout: config.keepAliveTimeout * 2,
      connections: config.maxConnections,
    };

    // Add TLS options
    if (Object.keys(tlsOptions).length > 0) {
      agentOpts.connect = tlsOptions;
    }

    dispatcher = new Agent(agentOpts);
  }

  return {
    ...config,
    dispatcher,
  };
}

/**
 * Creates a client configuration with an external dispatcher.
 * Useful for integrating with fetch-proxy-dispatcher or custom agents.
 *
 * @param options - Client configuration options
 * @param dispatcher - External undici dispatcher (Agent, ProxyAgent, etc.)
 * @returns Configured client object
 *
 * @example
 * ```typescript
 * // With external dispatcher
 * import { ProxyAgent } from 'undici';
 *
 * const customAgent = new ProxyAgent({ uri: 'http://proxy:8080' });
 * const client = createClientWithDispatcher({}, customAgent);
 * ```
 */
export function createClientWithDispatcher(
  options: Omit<ClientOptions, 'proxy' | 'cert' | 'caBundle'> = {},
  dispatcher: Dispatcher
): ClientConfig {
  const apiKey = getApiKey(options.apiKey);

  if (!apiKey) {
    throw new Error(
      'API key required. Pass apiKey option or set GEMINI_API_KEY environment variable.'
    );
  }

  return {
    apiKey,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
    proxy: null,
    cert: null,
    caBundle: null,
    customHeaders: options.customHeaders || {},
    timeout: options.timeout || DEFAULT_TIMEOUT,
    keepAliveTimeout: options.keepAliveTimeout || DEFAULT_KEEP_ALIVE_TIMEOUT,
    maxConnections: options.maxConnections || DEFAULT_MAX_CONNECTIONS,
    dispatcher,
  };
}

/**
 * Closes the client dispatcher to release resources.
 *
 * @param client - Client configuration with dispatcher
 */
export async function closeClient(client: ClientConfig): Promise<void> {
  if (client.dispatcher && typeof (client.dispatcher as Agent).close === 'function') {
    await (client.dispatcher as Agent).close();
  }
}

export default createClient;
