/**
 * Gemini OpenAI-Compatible REST API Client - Structured Output (CSV) Example
 * Single-file implementation using Node.js 23+ undici
 *
 * Features:
 * - Structured output with CSV format response
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
 * Parse CSV string to array of objects
 * Handles quoted fields, escaped quotes, and multiline values
 * @param {string} csvString - CSV string to parse
 * @param {Object} options - Parser options
 * @param {string} [options.delimiter=','] - Field delimiter
 * @param {boolean} [options.hasHeader=true] - First row is header
 * @returns {Array<Object>} Array of row objects
 */
export function parseCsv(csvString, options = {}) {
  const { delimiter = ",", hasHeader = true } = options;

  const lines = [];
  let currentLine = [];
  let currentField = "";
  let inQuotes = false;

  // Parse character by character to handle quoted fields properly
  for (let i = 0; i < csvString.length; i++) {
    const char = csvString[i];
    const nextChar = csvString[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        // End of quoted field
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true;
      } else if (char === delimiter) {
        // Field separator
        currentLine.push(currentField.trim());
        currentField = "";
      } else if (char === "\n" || (char === "\r" && nextChar === "\n")) {
        // End of line
        if (char === "\r") i++; // Skip \n in \r\n
        currentLine.push(currentField.trim());
        if (currentLine.some((f) => f !== "")) {
          lines.push(currentLine);
        }
        currentLine = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  // Handle last field/line
  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField.trim());
    if (currentLine.some((f) => f !== "")) {
      lines.push(currentLine);
    }
  }

  if (lines.length === 0) return [];

  // Convert to objects if header row exists
  if (hasHeader && lines.length > 0) {
    const headers = lines[0];
    const rows = lines.slice(1);

    return rows.map((row) => {
      const obj = {};
      headers.forEach((header, index) => {
        let value = row[index] || "";

        // Try to parse as number
        if (/^-?\d+$/.test(value)) {
          value = parseInt(value, 10);
        } else if (/^-?\d+\.\d+$/.test(value)) {
          value = parseFloat(value);
        } else if (value.toLowerCase() === "true") {
          value = true;
        } else if (value.toLowerCase() === "false") {
          value = false;
        }

        // Handle array fields (pipe-separated)
        if (typeof value === "string" && value.includes("|")) {
          value = value.split("|").map((v) => v.trim());
        }

        obj[header] = value;
      });
      return obj;
    });
  }

  return lines;
}

/**
 * Convert array of objects to CSV string
 * @param {Array<Object>} data - Array of objects to convert
 * @param {Object} options - Converter options
 * @param {string} [options.delimiter=','] - Field delimiter
 * @param {Array<string>} [options.columns] - Column order (defaults to all keys from first object)
 * @returns {string} CSV string
 */
