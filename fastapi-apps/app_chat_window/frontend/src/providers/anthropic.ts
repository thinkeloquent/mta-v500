import type { LLMProvider, Message, ProviderConfig } from './types';

export class AnthropicProvider implements LLMProvider {
  private apiKey: string;
  private model: string;
  private baseURL = 'https://api.anthropic.com/v1';

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  async sendMessage(messages: Message[], onChunk: (text: string) => void): Promise<void> {
    const response = await fetch(`${this.baseURL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    // Parse Server-Sent Events stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          try {
            const json = JSON.parse(data);

            // Handle content block delta events
            if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
              const text = json.delta.text;
              if (text) {
                onChunk(text);
              }
            }
          } catch (e) {
            // Skip invalid JSON
            console.warn('Failed to parse Anthropic chunk:', e);
          }
        }
      }
    }
  }
}
