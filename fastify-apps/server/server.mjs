/**
 * Server Entry Point
 *
 * This file serves as the main entry point for starting the server.
 * Model configuration is handled here via getModelForRequest.
 */

// =============================================================================
// Secret Loading (must be at top before other imports that use env vars)
// =============================================================================
import { existsSync } from 'node:fs';

// Load secrets from ENV_SECRET_FILE if it exists
if (process.env.ENV_SECRET_FILE && existsSync(process.env.ENV_SECRET_FILE)) {
  const dotenv = await import('dotenv');
  dotenv.config({ path: process.env.ENV_SECRET_FILE });
}

// Hydrate vault secrets
import { createVaultSecretParser } from '@internal/vault-secret-hydrator';

const vaultParser = createVaultSecretParser();

// =============================================================================

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { bootstrap } from './index.mjs';

// =============================================================================
// Model Configuration
// =============================================================================

const DEFAULT_MODEL = 'gemini-2.0-flash-lite';

const PROVIDERS = {
  openai: {
    name: 'openai',
    baseURL: 'https://api.openai.com/v1',
    envKey: 'OPENAI_API_KEY',
    modelPrefixes: ['gpt-', 'o1-', 'text-'],
  },
  google: {
    name: 'google',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    envKey: 'GEMINI_API_KEY',
    modelPrefixes: ['gemini-'],
  },
};

// Lazily initialized provider instances
const providerInstances = {};

function getProviderInstance(providerName) {
  if (!providerInstances[providerName]) {
    const config = PROVIDERS[providerName];
    if (!config) {
      throw new Error(`Unknown provider: ${providerName}`);
    }
    providerInstances[providerName] = createOpenAICompatible({
      name: config.name,
      baseURL: config.baseURL,
      apiKey: process.env[config.envKey],
    });
  }
  return providerInstances[providerName];
}

function getProviderForModel(modelName) {
  const model = modelName.toLowerCase();
  for (const [providerName, provider] of Object.entries(PROVIDERS)) {
    for (const prefix of provider.modelPrefixes) {
      if (model.startsWith(prefix)) {
        return providerName;
      }
    }
  }
  throw new Error(`Unknown model: ${modelName}`);
}

// =============================================================================
// Model Resolver
// =============================================================================

const getModelForRequest = (request) => {
  // Check for model override in header
  const modelName = request.headers['x-ai-model'] || DEFAULT_MODEL;
  const providerName = getProviderForModel(modelName);
  const provider = getProviderInstance(providerName);
  return provider.chatModel(modelName);
};

// =============================================================================
// App Options Configuration
// =============================================================================
// These options are passed down to individual app plugins during registration.
// Each namespace corresponds to an app defined in getDefaultApps().
//
// Available namespaces:
//   - authService: Options for auth-service plugin
//   - userService: Options for user-service plugin
//   - aiSdkChat: Options for ai-sdk-chat plugin
//   - googleGeminiOpenaiChatCompletions: Options for Gemini chat plugin
// =============================================================================

/**
 * Example: Per-request API key resolver for Gemini
 *
 * API key precedence:
 * 1. X-GEMINI-OPENAI-API-KEY header (override)
 * 2. getApiKeyForRequest(request) function (per-request)
 * 3. GEMINI_API_KEY environment variable (permanent token)
 *
 * @param {object} request - Fastify request object
 * @returns {Promise<string>} API key for this request
 */
// const getGeminiApiKeyForRequest = async (request) => {
//   // Example: Get API key from user session
//   const userId = request.user?.id;
//   if (userId) {
//     return await getUserApiKey(userId);
//   }
//   // Fallback to default
//   return process.env.GEMINI_API_KEY;
// };

const appOptions = {
  authService: {},
  userService: {},
  aiSdkChat: {
    getModelForRequest,
  },
  // Google Gemini OpenAI Chat Completions options
  googleGeminiOpenaiChatCompletions: {
    // model: 'gemini-2.0-flash',  // Default model (optional)
    // getApiKeyForRequest: getGeminiApiKeyForRequest,  // Per-request API key resolver
  },
};

// Bootstrap and start the server
try {
  await bootstrap({
    internalAppsOptions: appOptions,
  });
} catch (error) {
  console.error('Failed to start server:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
}