export function toCsv(data, options = {}) {
  if (!data || data.length === 0) return "";

  const { delimiter = "," } = options;
  let { columns } = options;

  // Get columns from first object if not specified
  if (!columns) {
    columns = Object.keys(data[0]);
  }

  // Helper to escape a field
  const escapeField = (value) => {
    if (value === null || value === undefined) return "";

    // Handle arrays (join with pipe)
    if (Array.isArray(value)) {
      value = value.join("|");
    }

    const str = String(value);

    // Quote if contains delimiter, quotes, or newlines
    if (
      str.includes(delimiter) ||
      str.includes('"') ||
      str.includes("\n") ||
      str.includes("\r")
    ) {
      return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  };

  // Build CSV
  const lines = [];

  // Header row
  lines.push(columns.map(escapeField).join(delimiter));

  // Data rows
  for (const row of data) {
    const values = columns.map((col) => escapeField(row[col]));
    lines.push(values.join(delimiter));
  }

  return lines.join("\n");
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
 * Defines a schema for structured CSV output
 * Creates a system prompt that instructs the model to respond in CSV format
 * @param {string} name - Schema name
 * @param {Array<Object>} columns - Column definitions [{name, type, description}]
 * @returns {Object} Schema definition with CSV instructions
 */
export function defineCsvSchema(name, columns) {
  // Build header row from column names
  const headerRow = columns.map((col) => col.name).join(",");

  // Build example row
  const exampleRow = columns
    .map((col) => {
      if (col.type === "array" || col.type === "list") {
        return "item1|item2";
      } else if (col.type === "integer" || col.type === "number") {
        return "123";
      } else if (col.type === "boolean") {
        return "true";
      }
      return "value";
    })
    .join(",");

  // Build column descriptions
  const columnDescriptions = columns
    .map((col) => {
      let desc = `- ${col.name}: ${col.type}`;
      if (col.description) desc += ` - ${col.description}`;
      if (col.type === "array" || col.type === "list") {
        desc += " (use | as separator for multiple values)";
      }
      return desc;
    })
    .join("\n");

  const systemPrompt = `You MUST respond with ONLY valid CSV format. No explanations, no markdown, no code blocks, no backticks - just raw CSV text.

Output format (${name}):
${headerRow}
${exampleRow}

Column descriptions:
${columnDescriptions}

Rules:
- First row MUST be the header row exactly as shown above
- Use comma (,) as field delimiter
- Use pipe (|) as separator for array/list values within a field
- Quote fields containing commas, quotes, or newlines
- Escape quotes by doubling them ("")

Respond with ONLY the CSV (header + data rows), nothing else.`;

  return {
    name,
    columns,
    headerRow,
    systemPrompt,
    _schema: {
      name,
      columns,
    },
  };
}

/**
 * Performs a structured chat completion request with CSV response format
 * @param {Object} client - Client from createClient()
 * @param {Object} options - Request options
 * @param {Array} options.messages - Array of {role, content} message objects
 * @param {Object} options.csvSchema - CSV schema from defineCsvSchema()
 * @param {string} [options.model] - Model to use
 * @param {number} [options.temperature] - Sampling temperature (0-2)
 * @param {number} [options.maxTokens] - Maximum tokens to generate
 * @param {number} [options.topP] - Nucleus sampling parameter
 * @param {number} [options.n] - Number of completions to generate
 * @param {string|Array} [options.stop] - Stop sequence(s)
 * @param {...any} kwargs - Additional parameters passed to the API
 * @returns {Promise<Object>} Chat completion response with parsed field
 */
export async function chatCompletionParseCsv(client, options) {
  const {
    messages,
    csvSchema,
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

  if (!csvSchema) {
    throw new Error("csvSchema is required for structured CSV output");
  }

  const url = `${client.baseUrl}/chat/completions`;

  // Merge system prompts: combine CSV schema instructions with any existing system message
  const messagesWithSchema = [];
  let hasSystemMessage = false;

  for (const msg of messages) {
    if (msg.role === "system") {
      // Combine the CSV schema with the existing system message
      messagesWithSchema.push({
        role: "system",
        content: `${csvSchema.systemPrompt}\n\nAdditional instructions: ${msg.content}`,
      });
      hasSystemMessage = true;
    } else {
      messagesWithSchema.push(msg);
    }
  }

  // If no system message was present, prepend the CSV schema
  if (!hasSystemMessage) {
    messagesWithSchema.unshift({
      role: "system",
      content: csvSchema.systemPrompt,
    });
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

  // Parse the CSV content from the response
  const choice = response.choices?.[0];
  if (choice?.message?.content) {
    try {
      // Clean up the content (remove markdown code blocks if present)
      let csvContent = choice.message.content.trim();
      if (csvContent.startsWith("```csv")) {
        csvContent = csvContent.slice(6);
      } else if (csvContent.startsWith("```")) {
        csvContent = csvContent.slice(3);
      }
      if (csvContent.endsWith("```")) {
        csvContent = csvContent.slice(0, -3);
      }
      csvContent = csvContent.trim();

      choice.message.parsed = parseCsv(csvContent);
      choice.message.csvContent = csvContent;
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
function formatOutput(
  question,
  response,
  requestOptions = {},
  schemaInfo = null
) {
  const separator = "=".repeat(60);
  const thinSeparator = "-".repeat(60);

  console.log("\n" + separator);
  console.log("  GEMINI STRUCTURED OUTPUT (CSV) CHAT COMPLETION");
  console.log(separator);

  // Print the question/prompt for context
  console.log("\n[PROMPT]");
  console.log(thinSeparator);
  console.log(question);

  // Print schema info if provided
  if (schemaInfo) {
    console.log("\n[CSV SCHEMA]");
    console.log(thinSeparator);
    console.log(`Name: ${schemaInfo.name}`);
    console.log(`Columns: ${schemaInfo.columns.map((c) => c.name).join(", ")}`);
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

  // Print the raw CSV response
  const choice = response.choices?.[0];
  if (choice?.message?.csvContent) {
    console.log("\n[CSV RESPONSE]");
    console.log(thinSeparator);
    console.log(choice.message.csvContent);
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

  // Print raw content for non-CSV responses
  if (!choice?.message?.csvContent && choice?.message?.content) {
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
 * Main execution - demonstrates structured CSV output API with sample question
 */
async function main() {
  logProgress("INIT", "Starting Gemini Structured Output (CSV) API Client...");

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
    const standardResponse = await chatCompletion(
      client,
      standardRequestOptions
    );
    logProgress("API", "Received response from API");

    formatOutput(question, standardResponse, standardRequestOptions);

    // Now demonstrate structured CSV output (similar to Python Pydantic example)
    logProgress("STRUCTURED", "Demonstrating structured CSV output capability...");

    // Define CSV schema for CalendarEvent (like Pydantic BaseModel)
    const CalendarEventSchema = defineCsvSchema("CalendarEvent", [
      { name: "name", type: "string", description: "Event name" },
      { name: "date", type: "string", description: "Event date" },
      {
        name: "participants",
        type: "array",
        description: "List of participants",
      },
    ]);

    logProgress("SCHEMA", "Created CalendarEvent CSV schema");

    const eventPrompt =
      "John and Susan are going to an AI conference on Friday.";

    const structuredRequestOptions = {
      messages: [
        { role: "system", content: "Extract the event information." },
        { role: "user", content: eventPrompt },
      ],
      csvSchema: CalendarEventSchema,
      model: "gemini-2.0-flash",
      temperature: 0.1, // Lower temperature for consistent CSV output
    };

    logProgress("API", "Sending structured CSV request to Gemini API...");
    const structuredResponse = await chatCompletionParseCsv(
      client,
      structuredRequestOptions
    );
    logProgress("API", "Received structured CSV response from API");

    formatOutput(
      eventPrompt,
      structuredResponse,
      structuredRequestOptions,
      CalendarEventSchema
    );

    // Print the parsed result similar to Python example
    const parsed = structuredResponse.choices?.[0]?.message?.parsed;
    if (parsed && parsed.length > 0) {
      logProgress("RESULT", "Parsed CalendarEvent from CSV:");
      for (const row of parsed) {
        console.log(`  Name: ${row.name}`);
        console.log(`  Date: ${row.date}`);
        console.log(
          `  Participants: ${Array.isArray(row.participants) ? row.participants.join(", ") : row.participants}`
        );
      }
    }

    // Additional example: Multiple events in CSV format
    logProgress("STRUCTURED", "Demonstrating multiple rows CSV output...");

    const multiEventPrompt = `Extract all events from this text:
    - Team meeting on Monday with Alice, Bob, and Charlie
    - Product launch on Wednesday with the marketing team
    - Code review on Thursday with developers`;

    const multiEventRequestOptions = {
      messages: [
        {
          role: "system",
          content: "Extract ALL events as separate rows in the CSV.",
        },
        { role: "user", content: multiEventPrompt },
      ],
      csvSchema: CalendarEventSchema,
      model: "gemini-2.0-flash",
      temperature: 0.1,
    };

    logProgress("API", "Sending multi-event CSV request to Gemini API...");
    const multiEventResponse = await chatCompletionParseCsv(
      client,
      multiEventRequestOptions
    );
    logProgress("API", "Received multi-event CSV response from API");

    formatOutput(
      multiEventPrompt,
      multiEventResponse,
      multiEventRequestOptions,
      CalendarEventSchema
    );

    const multiParsed = multiEventResponse.choices?.[0]?.message?.parsed;
    if (multiParsed && multiParsed.length > 0) {
      logProgress("RESULT", `Parsed ${multiParsed.length} events from CSV:`);
      multiParsed.forEach((event, i) => {
        console.log(`  Event ${i + 1}:`);
        console.log(`    Name: ${event.name}`);
        console.log(`    Date: ${event.date}`);
        console.log(
          `    Participants: ${Array.isArray(event.participants) ? event.participants.join(", ") : event.participants}`
        );
      });
    }

    // Additional example: Recipe with different data types
    logProgress("STRUCTURED", "Demonstrating Recipe CSV with various data types...");

    const RecipeSchema = defineCsvSchema("Recipe", [
      { name: "recipe_name", type: "string", description: "Name of the recipe" },
      { name: "ingredients", type: "array", description: "List of ingredients" },
      {
        name: "cooking_time_minutes",
        type: "integer",
        description: "Cooking time in minutes",
      },
      {
        name: "difficulty",
        type: "string",
        description: "Difficulty level (easy, medium, hard)",
      },
      {
        name: "vegetarian",
        type: "boolean",
        description: "Is the recipe vegetarian?",
      },
    ]);

    const recipePrompt =
      "Give me a simple pasta recipe with tomatoes and garlic that takes about 20 minutes.";

    const recipeRequestOptions = {
      messages: [
        { role: "system", content: "Extract recipe information." },
        { role: "user", content: recipePrompt },
      ],
      csvSchema: RecipeSchema,
      model: "gemini-2.0-flash",
      temperature: 0.1,
    };

    logProgress("API", "Sending recipe CSV request to Gemini API...");
    const recipeResponse = await chatCompletionParseCsv(
      client,
      recipeRequestOptions
    );
    logProgress("API", "Received recipe CSV response from API");

    formatOutput(
      recipePrompt,
      recipeResponse,
      recipeRequestOptions,
      RecipeSchema
    );

    const recipeParsed = recipeResponse.choices?.[0]?.message?.parsed;
    if (recipeParsed && recipeParsed.length > 0) {
      const recipe = recipeParsed[0];
      logProgress("RESULT", "Parsed Recipe from CSV:");
      console.log(`  Name: ${recipe.recipe_name}`);
      console.log(`  Cooking Time: ${recipe.cooking_time_minutes} minutes`);
      console.log(`  Difficulty: ${recipe.difficulty}`);
      console.log(`  Vegetarian: ${recipe.vegetarian}`);
      console.log(`  Ingredients:`);
      const ingredients = Array.isArray(recipe.ingredients)
        ? recipe.ingredients
        : [recipe.ingredients];
      ingredients.forEach((ing, i) => {
        console.log(`    ${i + 1}. ${ing}`);
      });
    }

    // Demonstrate CSV serialization
    logProgress("CSV", "Demonstrating CSV serialization...");
    if (recipeParsed && recipeParsed.length > 0) {
      console.log("\n--- Re-serialized to CSV ---");
      console.log(toCsv(recipeParsed));
    }

    logProgress("COMPLETE", "Structured CSV output demo completed successfully");
  } catch (error) {
    logProgress("ERROR", `Request failed: ${error.message}`);
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

// Run if executed directly
main();
