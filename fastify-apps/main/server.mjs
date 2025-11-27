/**
 * Main Server Entry Point (Auto-starter)
 *
 * This file serves as the main entry point for starting the server.
 * It uses launch.mjs for all initialization and startup logic.
 *
 * For custom server configurations or extensions, import from launch.mjs:
 *
 *   import { createMainServer, startServer } from './launch.mjs';
 *
 *   const { fastify, config, databaseUrl } = await createMainServer();
 *   // Add custom plugins, routes, etc.
 *   await startServer(fastify);
 *
 * Or use initializeServer for full initialization with customization:
 *
 *   import { initializeServer, startServer } from './launch.mjs';
 *
 *   const { fastify } = await initializeServer({
 *     skipExternalApps: true,  // Skip loading from config
 *   });
 *   // Add custom logic
 *   await startServer(fastify);
 */

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { bootstrap } from './launch.mjs';
import { settings } from './config.mjs';

// =============================================================================
// Model Configuration
// =============================================================================

const DEFAULT_MODEL = settings.AI_DEFAULT_MODEL;

const PROVIDERS = {
  openai: {
    name: 'openai',
    baseURL: settings.OPENAI_BASE_URL,
    envKey: 'OPENAI_API_KEY',
    modelPrefixes: ['gpt-', 'o1-', 'text-'],
  },
  google: {
    name: 'google',
    baseURL: settings.GOOGLE_BASE_URL,
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
    // Use settings for API keys
    const apiKey = config.envKey === 'OPENAI_API_KEY'
      ? settings.OPENAI_API_KEY
      : settings.GEMINI_API_KEY;
    providerInstances[providerName] = createOpenAICompatible({
      name: config.name,
      baseURL: config.baseURL,
      apiKey,
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
  // Default to google if no prefix matches
  return 'google';
}

// =============================================================================
// Model Resolver
// =============================================================================

/**
 * Resolves the AI model for a request.
 * Checks X-AI-Model header for model override, otherwise uses default.
 *
 * @param {object} request - Fastify request object
 * @returns {object} AI SDK model instance
 */
const getModelForRequest = (request) => {
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
// =============================================================================

const appOptions = {
  // Auth service options
  authService: {
    // tokenSecret: process.env.AUTH_TOKEN_SECRET,
    // tokenExpiry: 3600,
  },

  // User service options
  userService: {
    // requireAuth: true,
  },

  // AI SDK Chat options
  aiSdkChat: {
    getModelForRequest,
  },

  // Google Gemini OpenAI Chat Completions options
  googleGeminiOpenaiChatCompletions: {
    // model: 'gemini-2.0-flash',  // Default model (optional)
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
