/**
 * Gemini OpenAI-Compatible REST API Client - Structured Output (YAML) Example
 * Single-file implementation using Node.js 23+ undici
 *
 * Features:
 * - Structured output with YAML format response
 * - Proxy support (optional)
 * - Certificate/CA bundle support (optional)
 * - Keep-alive with configurable connections
 * - Custom headers
 * - Full OpenAI-compatible chat completion parameters
 * - User-friendly output with metadata
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
 * Simple YAML parser for structured output
 * Handles basic YAML structures: strings, numbers, booleans, arrays, objects
 * @param {string} yamlString - YAML string to parse
 * @returns {Object} Parsed JavaScript object
 */
export function parseYaml(yamlString) {
  const lines = yamlString.split("\n");
  const result = {};
  let currentKey = null;
  let currentArray = null;
  let inArray = false;

  for (let line of lines) {
    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith("#")) continue;

    // Check for array item
    const arrayMatch = line.match(/^(\s*)-\s*(.*)$/);
    if (arrayMatch && inArray && currentKey) {
      const value = arrayMatch[2].trim();
      if (!result[currentKey]) result[currentKey] = [];
      result[currentKey].push(parseYamlValue(value));
      continue;
    }

    // Check for key-value pair
    const kvMatch = line.match(/^(\s*)([^:]+):\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[2].trim();
      const value = kvMatch[3].trim();

      currentKey = key;

      if (value === "" || value === "|" || value === ">") {
        // Array or multiline will follow
        inArray = true;
        result[key] = [];
      } else {
        inArray = false;
        result[key] = parseYamlValue(value);
      }
    }
  }

  return result;
}

/**
 * Parse a YAML value to appropriate JavaScript type
 * @param {string} value - YAML value string
 * @returns {any} Parsed value
 */
function parseYamlValue(value) {
  // Remove quotes if present
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  // Check for boolean
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;

  // Check for null
  if (value.toLowerCase() === "null" || value === "~") return null;

  // Check for number
  if (/^-?\d+$/.test(value)) return parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);

  // Return as string
  return value;
}

/**
 * Convert JavaScript object to YAML string
 * @param {Object} obj - Object to convert
 * @param {number} indent - Current indentation level
 * @returns {string} YAML string
 */
export function toYaml(obj, indent = 0) {
  const spaces = "  ".repeat(indent);
  let result = "";

  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      result += `${spaces}${key}:\n`;
      for (const item of value) {
        if (typeof item === "object" && item !== null) {
          result += `${spaces}  -\n`;
          result += toYaml(item, indent + 2);
        } else {
          result += `${spaces}  - ${formatYamlValue(item)}\n`;
        }
      }
    } else if (typeof value === "object" && value !== null) {
      result += `${spaces}${key}:\n`;
      result += toYaml(value, indent + 1);
    } else {
      result += `${spaces}${key}: ${formatYamlValue(value)}\n`;
    }
  }

  return result;
}

/**
 * Format a value for YAML output
 * @param {any} value - Value to format
 * @returns {string} Formatted value
 */
function formatYamlValue(value) {
  if (value === null) return "null";
  if (typeof value === "string") {
    // Quote strings that might be ambiguous
    if (
      value.includes(":") ||
      value.includes("#") ||
      value.includes("\n") ||
      /^[\d\-]/.test(value)
    ) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }
  return String(value);
}

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
 * Defines a schema for structured YAML output
 * Creates a system prompt that instructs the model to respond in YAML format
 * @param {string} name - Schema name
 * @param {Object} properties - Property definitions with type info
 * @param {Array<string>} [required] - Required property names (defaults to all)
 * @returns {Object} Schema definition with YAML instructions
 */
