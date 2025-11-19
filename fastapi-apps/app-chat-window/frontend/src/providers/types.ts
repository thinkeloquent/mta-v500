export type Message = {
  role: 'assistant' | 'user';
  content: string;
};

export interface LLMProvider {
  /**
   * Send messages to the LLM and receive streaming response
   * @param messages - Array of conversation messages
   * @param onChunk - Callback function called for each text chunk received
   */
  sendMessage(messages: Message[], onChunk: (text: string) => void): Promise<void>;
}

export interface ProviderConfig {
  apiKey: string;
  model: string;
}
