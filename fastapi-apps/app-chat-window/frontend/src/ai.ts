import { createProvider } from './providers/factory';
import type { LLMProvider } from './providers/types';

export type Message = {
  role: 'assistant' | 'user';
  content: string;
};

// Get environment configuration
const SERVER_API_URL = import.meta.env.VITE_APP_CHAT_WINDOW_CONFIG_SERVER_API_URL || 'http://localhost:3000';
const AI_MODEL = import.meta.env.VITE_APP_CHAT_WINDOW_CONFIG_AI_MODEL || 'gpt-4o';

// Initialize provider
let provider: LLMProvider | null = null;

try {
  provider = createProvider({
    provider: 'fastify',
    baseURL: SERVER_API_URL,
    model: AI_MODEL,
  });
} catch (error) {
  console.error('Failed to initialize AI provider:', error);
}

/**
 * Send a message to the configured AI provider
 */
export async function sendMessage(
  messages: Message[],
  onChunk: (text: string) => void,
): Promise<void> {
  if (!provider) {
    throw new Error('AI provider not initialized. Check your API key configuration.');
  }

  return provider.sendMessage(messages, onChunk);
}

/**
 * Check if AI is configured
 */
export function isAIConfigured(): boolean {
  return provider !== null;
}

/**
 * Get the current AI provider name
 */
export function getAIProvider(): string {
  return 'fastify';
}
