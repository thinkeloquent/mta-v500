/**
 * Gemini OpenAI-Compatible REST API Client - Streaming Example
 * Single-file implementation using Node.js 23+ undici
 *
 * Features:
 * - Server-Sent Events (SSE) streaming support
 * - Proxy support (optional)
 * - Certificate/CA bundle support (optional)
 * - Keep-alive with configurable connections
 * - Custom headers
 * - Full OpenAI-compatible chat completion parameters
 * - User-friendly JSON output with metadata
 *
 * Based on: https://ai.google.dev/gemini-api/docs/openai#rest
 */

import { request, Agent, ProxyAgent } from "undici";
import { readFileSync } from "node:fs";

// Default configuration
const DEFAULT_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai";
const DEFAULT_MODEL = "gemini-2.0-flash";
const DEFAULT_TIMEOUT = 60000; // 60 seconds for streaming
const DEFAULT_KEEP_ALIVE_TIMEOUT = 5000; // 5 seconds
const DEFAULT_MAX_CONNECTIONS = 10;

/**
 * Creates a client configuration object with undici dispatcher
 * @param {Object} options - Client configuration
 * @param {string} [options.apiKey] - API key (defaults to GEMINI_API_KEY env)
 * @param {string} [options.baseUrl] - Base URL for API
 * @param {string} [options.proxy] - Proxy URL (e.g., "http://proxy:8080")
 * @param {string} [options.cert] - Path to client certificate file
 * @param {string} [options.caBundle] - Path to CA bundle file
 * @param {Object} [options.customHeaders] - Additional headers
 * @param {number} [options.timeout] - Request timeout in ms
 * @param {number} [options.keepAliveTimeout] - Keep-alive timeout in ms
 * @param {number} [options.maxConnections] - Maximum number of connections
 * @returns {Object} Client configuration
 */
export function createClient(options = {}) {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "API key required. Pass apiKey option or set GEMINI_API_KEY environment variable."
    );
  }

  const config = {
    apiKey,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
    proxy: options.proxy || null,
    cert: options.cert || null,
    caBundle: options.caBundle || null,
    customHeaders: options.customHeaders || {},
    timeout: options.timeout || DEFAULT_TIMEOUT,
    keepAliveTimeout: options.keepAliveTimeout || DEFAULT_KEEP_ALIVE_TIMEOUT,
    maxConnections: options.maxConnections || DEFAULT_MAX_CONNECTIONS,
  };

  // Build TLS options if cert or CA bundle provided
  const tlsOptions = {};
  if (config.cert) {
    tlsOptions.cert = readFileSync(config.cert);
  }
  if (config.caBundle) {
    tlsOptions.ca = readFileSync(config.caBundle);
  }

  // Create dispatcher based on proxy configuration
  if (config.proxy) {
    const proxyOpts = {
      uri: config.proxy,
      keepAliveTimeout: config.keepAliveTimeout,
      keepAliveMaxTimeout: config.keepAliveTimeout * 2,
      connections: config.maxConnections,
    };

    // Add TLS options for connections through proxy
    if (Object.keys(tlsOptions).length > 0) {
      proxyOpts.requestTls = tlsOptions;
    }

    config.dispatcher = new ProxyAgent(proxyOpts);
  } else {
    const agentOpts = {
      keepAliveTimeout: config.keepAliveTimeout,
      keepAliveMaxTimeout: config.keepAliveTimeout * 2,
      connections: config.maxConnections,
    };

    // Add TLS options
    if (Object.keys(tlsOptions).length > 0) {
      agentOpts.connect = tlsOptions;
    }

    config.dispatcher = new Agent(agentOpts);
  }

  return config;
}

/**
 * Parses SSE data from a chunk
 * @param {string} chunk - Raw SSE chunk
 * @returns {Array<Object>} Array of parsed data objects
 */
