import { API_BASE } from '../api';

export interface ChatMessage {
  role: string;
  content: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  finish_reason?: string;
  usage?: Record<string, number>;
}

export interface StructuredChatResponse {
  success: boolean;
  data?: Record<string, unknown>;
  raw: string;
  error?: string;
  model: string;
  usage?: Record<string, number>;
}

export interface SchemaDefinition {
  name: string;
  properties: Record<string, unknown>;
  required?: string[];
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

/**
 * Send a chat message to Gemini and get a response
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, ...options }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Chat API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Send a structured chat message with JSON schema constraints
 */
export async function sendStructuredChat(
  messages: ChatMessage[],
  schema: SchemaDefinition,
  options: ChatOptions = {}
): Promise<StructuredChatResponse> {
  const response = await fetch(`${API_BASE}/chat/structured`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      schema_name: schema.name,
      schema_properties: schema.properties,
      schema_required: schema.required,
      ...options,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Structured chat API error (${response.status}): ${errorText}`);
  }

  return response.json();
}
