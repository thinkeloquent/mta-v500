import { AnthropicProvider } from './anthropic';
import { FastifyBackendProvider } from './fastify-backend';
import { OpenAIProvider } from './openai';
import type { LLMProvider } from './types';

export type ProviderType = 'openai' | 'anthropic' | 'fastify';

export interface CreateProviderOptions {
  provider: ProviderType;
  apiKey?: string;
  baseURL?: string;
  model: string;
}

/**
 * Factory function to create an LLM provider instance
 */
export function createProvider(options: CreateProviderOptions): LLMProvider {
  switch (options.provider) {
    case 'openai':
      return new OpenAIProvider({
        apiKey: options.apiKey || '',
        model: options.model,
      });
    case 'anthropic':
      return new AnthropicProvider({
        apiKey: options.apiKey || '',
        model: options.model,
      });
    case 'fastify':
      return new FastifyBackendProvider({
        baseURL: options.baseURL || '',
        model: options.model,
      });
    default:
      throw new Error(`Unsupported provider: ${options.provider}`);
  }
}
