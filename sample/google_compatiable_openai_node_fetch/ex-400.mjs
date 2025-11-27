/**
 * Gemini OpenAI-Compatible REST API Client - Function Calling Example
 * Single-file implementation using Node.js 23+ undici
 *
 * Features:
 * - Function/Tool calling support (OpenAI-compatible)
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
 * Defines a function/tool for the API
 * @param {string} name - Function name
 * @param {string} description - Function description
 * @param {Object} parameters - JSON Schema for parameters
 * @returns {Object} Tool definition in OpenAI format
 */
export function defineTool(name, description, parameters) {
  return {
    type: "function",
    function: {
      name,
      description,
      parameters,
    },
  };
}

/**
 * Performs a chat completion request with function calling support
 * @param {Object} client - Client from createClient()
 * @param {Object} options - Request options
 * @param {Array} options.messages - Array of {role, content} message objects
 * @param {string} [options.model] - Model to use
 * @param {Array} [options.tools] - Array of tool definitions
 * @param {string|Object} [options.toolChoice] - Tool choice: "auto", "none", "required", or specific function
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
    tools,
    toolChoice,
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

  // Add tools if provided
  if (tools !== undefined) body.tools = tools;
  if (toolChoice !== undefined) body.tool_choice = toolChoice;
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
 * Extracts tool calls from the response
 * @param {Object} response - API response
 * @returns {Array|null} Array of tool calls or null if none
 */
export function extractToolCalls(response) {
  if (!response.choices?.[0]?.message?.tool_calls) {
    return null;
  }
  return response.choices[0].message.tool_calls;
}

/**
 * Creates a tool response message for the conversation
 * @param {string} toolCallId - The tool_call_id from the assistant's response
 * @param {string} name - The function name
 * @param {any} result - The result to return (will be JSON stringified)
 * @returns {Object} Tool response message
 */
