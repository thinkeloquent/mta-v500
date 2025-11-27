/**
 * @internal/google-gemini-openai-client
 * Google Gemini OpenAI-compatible REST API client
 * Pure ESM module with proxy and structured output support
 */

// Client
export {
  createClient,
  createClientWithDispatcher,
  closeClient,
  default as client,
} from './client.mjs';

// Chat
export {
  chatCompletion,
  chatCompletionStructured,
  parseStructuredOutput,
  extractContent,
  extractAllContents,
  default as chat,
} from './chat.mjs';
export type { ChatCompletionExtendedOptions } from './chat.mjs';

// Utils
export {
  logProgress,
  formatOutput,
  formatUsage,
  createJsonSchema,
  createSimpleSchema,
  systemMessage,
  userMessage,
  assistantMessage,
  default as utils,
} from './utils.mjs';

// Models/Types
export type {
  ApiKeyResolver,
  ClientOptions,
  ClientConfig,
  MessageRole,
  ChatMessage,
  ResponseFormatType,
  JsonSchema,
  ResponseFormat,
  ChatCompletionOptions,
  ResponseMessage,
  Choice,
  Usage,
  ChatCompletionResponse,
  StructuredOutputSchema,
  StructuredOutputResult,
} from './models.mjs';

// Config
export {
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  DEFAULT_TIMEOUT,
  DEFAULT_KEEP_ALIVE_TIMEOUT,
  DEFAULT_MAX_CONNECTIONS,
  SEPARATOR,
  THIN_SEPARATOR,
  ENV_API_KEY,
  getApiKey,
} from './config.mjs';
