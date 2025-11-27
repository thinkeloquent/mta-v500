/**
 * @internal/google-gemini-openai-client - Chat completion API
 * Provides chat completion functionality with structured output support
 */

import { request } from 'undici';
import type {
  ClientConfig,
  ChatCompletionOptions,
  ChatCompletionResponse,
  Choice,
  Usage,
  ResponseMessage,
  StructuredOutputSchema,
  StructuredOutputResult,
  ResponseFormat,
} from './models.mjs';
import { DEFAULT_MODEL } from './models.mjs';

/**
 * Performs a chat completion request.
 *
 * @param client - Client configuration from createClient()
 * @param options - Chat completion options
 * @returns Chat completion response
 * @throws Error on API errors or invalid input
 *
 * @example
 * ```typescript
 * const response = await chatCompletion(client, {
 *   messages: [{ role: 'user', content: 'Hello!' }],
 *   model: 'gemini-2.0-flash',
 *   temperature: 0.7,
 * });
 * console.log(response.choices[0].message.content);
 * ```
 */
export async function chatCompletion(
  client: ClientConfig,
  options: ChatCompletionOptions
): Promise<ChatCompletionResponse> {
  const {
    messages,
    model = DEFAULT_MODEL,
    temperature,
    maxTokens,
    topP,
    n,
    stop,
    responseFormat,
    ...kwargs
  } = options;

  if (!messages || !Array.isArray(messages)) {
    throw new Error('messages is required and must be an array');
  }

  const url = `${client.baseUrl}/chat/completions`;

  // Build request body
  const body: Record<string, unknown> = {
    model,
    messages,
    ...kwargs,
  };

  if (temperature !== undefined) body.temperature = temperature;
  if (maxTokens !== undefined) body.max_tokens = maxTokens;
  if (topP !== undefined) body.top_p = topP;
  if (n !== undefined) body.n = n;
  if (stop !== undefined) body.stop = stop;
  if (responseFormat !== undefined) body.response_format = responseFormat;

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${client.apiKey}`,
    ...client.customHeaders,
  };

  // Execute request using undici
  const { statusCode, body: responseBody } = await request(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    dispatcher: client.dispatcher,
    headersTimeout: client.timeout,
    bodyTimeout: client.timeout,
  });

  const responseText = await responseBody.text();

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`API error (${statusCode}): ${responseText}`);
  }

  return JSON.parse(responseText) as ChatCompletionResponse;
}

/**
 * Performs a chat completion request with structured JSON output.
 *
 * @param client - Client configuration from createClient()
 * @param options - Chat completion options (responseFormat will be set automatically)
 * @param schema - JSON schema for structured output
 * @returns Chat completion response with structured content
 *
 * @example
 * ```typescript
 * const schema = {
 *   name: 'person_info',
 *   schema: {
 *     type: 'object',
 *     properties: {
 *       name: { type: 'string' },
 *       age: { type: 'number' },
 *     },
 *     required: ['name', 'age'],
 *   },
 * };
 *
 * const response = await chatCompletionStructured(client, {
 *   messages: [{ role: 'user', content: 'Extract: John is 30 years old' }],
 * }, schema);
 * ```
 */
export async function chatCompletionStructured<T = unknown>(
  client: ClientConfig,
  options: Omit<ChatCompletionOptions, 'responseFormat'>,
  schema: StructuredOutputSchema<T>
): Promise<ChatCompletionResponse> {
  const responseFormat: ResponseFormat = {
    type: 'json_schema',
    json_schema: {
      name: schema.name,
      description: schema.description,
      schema: schema.schema,
      strict: schema.strict ?? true,
    },
  };

  return chatCompletion(client, {
    ...options,
    responseFormat,
  } as ChatCompletionOptions);
}

/**
 * Parses structured output from a chat completion response.
 *
 * @param response - Chat completion response
 * @returns Parsed structured output result
 *
 * @example
 * ```typescript
 * const response = await chatCompletionStructured(client, options, schema);
 * const result = parseStructuredOutput<PersonInfo>(response);
 *
 * if (result.success) {
 *   console.log(result.data.name, result.data.age);
 * } else {
 *   console.error('Parse error:', result.error);
 * }
 * ```
 */
export function parseStructuredOutput<T = unknown>(
  response: ChatCompletionResponse
): StructuredOutputResult<T> {
  const raw = response.choices?.[0]?.message?.content ?? '';

  if (!raw) {
    return {
      success: false,
      data: null,
      raw,
      error: 'No content in response',
    };
  }

  try {
    const data = JSON.parse(raw) as T;
    return {
      success: true,
      data,
      raw,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      raw,
      error: error instanceof Error ? error.message : 'JSON parse error',
    };
  }
}

/**
 * Extracts the text content from a chat completion response.
 *
 * @param response - Chat completion response
 * @returns The text content of the first choice, or empty string
 */
export function extractContent(response: ChatCompletionResponse): string {
  return response.choices?.[0]?.message?.content ?? '';
}

/**
 * Extracts all choice contents from a chat completion response.
 *
 * @param response - Chat completion response
 * @returns Array of text contents from all choices
 */
export function extractAllContents(response: ChatCompletionResponse): string[] {
  return response.choices?.map((choice) => choice.message?.content ?? '') ?? [];
}

export default chatCompletion;