export function defineYamlSchema(name, properties, required = null) {
  const requiredFields = required || Object.keys(properties);

  // Build example YAML structure
  let exampleYaml = "";
  for (const [key, value] of Object.entries(properties)) {
    if (Array.isArray(value)) {
      exampleYaml += `${key}:\n  - item1\n  - item2\n`;
    } else {
      exampleYaml += `${key}: value\n`;
    }
  }

  // Build YAML schema description with explicit example
  let schemaDescription = `You MUST respond with ONLY valid YAML. No explanations, no markdown, no code blocks, no backticks - just raw YAML text.

Output format (${name}):
${exampleYaml}
Field descriptions:`;

  for (const [key, value] of Object.entries(properties)) {
    let typeDesc;
    if (typeof value === "string") {
      typeDesc = value;
    } else if (Array.isArray(value)) {
      typeDesc = `list of ${value[0]}`;
    } else if (typeof value === "object" && value.type) {
      typeDesc = value.enum ? `${value.type} (one of: ${value.enum.join(", ")})` : value.type;
    } else {
      typeDesc = "string";
    }
    const isRequired = requiredFields.includes(key) ? "required" : "optional";
    schemaDescription += `\n- ${key}: ${typeDesc} (${isRequired})`;
  }

  schemaDescription += `\n\nRespond with ONLY the YAML, nothing else.`;

  return {
    name,
    properties,
    required: requiredFields,
    systemPrompt: schemaDescription,
    // Store schema info for parsing
    _schema: {
      name,
      properties,
      required: requiredFields,
    },
  };
}

/**
 * Performs a structured chat completion request with YAML response format
 * @param {Object} client - Client from createClient()
 * @param {Object} options - Request options
 * @param {Array} options.messages - Array of {role, content} message objects
 * @param {Object} options.yamlSchema - YAML schema from defineYamlSchema()
 * @param {string} [options.model] - Model to use
 * @param {number} [options.temperature] - Sampling temperature (0-2)
 * @param {number} [options.maxTokens] - Maximum tokens to generate
 * @param {number} [options.topP] - Nucleus sampling parameter
 * @param {number} [options.n] - Number of completions to generate
 * @param {string|Array} [options.stop] - Stop sequence(s)
 * @param {...any} kwargs - Additional parameters passed to the API
 * @returns {Promise<Object>} Chat completion response with parsed field
 */
