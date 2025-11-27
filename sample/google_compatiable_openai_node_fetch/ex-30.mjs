#!/usr/bin/env node
/**
 * Gemini OpenAI-Compatible REST API Client - React Component with API Integration
 * Single-file implementation using Node.js 23+ with undici
 *
 * Features:
 * - Structured output for React component modifications
 * - Template-based input (RAG-style: source code + changes)
 * - Proxy support (optional)
 * - Certificate/CA bundle support (optional)
 * - Keep-alive with configurable connections
 * - Custom headers
 * - Full OpenAI-compatible chat completion parameters
 * - User-friendly JSON output with metadata
 *
 * Use Case:
 * - Modify React component to add service call to https://api.nobelprize.org/v1/prize.json
 * - Display firstname of each laureate from the response
 *
 * Based on: https://ai.google.dev/gemini-api/docs/openai#rest
 */

import { Agent, request } from "undici";
import { readFileSync } from "node:fs";

// Default configuration
const DEFAULT_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai";
const DEFAULT_MODEL = "gemini-2.0-flash";
const DEFAULT_TIMEOUT = 60000; // 60 seconds
const DEFAULT_MAX_CONNECTIONS = 10;

// Output formatting
const SEPARATOR = "=".repeat(70);
const THIN_SEPARATOR = "-".repeat(70);

// =============================================================================
// Output Formatting Functions
// =============================================================================

/**
 * Logs progress messages with timestamp and stage.
 * @param {string} stage - Current stage name
 * @param {string} message - Optional descriptive message
 */
function logProgress(stage, message = "") {
  const now = new Date();
  const timestamp = now.toISOString().slice(11, 23);
  console.log(`[${timestamp}] [${stage}] ${message}`);
}

/**
 * Formats and prints the response in a user-friendly way.
 * @param {string} originalCode - The original React code
 * @param {string[]} changes - List of requested changes
 * @param {Object} response - The API response object
 * @param {Object} requestOptions - The request options used
 */
function formatOutput(originalCode, changes, response, requestOptions = {}) {
  console.log(`\n${SEPARATOR}`);
  console.log("  GEMINI REACT COMPONENT MODIFIER - NOBEL PRIZE API INTEGRATION");
  console.log(SEPARATOR);

  // Print the question/task first for UX context
  console.log("\n[TASK DESCRIPTION]");
  console.log(THIN_SEPARATOR);
  console.log("Modify React component to integrate Nobel Prize API");
  console.log("API: https://api.nobelprize.org/v1/prize.json");
  console.log("Goal: Display firstname of each laureate from the response");

  // Print the original code (truncated for display)
  console.log("\n[ORIGINAL CODE]");
  console.log(THIN_SEPARATOR);
  const lines = originalCode.trim().split("\n");
  if (lines.length > 15) {
    console.log(lines.slice(0, 10).join("\n"));
    console.log(`  ... (${lines.length - 10} more lines)`);
  } else {
    console.log(originalCode.trim());
  }

  // Print requested changes
  console.log("\n[REQUESTED CHANGES]");
  console.log(THIN_SEPARATOR);
  changes.forEach((change, i) => {
    console.log(`  ${i + 1}. ${change}`);
  });

  // Print request parameters
  console.log("\n[REQUEST PARAMS]");
  console.log(THIN_SEPARATOR);
  const params = {
    model: requestOptions.model || DEFAULT_MODEL,
  };
  if (requestOptions.temperature !== undefined) {
    params.temperature = requestOptions.temperature;
  }
  if (requestOptions.max_tokens !== undefined) {
    params.max_tokens = requestOptions.max_tokens;
  }
  console.log(JSON.stringify(params, null, 2));

  const choice = response.choices?.[0];

  // Print parsed component info
  if (choice?.message?.parsed) {
    const parsed = choice.message.parsed;

    console.log("\n[MODIFICATION DETAILS]");
    console.log(THIN_SEPARATOR);
    const details = {
      componentName: parsed.componentName,
      changesApplied: parsed.changesApplied,
      description: parsed.description,
    };
    console.log(JSON.stringify(details, null, 2));

    console.log("\n[MODIFIED CODE]");
    console.log(THIN_SEPARATOR);
    if (parsed.modifiedCode) {
      console.log(parsed.modifiedCode);
    }

    if (parsed.explanation) {
      console.log("\n[EXPLANATION]");
      console.log(THIN_SEPARATOR);
      console.log(parsed.explanation);
    }

    if (parsed.stateInstructions) {
      console.log("\n[STATE INSTRUCTIONS]");
      console.log(THIN_SEPARATOR);
      console.log(parsed.stateInstructions);
    }

    if (parsed.apiIntegration) {
      console.log("\n[API INTEGRATION DETAILS]");
      console.log(THIN_SEPARATOR);
      console.log(JSON.stringify(parsed.apiIntegration, null, 2));
    }
  }

  // Print parse error if any
  if (choice?.message?.parseError) {
    console.log("\n[PARSE ERROR]");
    console.log(THIN_SEPARATOR);
    console.log(choice.message.parseError);
    console.log("\n[RAW CONTENT]");
    console.log(THIN_SEPARATOR);
    console.log(choice.message.content);
  }

  // Print raw content for non-parsed responses
  if (
    choice &&
    !choice.message?.parsed &&
    choice.message?.content &&
    !choice.message?.parseError
  ) {
    console.log("\n[RAW CONTENT]");
    console.log(THIN_SEPARATOR);
    console.log(choice.message.content);
  }

  // Print finish reason
  if (choice?.finish_reason) {
    console.log("\n[FINISH REASON]");
    console.log(THIN_SEPARATOR);
    console.log(choice.finish_reason);
  }

  // Print metadata
  console.log("\n[METADATA]");
  console.log(THIN_SEPARATOR);
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
    console.log(THIN_SEPARATOR);
    const usageDict = {
      prompt_tokens: response.usage.prompt_tokens,
      completion_tokens: response.usage.completion_tokens,
      total_tokens: response.usage.total_tokens,
    };
    console.log(JSON.stringify(usageDict, null, 2));
  }

  console.log(`\n${SEPARATOR}\n`);
}

