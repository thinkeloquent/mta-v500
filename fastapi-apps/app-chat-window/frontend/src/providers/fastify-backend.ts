import type { LLMProvider, Message } from './types';

export interface FastifyBackendProviderConfig {
  baseURL: string;
  model: string;
}

export class FastifyBackendProvider implements LLMProvider {
  private baseURL: string;
  private model: string;

  constructor(config: FastifyBackendProviderConfig) {
    this.baseURL = config.baseURL;
    this.model = config.model;
  }

  async sendMessage(messages: Message[], onChunk: (text: string) => void): Promise<void> {
    const response = await fetch(`${this.baseURL}/api/ai-sdk-examples/stream-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AI-Model': this.model,
      },
      body: JSON.stringify({
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Fastify API error: ${response.status} - ${error}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    // Parse text stream directly (simpler than SSE)
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      if (text) {
        onChunk(text);
      }
    }
  }
}