export async function chatCompletionParseYaml(client, options) {
  const {
    messages,
    yamlSchema,
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

  if (!yamlSchema) {
    throw new Error("yamlSchema is required for structured YAML output");
  }

  const url = `${client.baseUrl}/chat/completions`;

  // Merge system prompts: combine YAML schema instructions with any existing system message
  const messagesWithSchema = [];
  let hasSystemMessage = false;

  for (const msg of messages) {
    if (msg.role === "system") {
      // Combine the YAML schema with the existing system message
      messagesWithSchema.push({
        role: "system",
        content: `${yamlSchema.systemPrompt}\n\nAdditional instructions: ${msg.content}`,
      });
      hasSystemMessage = true;
    } else {
      messagesWithSchema.push(msg);
    }
  }

  // If no system message was present, prepend the YAML schema
  if (!hasSystemMessage) {
    messagesWithSchema.unshift({ role: "system", content: yamlSchema.systemPrompt });
  }

  // Build request body
  const body = {
    model,
    messages: messagesWithSchema,
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

  // Parse the YAML content from the response
  const choice = response.choices?.[0];
  if (choice?.message?.content) {
    try {
      // Clean up the content (remove markdown code blocks if present)
      let yamlContent = choice.message.content.trim();
      if (yamlContent.startsWith("```yaml")) {
        yamlContent = yamlContent.slice(7);
      } else if (yamlContent.startsWith("```")) {
        yamlContent = yamlContent.slice(3);
      }
      if (yamlContent.endsWith("```")) {
        yamlContent = yamlContent.slice(0, -3);
      }
      yamlContent = yamlContent.trim();

      choice.message.parsed = parseYaml(yamlContent);
      choice.message.yamlContent = yamlContent;
    } catch (e) {
      // If parsing fails, leave parsed as null
      choice.message.parsed = null;
      choice.message.parseError = e.message;
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
  console.log("  GEMINI STRUCTURED OUTPUT (YAML) CHAT COMPLETION");
  console.log(separator);

  // Print the question/prompt for context
  console.log("\n[PROMPT]");
  console.log(thinSeparator);
  console.log(question);

  // Print schema info if provided
  if (schemaInfo) {
    console.log("\n[YAML SCHEMA]");
    console.log(thinSeparator);
    console.log(schemaInfo.systemPrompt);
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

  // Print the raw YAML response
  const choice = response.choices?.[0];
  if (choice?.message?.yamlContent) {
    console.log("\n[YAML RESPONSE]");
    console.log(thinSeparator);
    console.log(choice.message.yamlContent);
  }

  // Print the parsed structured response as JSON
  if (choice?.message?.parsed) {
    console.log("\n[PARSED RESPONSE (JSON)]");
    console.log(thinSeparator);
    console.log(JSON.stringify(choice.message.parsed, null, 2));
  }

  // Print parse error if any
  if (choice?.message?.parseError) {
    console.log("\n[PARSE ERROR]");
    console.log(thinSeparator);
    console.log(choice.message.parseError);
  }

  // Print raw content for non-YAML responses
  if (!choice?.message?.yamlContent && choice?.message?.content) {
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
 * Main execution - demonstrates structured YAML output API with sample question
 */
async function main() {
  logProgress("INIT", "Starting Gemini Structured Output (YAML) API Client...");

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

    // Now demonstrate structured YAML output (similar to Python Pydantic example)
    logProgress("STRUCTURED", "Demonstrating structured YAML output capability...");

    // Define YAML schema for CalendarEvent (like Pydantic BaseModel)
    const CalendarEventSchema = defineYamlSchema("CalendarEvent", {
      name: "string",
      date: "string",
      participants: ["string"],
    });

    logProgress("SCHEMA", "Created CalendarEvent YAML schema");

    const eventPrompt = "John and Susan are going to an AI conference on Friday.";

    const structuredRequestOptions = {
      messages: [
        { role: "system", content: "Extract the event information." },
        { role: "user", content: eventPrompt },
      ],
      yamlSchema: CalendarEventSchema,
      model: "gemini-2.0-flash",
      temperature: 0.1, // Lower temperature for consistent YAML output
    };

    logProgress("API", "Sending structured YAML request to Gemini API...");
    const structuredResponse = await chatCompletionParseYaml(client, structuredRequestOptions);
    logProgress("API", "Received structured YAML response from API");

    formatOutput(
      eventPrompt,
      structuredResponse,
      structuredRequestOptions,
      CalendarEventSchema
    );

    // Print the parsed result similar to Python example
    const parsed = structuredResponse.choices?.[0]?.message?.parsed;
    if (parsed) {
      logProgress("RESULT", "Parsed CalendarEvent from YAML:");
      console.log(`  Name: ${parsed.name}`);
      console.log(`  Date: ${parsed.date}`);
      console.log(`  Participants: ${parsed.participants?.join(", ")}`);
    }

    // Additional example: Recipe structured output in YAML
    logProgress("STRUCTURED", "Demonstrating another YAML structured output example...");

    const RecipeSchema = defineYamlSchema("Recipe", {
      recipe_name: "string",
      ingredients: ["string"],
      cooking_time_minutes: "integer",
      difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
    });

    const recipePrompt = "Give me a simple pasta recipe with tomatoes and garlic that takes about 20 minutes.";

    const recipeRequestOptions = {
      messages: [
        { role: "system", content: "Extract recipe information." },
        { role: "user", content: recipePrompt },
      ],
      yamlSchema: RecipeSchema,
      model: "gemini-2.0-flash",
      temperature: 0.1, // Lower temperature for consistent YAML output
    };

    logProgress("API", "Sending recipe YAML request to Gemini API...");
    const recipeResponse = await chatCompletionParseYaml(client, recipeRequestOptions);
    logProgress("API", "Received recipe YAML response from API");

    formatOutput(
      recipePrompt,
      recipeResponse,
      recipeRequestOptions,
      RecipeSchema
    );

    const recipeParsed = recipeResponse.choices?.[0]?.message?.parsed;
    if (recipeParsed) {
      logProgress("RESULT", "Parsed Recipe from YAML:");
      console.log(`  Name: ${recipeParsed.recipe_name}`);
      console.log(`  Cooking Time: ${recipeParsed.cooking_time_minutes} minutes`);
      console.log(`  Difficulty: ${recipeParsed.difficulty}`);
      console.log(`  Ingredients:`);
      recipeParsed.ingredients?.forEach((ing, i) => {
        console.log(`    ${i + 1}. ${ing}`);
      });
    }

    // Demonstrate YAML serialization
    logProgress("YAML", "Demonstrating YAML serialization...");
    if (recipeParsed) {
      console.log("\n--- Re-serialized to YAML ---");
      console.log(toYaml(recipeParsed));
    }

    logProgress("COMPLETE", "Structured YAML output demo completed successfully");
  } catch (error) {
    logProgress("ERROR", `Request failed: ${error.message}`);
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

// Run if executed directly
main();