// =============================================================================
// Client Creation
// =============================================================================

/**
 * Creates a configured undici client options object.
 * @param {Object} options - Configuration options
 * @returns {Object} Client configuration
 */
function createClientConfig(options = {}) {
  const {
    apiKey = process.env.GEMINI_API_KEY,
    baseUrl = DEFAULT_BASE_URL,
    proxy = null,
    cert = null,
    caBundle = null,
    customHeaders = {},
    timeout = DEFAULT_TIMEOUT,
    maxConnections = DEFAULT_MAX_CONNECTIONS,
  } = options;

  if (!apiKey) {
    throw new Error(
      "API key required. Pass apiKey option or set GEMINI_API_KEY environment variable."
    );
  }

  // Build headers
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    ...customHeaders,
  };

  // Build agent options
  const agentOptions = {
    connections: maxConnections,
    pipelining: 1,
    keepAliveTimeout: 5000,
    keepAliveMaxTimeout: 30000,
  };

  // Add TLS options if cert or caBundle provided
  if (cert || caBundle) {
    agentOptions.connect = {};
    if (caBundle) {
      agentOptions.connect.ca = readFileSync(caBundle);
    }
    if (cert) {
      if (typeof cert === "string") {
        agentOptions.connect.cert = readFileSync(cert);
      } else if (Array.isArray(cert)) {
        agentOptions.connect.cert = readFileSync(cert[0]);
        agentOptions.connect.key = readFileSync(cert[1]);
      }
    }
  }

  return {
    baseUrl,
    headers,
    timeout,
    proxy,
    agent: new Agent(agentOptions),
  };
}

// =============================================================================
// Schema Definition Functions
// =============================================================================

/**
 * Defines a schema for React component modification with API integration.
 * @param {string} componentName - Name of the component being modified
 * @param {string[]} changes - List of changes to apply
 * @param {string} apiEndpoint - The API endpoint to integrate
 * @param {string} responseField - The field to extract from API response
 * @returns {Object} Schema definition with system prompt
 */