function parseSSEChunk(chunk) {
  const events = [];
  const lines = chunk.split("\n");

  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const data = line.slice(6).trim();
      if (data === "[DONE]") {
        events.push({ done: true });
      } else if (data) {
        try {
          events.push(JSON.parse(data));
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }

  return events;
}

/**
 * Performs a streaming chat completion request
 * @param {Object} client - Client from createClient()
 * @param {Object} options - Request options
 * @param {Array} options.messages - Array of {role, content} message objects
 * @param {string} [options.model] - Model to use
 * @param {number} [options.temperature] - Sampling temperature (0-2)
 * @param {number} [options.maxTokens] - Maximum tokens to generate
 * @param {number} [options.topP] - Nucleus sampling parameter
 * @param {number} [options.n] - Number of completions to generate
 * @param {string|Array} [options.stop] - Stop sequence(s)
 * @param {...any} kwargs - Additional parameters passed to the API
 * @returns {AsyncGenerator<Object>} Async generator yielding stream chunks
 */
export async function* chatCompletionStream(client, options) {
  const {
    messages,
    model = DEFAULT_MODEL,
    temperature,
    maxTokens,
    topP,
    n,
    stop,
    ...kwargs
  } = options;

  if (!messages || !Array.isArray(messages)) {
    throw new Error("messages is required and must be an array");
  }

  const url = `${client.baseUrl}/chat/completions`;

  // Build request body with stream: true
  const body = {
    model,
    messages,
    stream: true,
    ...kwargs,
  };

  if (temperature !== undefined) body.temperature = temperature;
  if (maxTokens !== undefined) body.max_tokens = maxTokens;
  if (topP !== undefined) body.top_p = topP;
  if (n !== undefined) body.n = n;
  if (stop !== undefined) body.stop = stop;

  // Build headers
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${client.apiKey}`,
    Accept: "text/event-stream",
    ...client.customHeaders,
  };

  // Execute request using undici
  const { statusCode, body: responseBody } = await request(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    dispatcher: client.dispatcher,
    headersTimeout: client.timeout,
    bodyTimeout: client.timeout,
  });

  if (statusCode < 200 || statusCode >= 300) {
    const errorText = await responseBody.text();
    throw new Error(`API error (${statusCode}): ${errorText}`);
  }

  // Process SSE stream
  let buffer = "";
  const decoder = new TextDecoder();

  for await (const chunk of responseBody) {
    buffer += decoder.decode(chunk, { stream: true });

    // Process complete lines
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const events = parseSSEChunk(line);
      for (const event of events) {
        yield event;
      }
    }
  }

  // Process any remaining buffer
  if (buffer.trim()) {
    const events = parseSSEChunk(buffer);
    for (const event of events) {
      yield event;
    }
  }
}

/**
 * Collects streamed response and returns aggregated result
 * @param {Object} client - Client from createClient()
 * @param {Object} options - Request options (same as chatCompletionStream)
 * @returns {Promise<Object>} Aggregated response with full content and metadata
 */
export async function chatCompletionStreamCollect(client, options) {
  const chunks = [];
  let fullContent = "";
  let metadata = {
    id: null,
    model: null,
    created: null,
    finishReason: null,
    usage: null,
  };

  for await (const chunk of chatCompletionStream(client, options)) {
    if (chunk.done) {
      break;
    }

    chunks.push(chunk);

    // Extract metadata from first chunk
    if (!metadata.id && chunk.id) {
      metadata.id = chunk.id;
      metadata.model = chunk.model;
      metadata.created = chunk.created;
    }

    // Collect content deltas
    if (chunk.choices?.[0]?.delta?.content) {
      fullContent += chunk.choices[0].delta.content;
    }

    // Capture finish reason
    if (chunk.choices?.[0]?.finish_reason) {
      metadata.finishReason = chunk.choices[0].finish_reason;
    }

    // Capture usage if present (usually in final chunk)
    if (chunk.usage) {
      metadata.usage = chunk.usage;
    }
  }

  return {
    content: fullContent,
    metadata,
    chunks,
  };
}

/**
 * Formats and prints streaming response in a user-friendly way
 * @param {string} question - The original question asked
 * @param {Object} result - The aggregated result from chatCompletionStreamCollect
 * @param {Object} requestOptions - The request options used
 */
function formatOutput(question, result, requestOptions = {}) {
  const separator = "=".repeat(60);
  const thinSeparator = "-".repeat(60);

  console.log("\n" + separator);
  console.log("  GEMINI STREAMING CHAT COMPLETION");
  console.log(separator);

  // Print the question for context
  console.log("\n[QUESTION]");
  console.log(thinSeparator);
  console.log(question);

  // Print request parameters
  console.log("\n[REQUEST PARAMS]");
  console.log(thinSeparator);
  const params = {
    model: requestOptions.model || DEFAULT_MODEL,
    stream: true,
  };
  if (requestOptions.temperature !== undefined)
    params.temperature = requestOptions.temperature;
  if (requestOptions.maxTokens !== undefined)
    params.max_tokens = requestOptions.maxTokens;
  if (requestOptions.topP !== undefined) params.top_p = requestOptions.topP;
  console.log(JSON.stringify(params, null, 2));

  // Print the response content
  console.log("\n[RESPONSE]");
  console.log(thinSeparator);
  console.log(result.content);

  // Print metadata
  console.log("\n[METADATA]");
  console.log(thinSeparator);
  const metadata = {
    id: result.metadata.id || "N/A",
    model: result.metadata.model || "N/A",
    created: result.metadata.created
      ? new Date(result.metadata.created * 1000).toISOString()
      : "N/A",
    finish_reason: result.metadata.finishReason || "N/A",
    total_chunks: result.chunks.length,
  };
  console.log(JSON.stringify(metadata, null, 2));

  // Print usage statistics
  if (result.metadata.usage) {
    console.log("\n[USAGE]");
    console.log(thinSeparator);
    console.log(JSON.stringify(result.metadata.usage, null, 2));
  }

  console.log("\n" + separator + "\n");
}

/**
 * Logs progress messages to the user
 * @param {string} stage - Current stage name
 * @param {string} [message] - Optional message
 */
function logProgress(stage, message = "") {
  const timestamp = new Date().toISOString().split("T")[1].slice(0, -1);
  const prefix = `[${timestamp}]`;
  console.log(`${prefix} [${stage}] ${message}`);
}

/**
 * Main execution - demonstrates the streaming API client
 */
async function main() {
  logProgress("INIT", "Starting Gemini Streaming API Client...");

  // Create client with configuration
  logProgress("CLIENT", "Creating client configuration...");
  const client = createClient({
    // apiKey: "your-api-key",           // Or use GEMINI_API_KEY env
    // baseUrl: "custom-url",             // Override base URL
    // proxy: "http://proxy:8080",        // Proxy server
    // cert: "/path/to/cert.pem",         // Client certificate
    // caBundle: "/path/to/ca.pem",       // CA bundle
    // customHeaders: { "X-Custom": "value" },
    // timeout: 60000,                    // 60 second timeout
    // keepAliveTimeout: 10000,           // Keep-alive timeout
    // maxConnections: 20,                // Max connections
  });
  logProgress("CLIENT", "Client created successfully");

  const question = "Explain to me how AI works";

  const requestOptions = {
    messages: [{ role: "user", content: question }],
    model: "gemini-2.0-flash",
    // temperature: 0.7,
    // maxTokens: 1000,
    // topP: 0.9,
    // n: 1,
    // stop: ["\n\n"],
  };

  logProgress("REQUEST", `Preparing streaming request to ${client.baseUrl}...`);
  logProgress("REQUEST", `Model: ${requestOptions.model}`);
  logProgress("REQUEST", `Question: "${question}"`);

  try {
    logProgress("STREAM", "Initiating streaming connection...");

    // Option 1: Stream with real-time output
    console.log("\n--- Streaming Response ---\n");
    let streamedContent = "";
    let streamMetadata = {
      id: null,
      model: null,
      created: null,
      finishReason: null,
      usage: null,
    };
    let chunkCount = 0;

    for await (const chunk of chatCompletionStream(client, requestOptions)) {
      if (chunk.done) {
        logProgress("STREAM", "Stream completed [DONE]");
        break;
      }

      chunkCount++;

      // Extract metadata from first chunk
      if (!streamMetadata.id && chunk.id) {
        streamMetadata.id = chunk.id;
        streamMetadata.model = chunk.model;
        streamMetadata.created = chunk.created;
        logProgress("STREAM", `Connected - ID: ${chunk.id}`);
      }

      // Output content as it arrives
      if (chunk.choices?.[0]?.delta?.content) {
        const content = chunk.choices[0].delta.content;
        streamedContent += content;
        process.stdout.write(content);
      }

      // Capture finish reason
      if (chunk.choices?.[0]?.finish_reason) {
        streamMetadata.finishReason = chunk.choices[0].finish_reason;
      }

      // Capture usage if present
      if (chunk.usage) {
        streamMetadata.usage = chunk.usage;
      }
    }

    console.log("\n\n--- End Stream ---\n");

    logProgress("FORMAT", "Formatting output...");

    // Print formatted output
    const result = {
      content: streamedContent,
      metadata: streamMetadata,
      chunks: { length: chunkCount },
    };

    // Create mock result for formatOutput
    const formattedResult = {
      content: streamedContent,
      metadata: streamMetadata,
      chunks: Array(chunkCount).fill({}),
    };

    formatOutput(question, formattedResult, requestOptions);

    logProgress("COMPLETE", "Streaming request completed successfully");
  } catch (error) {
    logProgress("ERROR", `Request failed: ${error.message}`);
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

// Run if executed directly
main();
