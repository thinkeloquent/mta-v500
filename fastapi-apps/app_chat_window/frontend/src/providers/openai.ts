import type { LLMProvider, Message, ProviderConfig } from './types';

export class OpenAIProvider implements LLMProvider {
  private apiKey: string;
  private model: string;
  private baseURL = 'https://api.openai.com/v1';

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  async sendMessage(messages: Message[], onChunk: (text: string) => void): Promise<void> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
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
          if (data === '[DONE]') continue;

          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              onChunk(content);
            }
          } catch (e) {
            // Skip invalid JSON
            console.warn('Failed to parse OpenAI chunk:', e);
          }
        }
      }
    }
  }
}
