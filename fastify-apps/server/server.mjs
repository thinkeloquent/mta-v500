/**
 * Server Entry Point
 *
 * This file serves as the main entry point for starting the server.
 * Model configuration is handled here via getModelForRequest.
 */

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

const appOptions = {
  authService: {},
  userService: {},
  aiSdkChat: {
    getModelForRequest,
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
