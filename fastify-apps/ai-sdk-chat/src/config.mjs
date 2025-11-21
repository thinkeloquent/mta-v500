/**
 * AI SDK Chat - Centralized Configuration
 *
 * This module provides centralized access to all configuration values,
 * handling both static defaults and environment variable overrides.
 *
 * Configuration Priority (highest to lowest):
 * 1. Per-request headers (X-AI-Model)
 * 2. Environment variables
 * 3. Static defaults
 */

// =============================================================================
// Static Defaults
// =============================================================================

/**
 * Default model to use when no override is provided
 */
export const DEFAULT_MODEL = 'gpt-4o';

/**
 * Supported AI providers with their configurations
 */
export const PROVIDERS = {
  openai: {
    name: 'openai',
    baseURL: 'https://api.openai.com/v1',
    envKey: 'OPENAI_API_KEY',
    modelPrefixes: ['gpt-', 'o1-', 'text-'],
  },
  google: {
    name: 'google',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    envKey: 'GOOGLE_GENERATIVE_AI_API_KEY',
    modelPrefixes: ['gemini-'],
  },
  anthropic: {
    name: 'anthropic',
    baseURL: 'https://api.anthropic.com/v1',
    envKey: 'ANTHROPIC_API_KEY',
    modelPrefixes: ['claude-'],
  },
};

/**
 * Request header names
 */
export const HEADERS = {
  AI_MODEL: 'x-ai-model',
};

/**
 * Environment variable names
 */
export const ENV_KEYS = {
  DEFAULT_MODEL: 'APP_AI_INIT_CONFIG_DEFAULT_CHAT_MODEL',
  OPENAI_API_KEY: 'OPENAI_API_KEY',
  GOOGLE_API_KEY: 'GOOGLE_GENERATIVE_AI_API_KEY',
  ANTHROPIC_API_KEY: 'ANTHROPIC_API_KEY',
};

// =============================================================================
// Configuration Accessors
// =============================================================================

/**
 * Gets the API key for a specific provider from environment variables
 * @param {string} providerName - The provider name ('openai', 'google', 'anthropic')
 * @returns {string|undefined} The API key or undefined if not set
 */
export function getApiKey(providerName) {
  const provider = PROVIDERS[providerName];
  if (!provider) {
    return undefined;
  }
  return process.env[provider.envKey];
}

/**
 * Validates that the required API key exists for the selected provider
 * @param {string} providerName - The provider name ('openai', 'google', 'anthropic')
 * @throws {Error} If API key is missing
 */
export function validateApiKey(providerName) {
  const provider = PROVIDERS[providerName];
  if (!provider) {
    throw new Error(`Unknown provider: ${providerName}`);
  }

  const apiKey = process.env[provider.envKey];
  if (!apiKey) {
    throw new Error(
      `Missing API key: ${provider.envKey} environment variable is required for ${providerName} provider`,
    );
  }
}

/**
 * Gets the default model from environment or static default
 * @returns {string} The default model name
 */
export function getDefaultModel() {
  return process.env[ENV_KEYS.DEFAULT_MODEL] || DEFAULT_MODEL;
}

/**
 * Resolves the model name from a request
 * Priority: X-AI-Model header > Environment variable > Static default
 *
 * @param {object} request - Fastify request object
 * @returns {string} The resolved model name
 */
export function resolveModelFromRequest(request) {
  // Priority 1: Request header
  const headerModel = request.headers[HEADERS.AI_MODEL];
  if (headerModel) {
    return headerModel;
  }

  // Priority 2 & 3: Environment variable or static default
  return getDefaultModel();
}

/**
 * Determines which provider to use for a given model name
 * @param {string} modelName - The model identifier (e.g., 'gpt-4o', 'gemini-1.5-pro', 'claude-sonnet-4')
 * @returns {{ providerName: string, provider: object }} Provider name and configuration
 * @throws {Error} If model prefix is not recognized
 */
export function getProviderForModel(modelName) {
  const model = modelName.toLowerCase();

  for (const [providerName, provider] of Object.entries(PROVIDERS)) {
    for (const prefix of provider.modelPrefixes) {
      if (model.startsWith(prefix)) {
        return { providerName, provider };
      }
    }
  }

  const supportedPrefixes = Object.values(PROVIDERS)
    .flatMap((p) => p.modelPrefixes)
    .join(', ');

  throw new Error(`Unknown model: ${modelName}. Supported prefixes: ${supportedPrefixes}`);
}

/**
 * Gets all configuration as an object (useful for debugging/logging)
 * @returns {object} Current configuration state
 */
export function getConfig() {
  return {
    defaultModel: getDefaultModel(),
    providers: Object.fromEntries(
      Object.entries(PROVIDERS).map(([name, provider]) => [
        name,
        {
          ...provider,
          apiKeyConfigured: !!process.env[provider.envKey],
        },
      ]),
    ),
    headers: HEADERS,
    envKeys: ENV_KEYS,
  };
}

/**
 * Logs the current configuration (with sensitive data masked)
 * @param {object} logger - Logger instance (e.g., fastify.log)
 */
export function logConfig(logger) {
  const config = getConfig();
  logger.info(
    {
      defaultModel: config.defaultModel,
      providers: Object.fromEntries(
        Object.entries(config.providers).map(([name, p]) => [
          name,
          { apiKeyConfigured: p.apiKeyConfigured },
        ]),
      ),
    },
    'AI SDK Chat configuration',
  );
}
