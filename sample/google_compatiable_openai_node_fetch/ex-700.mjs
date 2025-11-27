/**
 * Gemini OpenAI-Compatible REST API Client - Structured Output (JSON) Example
 * Single-file implementation using Node.js 23+ undici
 *
 * Features:
 * - Structured output with JSON schema (like Pydantic BaseModel)
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
const DEFAULT_TIMEOUT = 60000; // 60 seconds
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
 * Defines a JSON schema for structured output (similar to Pydantic BaseModel)
 * @param {string} name - Schema name
 * @param {Object} properties - Property definitions with type info
 * @param {Array<string>} [required] - Required property names (defaults to all)
 * @returns {Object} JSON schema definition
 */
export function defineSchema(name, properties, required = null) {
  const jsonSchema = {
    type: "object",
    properties: {},
    required: required || Object.keys(properties),
    additionalProperties: false,
  };

  for (const [key, value] of Object.entries(properties)) {
    if (typeof value === "string") {
      // Simple type definition: "string", "number", "boolean", "integer"
      jsonSchema.properties[key] = { type: value };
    } else if (Array.isArray(value)) {
      // Array type: ["string"] means array of strings
      jsonSchema.properties[key] = {
        type: "array",
        items: { type: value[0] },
      };
    } else if (typeof value === "object") {
      // Full property definition with type and other constraints
      jsonSchema.properties[key] = value;
    }
  }

  return {
    type: "json_schema",
    json_schema: {
      name,
      strict: true,
      schema: jsonSchema,
    },
  };
}

/**
 * Performs a structured chat completion request with JSON schema response
 * @param {Object} client - Client from createClient()
 * @param {Object} options - Request options
 * @param {Array} options.messages - Array of {role, content} message objects
 * @param {Object} options.responseFormat - JSON schema for response format
 * @param {string} [options.model] - Model to use
 * @param {number} [options.temperature] - Sampling temperature (0-2)
 * @param {number} [options.maxTokens] - Maximum tokens to generate
 * @param {number} [options.topP] - Nucleus sampling parameter
 * @param {number} [options.n] - Number of completions to generate
 * @param {string|Array} [options.stop] - Stop sequence(s)
 * @param {...any} kwargs - Additional parameters passed to the API
 * @returns {Promise<Object>} Chat completion response with parsed field
 */
export async function chatCompletionParse(client, options) {
  const {
    messages,
    responseFormat,
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

  if (!responseFormat) {
    throw new Error("responseFormat is required for structured output");
  }

  const url = `${client.baseUrl}/chat/completions`;

  // Build request body
  const body = {
    model,
    messages,
    response_format: responseFormat,
    ...kwargs,
  };

  // Add optional parameters
  if (temperature !== undefined) body.temperature = temperature;
  if (maxTokens !== undefined) body.max_tokens = maxTokens;
  if (topP !== undefined) body.top_p = topP;
  if (n !== undefined) body.n = n;
  if (stop !== undefined) body.stop = stop;

  // Build headers
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${client.apiKey}`,
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

  const responseText = await responseBody.text();

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`API error (${statusCode}): ${responseText}`);
  }

  const response = JSON.parse(responseText);

  // Parse the structured content from the response
  const choice = response.choices?.[0];
  if (choice?.message?.content) {
    try {
      choice.message.parsed = JSON.parse(choice.message.content);
    } catch {
      // If parsing fails, leave parsed as undefined
      choice.message.parsed = null;
    }
  }

  return response;
}

/**
 * Standard chat completion request (non-structured)
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
 * @returns {Promise<Object>} Chat completion response
 */
export async function chatCompletion(client, options) {
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

  // Build request body
  const body = {
    model,
    messages,
    ...kwargs,
  };

  // Add optional parameters
  if (temperature !== undefined) body.temperature = temperature;
  if (maxTokens !== undefined) body.max_tokens = maxTokens;
  if (topP !== undefined) body.top_p = topP;
  if (n !== undefined) body.n = n;
  if (stop !== undefined) body.stop = stop;

  // Build headers
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${client.apiKey}`,
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

  const responseText = await responseBody.text();

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`API error (${statusCode}): ${responseText}`);
  }

  return JSON.parse(responseText);
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
 * Formats and prints the response in a user-friendly way
 * @param {string} question - The original question/prompt asked
 * @param {Object} response - The API response object
 * @param {Object} requestOptions - The request options used
 * @param {Object} [schemaInfo] - Optional schema information
 */
