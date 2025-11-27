/**
 * @internal/google-gemini-openai-client - Utilities
 * Logging, formatting, and helper functions
 */

import type { ChatCompletionResponse, Usage } from './models.mjs';

// =============================================================================
// Logging Utilities
// =============================================================================

/**
 * Logs a progress message with timestamp and stage.
 *
 * @param stage - Current stage name (e.g., "INIT", "CLIENT", "API")
 * @param message - Optional descriptive message
 */
export function logProgress(stage: string, message: string = ''): void {
  const now = new Date();
  const timestamp = now.toISOString().substring(11, 23); // HH:mm:ss.SSS
  console.log(`[${timestamp}] [${stage}] ${message}`);
}

// =============================================================================
// Formatting Utilities
// =============================================================================

const SEPARATOR = '='.repeat(60);
const THIN_SEPARATOR = '-'.repeat(60);

/**
 * Formats and prints a chat completion response in a user-friendly way.
 *
 * @param question - The original question asked
 * @param response - The API response object
 */
export function formatOutput(question: string, response: ChatCompletionResponse): void {
  console.log(`\n${SEPARATOR}`);
  console.log('  GEMINI CHAT COMPLETION');
  console.log(SEPARATOR);

  // Print the question for context
  console.log('\n[QUESTION]');
  console.log(THIN_SEPARATOR);
  console.log(question);

  // Print the response content
  console.log('\n[RESPONSE]');
  console.log(THIN_SEPARATOR);
  if (response.choices && response.choices.length > 0) {
    console.log(response.choices[0].message.content);
  }

  // Print metadata
  console.log('\n[METADATA]');
  console.log(THIN_SEPARATOR);
  const metadata = {
    id: response.id || 'N/A',
    model: response.model || 'N/A',
    created: response.created
      ? new Date(response.created * 1000).toISOString()
      : 'N/A',
    finish_reason: response.choices?.[0]?.finish_reason || 'N/A',
  };
  console.log(JSON.stringify(metadata, null, 2));

  // Print usage statistics
  if (response.usage) {
    console.log('\n[USAGE]');
    console.log(THIN_SEPARATOR);
    console.log(JSON.stringify(response.usage, null, 2));
  }

  console.log(`\n${SEPARATOR}\n`);
}

/**
 * Formats usage statistics as a string.
 *
 * @param usage - Token usage statistics
 * @returns Formatted usage string
 */
export function formatUsage(usage: Usage | null): string {
  if (!usage) return 'N/A';
  return `Prompt: ${usage.prompt_tokens}, Completion: ${usage.completion_tokens}, Total: ${usage.total_tokens}`;
}

// =============================================================================
// Schema Utilities
// =============================================================================

/**
 * Creates a JSON schema definition for structured output.
 *
 * @param name - Schema name
 * @param properties - Object properties definition
 * @param required - Required property names
 * @param description - Optional schema description
 * @returns JSON schema object
 *
 * @example
 * ```typescript
 * const schema = createJsonSchema('user_info', {
 *   name: { type: 'string', description: 'User name' },
 *   age: { type: 'number', description: 'User age' },
 * }, ['name', 'age'], 'User information schema');
 * ```
 */
export function createJsonSchema(
  name: string,
  properties: Record<string, Record<string, unknown>>,
  required: string[] = [],
  description?: string
): {
  name: string;
  description?: string;
  schema: Record<string, unknown>;
  strict: boolean;
} {
  return {
    name,
    description,
    schema: {
      type: 'object',
      properties,
      required,
      additionalProperties: false,
    },
    strict: true,
  };
}

/**
 * Creates a simple JSON schema for a single value extraction.
 *
 * @param name - Schema name
 * @param propertyName - Name of the property to extract
 * @param propertyType - Type of the property ('string', 'number', 'boolean', etc.)
 * @param description - Optional property description
 * @returns JSON schema object
 */
export function createSimpleSchema(
  name: string,
  propertyName: string,
  propertyType: string,
  description?: string
): {
  name: string;
  schema: Record<string, unknown>;
  strict: boolean;
} {
  return {
    name,
    schema: {
      type: 'object',
      properties: {
        [propertyName]: {
          type: propertyType,
          description,
        },
      },
      required: [propertyName],
      additionalProperties: false,
    },
    strict: true,
  };
}

// =============================================================================
// Message Utilities
// =============================================================================

/**
 * Creates a system message.
 *
 * @param content - System message content
 * @returns Message object
 */
export function systemMessage(content: string) {
  return { role: 'system' as const, content };
}

/**
 * Creates a user message.
 *
 * @param content - User message content
 * @returns Message object
 */
export function userMessage(content: string) {
  return { role: 'user' as const, content };
}

/**
 * Creates an assistant message.
 *
 * @param content - Assistant message content
 * @returns Message object
 */
export function assistantMessage(content: string) {
  return { role: 'assistant' as const, content };
}

export default {
  logProgress,
  formatOutput,
  formatUsage,
  createJsonSchema,
  createSimpleSchema,
  systemMessage,
  userMessage,
  assistantMessage,
};