function defineReactAPIIntegrationSchema(
  componentName,
  changes,
  apiEndpoint,
  responseField
) {
  const changesText = changes
    .map((change, i) => `  ${i + 1}. ${change}`)
    .join("\n");

  const systemPrompt = `You are a React component modifier specializing in API integration. You will receive a React component and a list of changes to apply.

Your task:
1. Apply ALL the requested changes to the component
2. Add API integration with proper state management (useState, useEffect)
3. Handle loading and error states
4. Return the result as a JSON object

API Integration Details:
- Endpoint: ${apiEndpoint}
- Extract: ${responseField}

Changes to apply:
${changesText}

Output Format - Respond with ONLY valid JSON (no markdown, no code blocks, no backticks):
{
  "componentName": "${componentName}",
  "description": "Brief description of the component and its purpose",
  "changesApplied": [
    "Description of each change that was applied"
  ],
  "modifiedCode": "The complete modified React component code as a string",
  "explanation": "Detailed explanation of all modifications made",
  "stateInstructions": "Description of state variables and their purposes",
  "props": {
    "propName": { "type": "string", "description": "prop description" }
  },
  "imports": ["list of import statements needed"],
  "apiIntegration": {
    "endpoint": "${apiEndpoint}",
    "method": "GET",
    "dataPath": "response path to data",
    "displayField": "${responseField}"
  }
}

Important:
- Apply ALL requested changes
- Use React hooks (useState, useEffect) for state management
- Handle loading state while fetching
- Handle error state if fetch fails
- Display the data in a user-friendly manner
- Preserve existing functionality that wasn't requested to change
- Use proper React/JSX syntax
- Include all necessary imports
- The modifiedCode should be complete and ready to use`;

  return {
    name: `${componentName}APIIntegration`,
    componentName,
    changes,
    apiEndpoint,
    responseField,
    systemPrompt,
  };
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Performs a chat completion request for React component with API integration.
 * @param {Object} clientConfig - Client configuration from createClientConfig()
 * @param {Array} messages - Array of message objects with role and content
 * @param {Object} integrationSchema - Schema from defineReactAPIIntegrationSchema()
 * @param {Object} options - Request options
 * @returns {Promise<Object>} Chat completion response with parsed modification
 */
async function chatCompletionWithAPIIntegration(
  clientConfig,
  messages,
  integrationSchema,
  options = {}
) {
  const {
    model = DEFAULT_MODEL,
    temperature,
    max_tokens,
    top_p,
    n,
    stop,
    ...kwargs
  } = options;

  if (!messages || !Array.isArray(messages)) {
    throw new Error("messages is required and must be an array");
  }

  if (!integrationSchema) {
    throw new Error("integrationSchema is required for API integration");
  }

  // Merge system prompts
  const messagesWithSchema = [];
  let hasSystemMessage = false;

  for (const msg of messages) {
    if (msg.role === "system") {
      messagesWithSchema.push({
        role: "system",
        content: `${integrationSchema.systemPrompt}\n\nAdditional instructions: ${msg.content}`,
      });
      hasSystemMessage = true;
    } else {
      messagesWithSchema.push(msg);
    }
  }

  if (!hasSystemMessage) {
    messagesWithSchema.unshift({
      role: "system",
      content: integrationSchema.systemPrompt,
    });
  }

  // Build request body
  const body = {
    model,
    messages: messagesWithSchema,
  };

  if (temperature !== undefined) body.temperature = temperature;
  if (max_tokens !== undefined) body.max_tokens = max_tokens;
  if (top_p !== undefined) body.top_p = top_p;
  if (n !== undefined) body.n = n;
  if (stop !== undefined) body.stop = stop;

  Object.assign(body, kwargs);

  // Build request options
  const requestOptions = {
    method: "POST",
    headers: clientConfig.headers,
    body: JSON.stringify(body),
    bodyTimeout: clientConfig.timeout,
    headersTimeout: clientConfig.timeout,
  };

  // Add dispatcher (agent) if available
  if (clientConfig.agent) {
    requestOptions.dispatcher = clientConfig.agent;
  }

  // Make request
  const url = `${clientConfig.baseUrl}/chat/completions`;
  const response = await request(url, requestOptions);

  if (response.statusCode !== 200) {
    const errorBody = await response.body.text();
    throw new Error(`API error (${response.statusCode}): ${errorBody}`);
  }

  const data = await response.body.json();

  // Parse choices and extract JSON
  const choices = [];
  for (const choiceData of data.choices || []) {
    const messageData = choiceData.message || {};
    let content = messageData.content || "";
    let parsed = null;
    let rawJson = null;
    let parseError = null;

    if (content) {
      try {
        // Clean up the content (remove markdown code blocks if present)
        rawJson = content.trim();
        if (rawJson.startsWith("```json")) {
          rawJson = rawJson.slice(7);
        } else if (rawJson.startsWith("```")) {
          rawJson = rawJson.slice(3);
        }
        if (rawJson.endsWith("```")) {
          rawJson = rawJson.slice(0, -3);
        }
        rawJson = rawJson.trim();

        parsed = JSON.parse(rawJson);
      } catch (e) {
        parseError = e.message;
      }
    }

    choices.push({
      index: choiceData.index || 0,
      message: {
        role: messageData.role || "",
        content,
        parsed,
        rawJson,
        parseError,
      },
      finish_reason: choiceData.finish_reason,
    });
  }

  return {
    id: data.id || "",
    object: data.object || "",
    created: data.created || 0,
    model: data.model || "",
    choices,
    usage: data.usage || null,
  };
}

// =============================================================================
// Main Execution
// =============================================================================

async function main() {
  logProgress(
    "INIT",
    "Starting Gemini React Component Modifier with API Integration..."
  );

  // Create client configuration
  logProgress("CLIENT", "Creating client configuration...");
  const clientConfig = createClientConfig({
    // apiKey: "your-api-key",           // Or use GEMINI_API_KEY env
    // baseUrl: "custom-url",             // Override base URL
    // proxy: "http://proxy:8080",        // Proxy server
    // cert: "/path/to/cert.pem",         // Client certificate
    // caBundle: "/path/to/ca.pem",       // CA bundle
    // customHeaders: { "X-Custom": "value" },
    // timeout: 60000,                    // 60 second timeout
    // maxConnections: 20,                // Max connections
  });
  logProgress("CLIENT", "Client created successfully");

  // Original React component code (RAG-style template input)
  const originalCode = `import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

const bull = (
  <Box
    component="span"
    sx={{ display: 'inline-block', mx: '2px', transform: 'scale(0.8)' }}
  >
    •
  </Box>
);

export default function BasicCard() {
  return (
    <Card sx={{ minWidth: 275 }}>
      <CardContent>
        <Typography gutterBottom sx={{ color: 'text.secondary', fontSize: 14 }}>
          Word of the Day
        </Typography>
        <Typography variant="h5" component="div">
          be{bull}nev{bull}o{bull}lent
        </Typography>
        <Typography sx={{ color: 'text.secondary', mb: 1.5 }}>adjective</Typography>
        <Typography variant="body2">
          well meaning and kindly.
          <br />
          {'"a benevolent smile"'}
        </Typography>
      </CardContent>
      <CardActions>
        <Button size="small">Learn More</Button>
      </CardActions>
    </Card>
  );
}`;

  // API integration details
  const apiEndpoint = "https://api.nobelprize.org/v1/prize.json";
  const responseField = "firstname";

  // Requested changes
  const changes = [
    "Add service call to https://api.nobelprize.org/v1/prize.json using useEffect",
    "Display firstname of each laureate from response.prizes[].laureates[].firstname",
    "Add loading state while fetching data",
    "Add error handling for failed requests",
    "Replace 'Word of the Day' section with list of Nobel Prize laureate firstnames",
  ];

  logProgress("INPUT", "Preparing component modification request...");
  logProgress("INPUT", "Component: BasicCard");
  logProgress("INPUT", `API Endpoint: ${apiEndpoint}`);
  logProgress("INPUT", `Response Field: ${responseField}`);
  logProgress("INPUT", `Changes requested: ${changes.length}`);

  try {
    // Create integration schema
    const integrationSchema = defineReactAPIIntegrationSchema(
      "BasicCard",
      changes,
      apiEndpoint,
      responseField
    );
    logProgress("SCHEMA", "Created API integration schema");

    // Build user prompt with template (RAG-style)
    const userPrompt = `Please modify the following React component to integrate with the Nobel Prize API.

ORIGINAL COMPONENT:
\`\`\`jsx
${originalCode}
\`\`\`

API DETAILS:
- Endpoint: ${apiEndpoint}
- Response structure: { prizes: [{ laureates: [{ firstname: "string", ... }] }] }
- Extract and display: firstname of each laureate

Apply all the changes listed in the system prompt and return the modified component with full API integration.`;

    const requestOptions = {
      model: "gemini-2.0-flash",
      temperature: 0.2, // Lower temperature for consistent output
      max_tokens: 4096,
    };

    logProgress("API", "Sending modification request to Gemini API...");
    const response = await chatCompletionWithAPIIntegration(
      clientConfig,
      [
        {
          role: "system",
          content:
            "Apply changes precisely while maintaining code quality. Ensure proper React hooks usage.",
        },
        { role: "user", content: userPrompt },
      ],
      integrationSchema,
      requestOptions
    );
    logProgress("API", "Received response from API");

    logProgress("FORMAT", "Formatting output...");
    formatOutput(originalCode, changes, response, requestOptions);

    // Print summary
    if (response.choices?.[0]?.message?.parsed) {
      const parsed = response.choices[0].message.parsed;
      logProgress("RESULT", "Modification completed successfully");
      logProgress("RESULT", `Component: ${parsed.componentName || "N/A"}`);
      const changesApplied = parsed.changesApplied || [];
      logProgress("RESULT", `Changes applied: ${changesApplied.length}`);
      changesApplied.forEach((change, i) => {
        logProgress("RESULT", `  ${i + 1}. ${change}`);
      });

      if (parsed.apiIntegration) {
        logProgress(
          "RESULT",
          `API Endpoint: ${parsed.apiIntegration.endpoint || "N/A"}`
        );
        logProgress(
          "RESULT",
          `Display Field: ${parsed.apiIntegration.displayField || "N/A"}`
        );
      }
    } else {
      logProgress("WARN", "Could not parse structured response");
    }

    logProgress(
      "COMPLETE",
      "React component modification with API integration completed successfully"
    );
  } catch (error) {
    logProgress("ERROR", `Request failed: ${error.message}`);
    process.exit(1);
  } finally {
    // Close the agent to release connections
    if (clientConfig.agent) {
      await clientConfig.agent.close();
    }
  }
}

main();