export function createToolResponse(toolCallId, name, result) {
  return {
    role: "tool",
    tool_call_id: toolCallId,
    name,
    content: typeof result === "string" ? result : JSON.stringify(result),
  };
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
 * @param {string} question - The original question asked
 * @param {Object} response - The API response object
 * @param {Object} requestOptions - The request options used
 */
function formatOutput(question, response, requestOptions = {}) {
  const separator = "=".repeat(60);
  const thinSeparator = "-".repeat(60);

  console.log("\n" + separator);
  console.log("  GEMINI FUNCTION CALLING CHAT COMPLETION");
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
    tool_choice: requestOptions.toolChoice || "auto",
    tools_count: requestOptions.tools?.length || 0,
  };
  if (requestOptions.temperature !== undefined)
    params.temperature = requestOptions.temperature;
  if (requestOptions.maxTokens !== undefined)
    params.max_tokens = requestOptions.maxTokens;
  console.log(JSON.stringify(params, null, 2));

  // Print tools
  if (requestOptions.tools?.length > 0) {
    console.log("\n[AVAILABLE TOOLS]");
    console.log(thinSeparator);
    for (const tool of requestOptions.tools) {
      console.log(`  - ${tool.function.name}: ${tool.function.description}`);
    }
  }

  // Print the response content
  console.log("\n[RESPONSE]");
  console.log(thinSeparator);
  const choice = response.choices?.[0];
  if (choice?.message?.content) {
    console.log(choice.message.content);
  }

  // Print tool calls if present
  if (choice?.message?.tool_calls) {
    console.log("\n[TOOL CALLS]");
    console.log(thinSeparator);
    for (const toolCall of choice.message.tool_calls) {
      console.log(`  Function: ${toolCall.function.name}`);
      console.log(`  Call ID:  ${toolCall.id}`);
      console.log(`  Arguments:`);
      try {
        const args = JSON.parse(toolCall.function.arguments);
        console.log(JSON.stringify(args, null, 4));
      } catch {
        console.log(`    ${toolCall.function.arguments}`);
      }
      console.log();
    }
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
 * Formats output for tool result follow-up
 * @param {Object} response - The API response after tool result
 */
function formatToolResultOutput(response) {
  const separator = "=".repeat(60);
  const thinSeparator = "-".repeat(60);

  console.log("\n" + separator);
  console.log("  FUNCTION RESULT - FINAL RESPONSE");
  console.log(separator);

  const choice = response.choices?.[0];

  // Print the final response content
  console.log("\n[ASSISTANT RESPONSE]");
  console.log(thinSeparator);
  if (choice?.message?.content) {
    console.log(choice.message.content);
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
 * Simulated function implementations for demo
 */
const functionImplementations = {
  get_weather: (args) => {
    // Simulated weather data
    const weatherData = {
      "Chicago, IL": { temp: 22, condition: "Partly cloudy", humidity: 65 },
      "New York, NY": { temp: 18, condition: "Sunny", humidity: 55 },
      "Los Angeles, CA": { temp: 28, condition: "Clear", humidity: 40 },
    };

    const location = args.location;
    const unit = args.unit || "fahrenheit";

    // Find matching location (case-insensitive partial match)
    const matchedLocation = Object.keys(weatherData).find((loc) =>
      loc.toLowerCase().includes(location.toLowerCase().split(",")[0])
    );

    if (matchedLocation) {
      const data = weatherData[matchedLocation];
      let temp = data.temp;
      if (unit === "fahrenheit") {
        temp = Math.round((temp * 9) / 5 + 32);
      }
      return {
        location: matchedLocation,
        temperature: temp,
        unit: unit,
        condition: data.condition,
        humidity: data.humidity,
      };
    }

    return {
      location: location,
      temperature: 20,
      unit: unit,
      condition: "Unknown",
      humidity: 50,
      note: "Simulated data for unknown location",
    };
  },
};

/**
 * Executes a tool call using local function implementations
 * @param {Object} toolCall - The tool call from the API response
 * @returns {any} The function result
 */
function executeToolCall(toolCall) {
  const funcName = toolCall.function.name;
  const args = JSON.parse(toolCall.function.arguments);

  if (functionImplementations[funcName]) {
    return functionImplementations[funcName](args);
  }

  throw new Error(`Function ${funcName} not implemented`);
}

/**
 * Main execution - demonstrates function calling with the API
 */
async function main() {
  logProgress("INIT", "Starting Gemini Function Calling API Client...");

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

  // Define the weather tool
  logProgress("TOOLS", "Defining available tools...");
  const weatherTool = defineTool(
    "get_weather",
    "Get the current weather in a given location",
    {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The city and state, e.g. Chicago, IL",
        },
        unit: {
          type: "string",
          enum: ["celsius", "fahrenheit"],
          description: "Temperature unit",
        },
      },
      required: ["location"],
    }
  );
  logProgress("TOOLS", `Registered tool: ${weatherTool.function.name}`);

  const question = "What's the weather like in Chicago today?";

  const requestOptions = {
    messages: [{ role: "user", content: question }],
    model: "gemini-2.0-flash",
    tools: [weatherTool],
    toolChoice: "auto",
    // temperature: 0.7,
    // maxTokens: 1000,
    // topP: 0.9,
  };

  logProgress("REQUEST", `Preparing request to ${client.baseUrl}...`);
  logProgress("REQUEST", `Model: ${requestOptions.model}`);
  logProgress("REQUEST", `Question: "${question}"`);

  try {
    // Step 1: Initial request with function definitions
    logProgress("API", "Sending initial request with tool definitions...");
    const response = await chatCompletion(client, requestOptions);
    logProgress("API", "Received response from API");

    formatOutput(question, response, requestOptions);

    // Step 2: Check if the model wants to call a function
    const toolCalls = extractToolCalls(response);

    if (toolCalls && toolCalls.length > 0) {
      logProgress("FUNCTION", "Model requested function call(s)");

      // Execute each tool call
      const toolResponses = [];
      for (const toolCall of toolCalls) {
        logProgress(
          "FUNCTION",
          `Executing: ${toolCall.function.name}(${toolCall.function.arguments})`
        );

        const result = executeToolCall(toolCall);
        logProgress("FUNCTION", `Result: ${JSON.stringify(result)}`);

        toolResponses.push(
          createToolResponse(toolCall.id, toolCall.function.name, result)
        );
      }

      // Step 3: Send tool results back to the model
      logProgress("API", "Sending tool results back to model...");

      const followUpMessages = [
        ...requestOptions.messages,
        response.choices[0].message, // Assistant's message with tool_calls
        ...toolResponses, // Tool response messages
      ];

      const followUpResponse = await chatCompletion(client, {
        ...requestOptions,
        messages: followUpMessages,
      });

      logProgress("API", "Received final response");
      formatToolResultOutput(followUpResponse);
    } else {
      logProgress("INFO", "No function calls requested by model");
    }

    logProgress("COMPLETE", "Function calling demo completed successfully");
  } catch (error) {
    logProgress("ERROR", `Request failed: ${error.message}`);
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

// Run if executed directly
main();