function formatOutput(question, response, requestOptions = {}, schemaInfo = null) {
  const separator = "=".repeat(60);
  const thinSeparator = "-".repeat(60);

  console.log("\n" + separator);
  console.log("  GEMINI STRUCTURED OUTPUT (JSON) CHAT COMPLETION");
  console.log(separator);

  // Print the question/prompt for context
  console.log("\n[PROMPT]");
  console.log(thinSeparator);
  console.log(question);

  // Print schema info if provided
  if (schemaInfo) {
    console.log("\n[SCHEMA]");
    console.log(thinSeparator);
    console.log(JSON.stringify(schemaInfo, null, 2));
  }

  // Print request parameters
  console.log("\n[REQUEST PARAMS]");
  console.log(thinSeparator);
  const params = {
    model: requestOptions.model || DEFAULT_MODEL,
  };
  if (requestOptions.temperature !== undefined)
    params.temperature = requestOptions.temperature;
  if (requestOptions.maxTokens !== undefined)
    params.max_tokens = requestOptions.maxTokens;
  if (requestOptions.topP !== undefined) params.top_p = requestOptions.topP;
  console.log(JSON.stringify(params, null, 2));

  // Print the parsed structured response
  const choice = response.choices?.[0];
  if (choice?.message?.parsed) {
    console.log("\n[PARSED RESPONSE]");
    console.log(thinSeparator);
    console.log(JSON.stringify(choice.message.parsed, null, 2));
  }

  // Print raw content
  if (choice?.message?.content) {
    console.log("\n[RAW CONTENT]");
    console.log(thinSeparator);
    console.log(choice.message.content);
  }

  // Print finish reason
  if (choice?.finish_reason) {
    console.log("\n[FINISH REASON]");
    console.log(thinSeparator);
    console.log(choice.finish_reason);
  }

  // Print metadata
  console.log("\n[METADATA]");
  console.log(thinSeparator);
  const metadata = {
    id: response.id || "N/A",
    model: response.model || "N/A",
    created: response.created
      ? new Date(response.created * 1000).toISOString()
      : "N/A",
    finish_reason: choice?.finish_reason || "N/A",
  };
  console.log(JSON.stringify(metadata, null, 2));

  // Print usage statistics
  if (response.usage) {
    console.log("\n[USAGE]");
    console.log(thinSeparator);
    console.log(JSON.stringify(response.usage, null, 2));
  }

  console.log("\n" + separator + "\n");
}

/**
 * Main execution - demonstrates structured output API with sample question
 */
async function main() {
  logProgress("INIT", "Starting Gemini Structured Output API Client...");

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

  // Sample question (not passed via arg as per requirements)
  const question = "Explain to me how AI works";

  logProgress("QUESTION", `Preparing question: "${question}"`);

  // First, demonstrate a standard chat completion
  logProgress("REQUEST", "Sending standard chat completion request...");

  try {
    const standardRequestOptions = {
      messages: [{ role: "user", content: question }],
      model: "gemini-2.0-flash",
    };

    logProgress("API", "Sending text request to Gemini API...");
    const standardResponse = await chatCompletion(client, standardRequestOptions);
    logProgress("API", "Received response from API");

    formatOutput(question, standardResponse, standardRequestOptions);

    // Now demonstrate structured output (similar to Python Pydantic example)
    logProgress("STRUCTURED", "Demonstrating structured output capability...");

    // Define schema for CalendarEvent (like Pydantic BaseModel)
    const CalendarEventSchema = defineSchema("CalendarEvent", {
      name: "string",
      date: "string",
      participants: ["string"],
    });

    logProgress("SCHEMA", "Created CalendarEvent schema");
    logProgress("SCHEMA", `Schema: ${JSON.stringify(CalendarEventSchema.json_schema.schema)}`);

    const eventPrompt = "John and Susan are going to an AI conference on Friday.";

    const structuredRequestOptions = {
      messages: [
        { role: "system", content: "Extract the event information." },
        { role: "user", content: eventPrompt },
      ],
      responseFormat: CalendarEventSchema,
      model: "gemini-2.0-flash",
    };

    logProgress("API", "Sending structured output request to Gemini API...");
    const structuredResponse = await chatCompletionParse(client, structuredRequestOptions);
    logProgress("API", "Received structured response from API");

    formatOutput(
      eventPrompt,
      structuredResponse,
      structuredRequestOptions,
      CalendarEventSchema.json_schema.schema
    );

    // Print the parsed result similar to Python example
    const parsed = structuredResponse.choices?.[0]?.message?.parsed;
    if (parsed) {
      logProgress("RESULT", "Parsed CalendarEvent:");
      console.log(`  Name: ${parsed.name}`);
      console.log(`  Date: ${parsed.date}`);
      console.log(`  Participants: ${parsed.participants?.join(", ")}`);
    }

    // Additional example: Recipe structured output
    logProgress("STRUCTURED", "Demonstrating another structured output example...");

    const RecipeSchema = defineSchema("Recipe", {
      recipe_name: "string",
      ingredients: ["string"],
      cooking_time_minutes: "integer",
      difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
    });

    const recipePrompt = "Give me a simple pasta recipe with tomatoes and garlic that takes about 20 minutes.";

    const recipeRequestOptions = {
      messages: [
        { role: "system", content: "Extract recipe information into the specified format." },
        { role: "user", content: recipePrompt },
      ],
      responseFormat: RecipeSchema,
      model: "gemini-2.0-flash",
    };

    logProgress("API", "Sending recipe structured request to Gemini API...");
    const recipeResponse = await chatCompletionParse(client, recipeRequestOptions);
    logProgress("API", "Received recipe structured response from API");

    formatOutput(
      recipePrompt,
      recipeResponse,
      recipeRequestOptions,
      RecipeSchema.json_schema.schema
    );

    const recipeParsed = recipeResponse.choices?.[0]?.message?.parsed;
    if (recipeParsed) {
      logProgress("RESULT", "Parsed Recipe:");
      console.log(`  Name: ${recipeParsed.recipe_name}`);
      console.log(`  Cooking Time: ${recipeParsed.cooking_time_minutes} minutes`);
      console.log(`  Difficulty: ${recipeParsed.difficulty}`);
      console.log(`  Ingredients:`);
      recipeParsed.ingredients?.forEach((ing, i) => {
        console.log(`    ${i + 1}. ${ing}`);
      });
    }

    logProgress("COMPLETE", "Structured output demo completed successfully");
  } catch (error) {
    logProgress("ERROR", `Request failed: ${error.message}`);
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

// Run if executed directly
main();
