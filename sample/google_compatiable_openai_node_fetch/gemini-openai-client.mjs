/**
 * OpenAI compatibility layer for Gemini API
 * Uses the OpenAI-compatible endpoint at generativelanguage.googleapis.com
 * @see https://ai.google.dev/gemini-api/docs/openai
 */

import { ProxyAgent } from "undici";

const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai";

/**
 * Creates a Gemini client configuration with OpenAI compatibility
 * @param {Object} options - Client configuration options
 * @param {string} [options.apiKey] - Gemini API key (defaults to GEMINI_API_KEY env var)
 * @param {string} [options.proxy] - Proxy URL (e.g., "http://my.proxy.example.com:8080")
 * @param {Object} [options.customHeaders] - Additional headers to include in requests
 * @param {string} [options.baseUrl] - Override the base URL
 * @returns {Object} Client configuration object
 */
export function createGeminiClient(options = {}) {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Gemini API key is required. Pass apiKey option or set GEMINI_API_KEY environment variable."
    );
  }

  return {
    apiKey,
    baseUrl: options.baseUrl || GEMINI_BASE_URL,
    proxy: options.proxy,
    customHeaders: options.customHeaders || {},
  };
}

/**
 * Performs a chat completion request using the Gemini OpenAI-compatible API
 * @param {Object} client - Client configuration from createGeminiClient
 * @param {Object} options - Chat completion options
 * @param {Array} options.messages - Array of message objects with role and content
 * @param {string} [options.model="gemini-2.0-flash"] - Model to use
 * @param {number} [options.temperature] - Sampling temperature
 * @param {number} [options.maxTokens] - Maximum tokens in response
 * @param {boolean} [options.stream=false] - Whether to stream the response
 * @returns {Promise<Object>} Chat completion response in OpenAI format
 */
export async function chatCompletion(client, options) {
  const {
    messages,
    model = "gemini-2.0-flash",
    temperature,
    maxTokens,
    stream = false,
    ...rest
  } = options;

  const url = `${client.baseUrl}/chat/completions`;

  const body = {
    model,
    messages,
    stream,
    ...rest,
  };

  if (temperature !== undefined) {
    body.temperature = temperature;
  }

  if (maxTokens !== undefined) {
    body.max_tokens = maxTokens;
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${client.apiKey}`,
    ...client.customHeaders,
  };

  const fetchOptions = {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  };

  // Add proxy support using undici's ProxyAgent
  if (client.proxy) {
    fetchOptions.dispatcher = new ProxyAgent(client.proxy);
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Gemini API error (${response.status}): ${errorBody}`
    );
  }

  if (stream) {
    return response.body;
  }

  return response.json();
}

/**
 * Lists available models from the Gemini API
 * @param {Object} client - Client configuration from createGeminiClient
 * @returns {Promise<Object>} Models list response
 */
export async function listModels(client) {
  const url = `${client.baseUrl}/models`;

  const headers = {
    Authorization: `Bearer ${client.apiKey}`,
    ...client.customHeaders,
  };

  const fetchOptions = {
    method: "GET",
    headers,
  };

  if (client.proxy) {
    fetchOptions.dispatcher = new ProxyAgent(client.proxy);
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Gemini API error (${response.status}): ${errorBody}`
    );
  }

  return response.json();
}

/**
 * Creates embeddings using the Gemini API
 * @param {Object} client - Client configuration from createGeminiClient
 * @param {Object} options - Embedding options
 * @param {string|Array<string>} options.input - Text to embed
 * @param {string} [options.model="text-embedding-004"] - Embedding model to use
 * @returns {Promise<Object>} Embeddings response in OpenAI format
 */
export async function createEmbedding(client, options) {
  const { input, model = "text-embedding-004" } = options;

  const url = `${client.baseUrl}/embeddings`;

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${client.apiKey}`,
    ...client.customHeaders,
  };

  const fetchOptions = {
    method: "POST",
    headers,
    body: JSON.stringify({ model, input }),
  };

  if (client.proxy) {
    fetchOptions.dispatcher = new ProxyAgent(client.proxy);
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Gemini API error (${response.status}): ${errorBody}`
    );
  }

  return response.json();
}

export default {
  createGeminiClient,
  chatCompletion,
  listModels,
  createEmbedding,
};
