/**
 * @internal/google-gemini-openai-client - Type definitions
 * TypeScript interfaces for the Gemini OpenAI-compatible API
 */

import type { Agent, ProxyAgent, Dispatcher } from 'undici';

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Client configuration options
 */
export interface ClientOptions {
  /** API key (defaults to GEMINI_API_KEY env) */
  apiKey?: string;
  /** Base URL for API */
  baseUrl?: string;
  /** Proxy URL (e.g., "http://proxy:8080") */
  proxy?: string;
  /** Path to client certificate file */
  cert?: string;
  /** Path to CA bundle file */
  caBundle?: string;
  /** Additional headers */
  customHeaders?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Keep-alive timeout in milliseconds */
  keepAliveTimeout?: number;
  /** Maximum number of connections */
  maxConnections?: number;
}

/**
 * Configured client object returned by createClient
 */
export interface ClientConfig {
  apiKey: string;
  baseUrl: string;
  proxy: string | null;
  cert: string | null;
  caBundle: string | null;
  customHeaders: Record<string, string>;
  timeout: number;
  keepAliveTimeout: number;
  maxConnections: number;
  dispatcher: Agent | ProxyAgent | Dispatcher;
}

// =============================================================================
// Chat Message Types
// =============================================================================

/**
 * Role in a chat conversation
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'function' | 'tool';

/**
 * A single chat message
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
  name?: string;
}

// =============================================================================
// Request Types
// =============================================================================

/**
 * Response format type for structured output
 */
export type ResponseFormatType = 'text' | 'json_object' | 'json_schema';

/**
 * JSON schema definition for structured output
 */
export interface JsonSchema {
  name: string;
  description?: string;
  schema: Record<string, unknown>;
  strict?: boolean;
}

/**
 * Response format configuration
 */
export interface ResponseFormat {
  type: ResponseFormatType;
  json_schema?: JsonSchema;
}

/**
 * Chat completion request options
 */
export interface ChatCompletionOptions {
  /** Array of messages in the conversation */
  messages: ChatMessage[];
  /** Model to use (default: gemini-2.0-flash) */
  model?: string;
  /** Sampling temperature (0-2) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Nucleus sampling parameter */
  topP?: number;
  /** Number of completions to generate */
  n?: number;
  /** Stop sequence(s) */
  stop?: string | string[];
  /** Response format for structured output */
  responseFormat?: ResponseFormat;
  /** Additional parameters */
  [key: string]: unknown;
}

// =============================================================================
// Response Types
// =============================================================================

/**
 * Message in a completion choice
 */
export interface ResponseMessage {
  role: string;
  content: string;
}

/**
 * A single completion choice
 */
export interface Choice {
  index: number;
  message: ResponseMessage;
  finish_reason: string | null;
}

/**
 * Token usage statistics
 */
export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/**
 * Chat completion response
 */
export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Choice[];
  usage: Usage | null;
}

// =============================================================================
// Structured Output Types
// =============================================================================

/**
 * Schema definition for structured output parsing
 */
export interface StructuredOutputSchema<T = unknown> {
  name: string;
  description?: string;
  schema: Record<string, unknown>;
  strict?: boolean;
  /** TypeScript type hint (runtime ignored, useful for type inference) */
  _type?: T;
}

/**
 * Result of structured output parsing
 */
export interface StructuredOutputResult<T = unknown> {
  success: boolean;
  data: T | null;
  raw: string;
  error?: string;
}

// =============================================================================
// Constants (re-exported from config for backward compatibility)
// =============================================================================

export {
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  DEFAULT_TIMEOUT,
  DEFAULT_KEEP_ALIVE_TIMEOUT,
  DEFAULT_MAX_CONNECTIONS,
} from './config.mjs';
