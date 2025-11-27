#!/usr/bin/env node
/**
 * Gemini OpenAI-Compatible REST API Client - React Component with Annotated Comments
 * Single-file implementation using Node.js 23+ with undici
 *
 * Features:
 * - Two-step approach: Annotate original code, then generate modified version
 * - Adds inline comments to original code indicating required changes
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
 * - Step 1: Annotate original React component with comments showing where changes are needed
 * - Step 2: Generate the modified component with API integration
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
 * Formats and prints the annotation response.
 * @param {string} originalCode - The original React code
 * @param {string[]} changes - List of requested changes
 * @param {Object} response - The API response object
 * @param {Object} requestOptions - The request options used
 * @returns {string|null} The annotated code if successfully parsed
 */
function formatAnnotationOutput(
  originalCode,
  changes,
  response,
  requestOptions = {}
) {
  console.log(`\n${SEPARATOR}`);
  console.log("  STEP 1: CODE ANNOTATION");
  console.log(SEPARATOR);

  // Print the question/task first for UX context
  console.log("\n[TASK DESCRIPTION]");
  console.log(THIN_SEPARATOR);
  console.log("Annotate React component with comments indicating required changes");
  console.log("API: https://api.nobelprize.org/v1/prize.json");
  console.log("Goal: Add inline comments showing where modifications are needed");

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
  console.log("\n[CHANGES TO ANNOTATE]");
  console.log(THIN_SEPARATOR);
  changes.forEach((change, i) => {
    console.log(`  ${i + 1}. ${change}`);
  });

  const choice = response.choices?.[0];
  let annotatedCode = null;

  // Print parsed annotation info
  if (choice?.message?.parsed) {
    const parsed = choice.message.parsed;

    console.log("\n[ANNOTATION SUMMARY]");
    console.log(THIN_SEPARATOR);
    const summary = {
      totalAnnotations: parsed.totalAnnotations,
      annotationTypes: parsed.annotationTypes,
      sectionsModified: parsed.sectionsModified,
    };
    console.log(JSON.stringify(summary, null, 2));

    console.log("\n[ANNOTATED CODE]");
    console.log(THIN_SEPARATOR);
    if (parsed.annotatedCode) {
      annotatedCode = parsed.annotatedCode;
      console.log(annotatedCode);
    }

    if (parsed.annotationLegend) {
      console.log("\n[ANNOTATION LEGEND]");
      console.log(THIN_SEPARATOR);
      for (const item of parsed.annotationLegend) {
        console.log(`  ${item.marker || "?"}: ${item.description || "N/A"}`);
      }
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

  return annotatedCode;
}

/**
 * Formats and prints the modification response.
 * @param {string} annotatedCode - The annotated React code
 * @param {string[]} changes - List of requested changes
 * @param {Object} response - The API response object
 * @param {Object} requestOptions - The request options used
 */
function formatModificationOutput(
  annotatedCode,
  changes,
  response,
  requestOptions = {}
) {
  console.log(`\n${SEPARATOR}`);
  console.log("  STEP 2: CODE MODIFICATION (FROM ANNOTATIONS)");
  console.log(SEPARATOR);

  // Print the question/task first for UX context
  console.log("\n[TASK DESCRIPTION]");
  console.log(THIN_SEPARATOR);
  console.log("Generate modified React component based on annotations");
  console.log("API: https://api.nobelprize.org/v1/prize.json");
  console.log("Goal: Implement all annotated changes with proper React hooks");

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

    if (parsed.annotationsResolved) {
      console.log("\n[ANNOTATIONS RESOLVED]");
      console.log(THIN_SEPARATOR);
      for (const item of parsed.annotationsResolved) {
        const status = item.resolved ? "DONE" : "PENDING";
        console.log(`  [${status}] ${item.annotation || "N/A"}`);
      }
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
 * Defines a schema for annotating React component with change comments.
 * @param {string} componentName - Name of the component being annotated
 * @param {string[]} changes - List of changes to annotate
 * @param {string} apiEndpoint - The API endpoint to integrate
 * @returns {Object} Schema definition with system prompt
 */
function defineAnnotationSchema(componentName, changes, apiEndpoint) {
  const changesText = changes
    .map((change, i) => `  ${i + 1}. ${change}`)
    .join("\n");

  const systemPrompt = `You are a code annotator specializing in React components. Your task is to add inline comments to the original code that indicate where changes need to be made.

IMPORTANT: You must return the ORIGINAL code with ADDED comments. Do NOT modify the actual code logic yet.

Changes to annotate:
${changesText}

API to integrate: ${apiEndpoint}

Comment Format Guidelines:
- Use // @TODO: for changes that need to be made
- Use // @ADD: for new code that needs to be added
- Use // @REMOVE: for code that should be removed
- Use // @REPLACE: for code that should be replaced
- Use // @HOOK: for React hooks that need to be added
- Use // @STATE: for state variables needed
- Use // @EFFECT: for useEffect hooks needed
- Use // @API: for API integration points

Output Format - Respond with ONLY valid JSON (no markdown, no code blocks, no backticks):
{
  "componentName": "${componentName}",
  "annotatedCode": "The original code with inline annotation comments added",
  "totalAnnotations": 0,
  "annotationTypes": {
    "TODO": 0,
    "ADD": 0,
    "REMOVE": 0,
    "REPLACE": 0,
    "HOOK": 0,
    "STATE": 0,
    "EFFECT": 0,
    "API": 0
  },
  "sectionsModified": ["list of sections that have annotations"],
  "annotationLegend": [
    { "marker": "@TODO", "description": "General change needed" },
    { "marker": "@ADD", "description": "New code to add" },
    { "marker": "@REMOVE", "description": "Code to remove" },
    { "marker": "@REPLACE", "description": "Code to replace" },
    { "marker": "@HOOK", "description": "React hook needed" },
    { "marker": "@STATE", "description": "State variable needed" },
    { "marker": "@EFFECT", "description": "useEffect needed" },
    { "marker": "@API", "description": "API integration point" }
  ]
}

Important:
- Keep the original code structure intact
- Only ADD comments, do not change the actual code
- Place comments on the line ABOVE the code they reference
- Be specific about what change is needed at each annotation
- Include line-specific context in each annotation`;

  return {
    name: `${componentName}Annotator`,
    componentName,
    changes,
    apiEndpoint,
    systemPrompt,
  };
}

/**
 * Defines a schema for modifying annotated React component.
 * @param {string} componentName - Name of the component being modified
 * @param {string[]} changes - List of changes to apply
 * @param {string} apiEndpoint - The API endpoint to integrate
 * @param {string} responseField - The field to extract from API response
 * @returns {Object} Schema definition with system prompt
 */
function defineModificationSchema(
  componentName,
  changes,
  apiEndpoint,
  responseField
) {
  const changesText = changes
    .map((change, i) => `  ${i + 1}. ${change}`)
    .join("\n");

  const systemPrompt = `You are a React component modifier. You will receive an ANNOTATED React component with inline comments indicating required changes.

Your task:
1. Read and understand ALL annotations (marked with @TODO, @ADD, @REMOVE, @REPLACE, @HOOK, @STATE, @EFFECT, @API)
2. Implement ALL the annotated changes
3. Remove the annotation comments after implementing
4. Add proper React hooks (useState, useEffect) for API integration
5. Handle loading and error states
6. Return the result as a JSON object

API Integration Details:
- Endpoint: ${apiEndpoint}
- Extract: ${responseField}

Original change requests:
${changesText}

Output Format - Respond with ONLY valid JSON (no markdown, no code blocks, no backticks):
{
  "componentName": "${componentName}",
  "description": "Brief description of the component and its purpose",
  "changesApplied": [
    "Description of each change that was applied"
  ],
  "modifiedCode": "The complete modified React component code (annotations resolved, no comment markers)",
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
  },
  "annotationsResolved": [
    { "annotation": "@TODO: description", "resolved": true, "implementation": "how it was resolved" }
  ]
}

Important:
- Resolve ALL annotations from the input code
- Use React hooks (useState, useEffect) for state management
- Handle loading state while fetching
- Handle error state if fetch fails
- Display the data in a user-friendly manner
- Remove all annotation comments from the final code
- The modifiedCode should be complete and ready to use`;

  return {
    name: `${componentName}Modifier`,
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
 * Performs a structured chat completion request.
 * @param {Object} clientConfig - Client configuration from createClientConfig()
 * @param {Array} messages - Array of message objects with role and content
 * @param {Object} schema - Schema with systemPrompt
 * @param {Object} options - Request options
 * @returns {Promise<Object>} Chat completion response with parsed content
 */
async function chatCompletionWithSchema(
  clientConfig,
  messages,
  schema,
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

  if (!schema) {
    throw new Error("schema is required");
  }

  // Merge system prompts
  const messagesWithSchema = [];
  let hasSystemMessage = false;

  for (const msg of messages) {
    if (msg.role === "system") {
      messagesWithSchema.push({
        role: "system",
        content: `${schema.systemPrompt}\n\nAdditional instructions: ${msg.content}`,
      });
      hasSystemMessage = true;
    } else {
      messagesWithSchema.push(msg);
    }
  }

  if (!hasSystemMessage) {
    messagesWithSchema.unshift({
      role: "system",
      content: schema.systemPrompt,
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
  logProgress("INIT", "Starting Gemini React Component Annotator & Modifier...");
  logProgress("INIT", "Two-step approach: 1) Annotate code, 2) Generate modifications");

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

  logProgress("INPUT", "Preparing annotation request...");
  logProgress("INPUT", "Component: BasicCard");
  logProgress("INPUT", `API Endpoint: ${apiEndpoint}`);
  logProgress("INPUT", `Changes requested: ${changes.length}`);

  const requestOptions = {
    model: "gemini-2.0-flash",
    temperature: 0.2,
    max_tokens: 4096,
  };

  try {
    // =========================================================================
    // STEP 1: Annotate the original code
    // =========================================================================
    logProgress("STEP1", "Creating annotation schema...");
    const annotationSchema = defineAnnotationSchema(
      "BasicCard",
      changes,
      apiEndpoint
    );
    logProgress("STEP1", "Annotation schema created");

    const annotationPrompt = `Please annotate the following React component with inline comments indicating where changes need to be made.

ORIGINAL COMPONENT:
\`\`\`jsx
${originalCode}
\`\`\`

Add annotation comments (using @TODO, @ADD, @REMOVE, @REPLACE, @HOOK, @STATE, @EFFECT, @API markers) to indicate:
1. Where to add React hooks imports
2. Where to add state variables
3. Where to add useEffect for API call
4. Which sections to modify or replace
5. Where to display the fetched data

Return the original code with annotations added.`;

    logProgress("STEP1", "Sending annotation request to Gemini API...");
    const annotationResponse = await chatCompletionWithSchema(
      clientConfig,
      [
        {
          role: "system",
          content: "Add clear, specific annotations to guide the modification process.",
        },
        { role: "user", content: annotationPrompt },
      ],
      annotationSchema,
      requestOptions
    );
    logProgress("STEP1", "Received annotation response from API");

    logProgress("FORMAT", "Formatting annotation output...");
    let annotatedCode = formatAnnotationOutput(
      originalCode,
      changes,
      annotationResponse,
      requestOptions
    );

    if (!annotatedCode) {
      logProgress(
        "ERROR",
        "Failed to get annotated code, using original with manual annotations"
      );
      // Fallback: create basic annotations manually
      const parts = originalCode.split("export default");
      annotatedCode = `// @HOOK: Add useState and useEffect imports here
${parts[0]}
// @STATE: Add state variables: laureates, loading, error
// @EFFECT: Add useEffect to fetch from ${apiEndpoint}
// @API: Fetch data and extract firstname from response.prizes[].laureates[]
export default${parts[1]}`;
    }

    // =========================================================================
    // STEP 2: Generate modified code from annotations
    // =========================================================================
    logProgress("STEP2", "Creating modification schema...");
    const modificationSchema = defineModificationSchema(
      "BasicCard",
      changes,
      apiEndpoint,
      responseField
    );
    logProgress("STEP2", "Modification schema created");

    const modificationPrompt = `Please implement all the annotated changes in the following React component.

ANNOTATED COMPONENT (with @TODO, @ADD, @REMOVE, @REPLACE, @HOOK, @STATE, @EFFECT, @API markers):
\`\`\`jsx
${annotatedCode}
\`\`\`

API DETAILS:
- Endpoint: ${apiEndpoint}
- Response structure: { prizes: [{ laureates: [{ firstname: "string", ... }] }] }
- Extract and display: firstname of each laureate

Resolve ALL annotations and return the complete, working modified component.`;

    logProgress("STEP2", "Sending modification request to Gemini API...");
    const modificationResponse = await chatCompletionWithSchema(
      clientConfig,
      [
        {
          role: "system",
          content:
            "Implement all annotations precisely. Ensure proper React hooks usage.",
        },
        { role: "user", content: modificationPrompt },
      ],
      modificationSchema,
      requestOptions
    );
    logProgress("STEP2", "Received modification response from API");

    logProgress("FORMAT", "Formatting modification output...");
    formatModificationOutput(
      annotatedCode,
      changes,
      modificationResponse,
      requestOptions
    );

    // Print final summary
    console.log(`\n${SEPARATOR}`);
    console.log("  FINAL SUMMARY");
    console.log(SEPARATOR);

    if (annotationResponse.choices?.[0]?.message?.parsed) {
      const parsedAnnotation = annotationResponse.choices[0].message.parsed;
      console.log("\n[ANNOTATION STATS]");
      console.log(THIN_SEPARATOR);
      console.log(
        `  Total annotations added: ${parsedAnnotation.totalAnnotations || "N/A"}`
      );
      if (parsedAnnotation.annotationTypes) {
        for (const [marker, count] of Object.entries(
          parsedAnnotation.annotationTypes
        )) {
          if (count > 0) {
            console.log(`    @${marker}: ${count}`);
          }
        }
      }
    }

    if (modificationResponse.choices?.[0]?.message?.parsed) {
      const parsedMod = modificationResponse.choices[0].message.parsed;
      console.log("\n[MODIFICATION STATS]");
      console.log(THIN_SEPARATOR);
      console.log(`  Component: ${parsedMod.componentName || "N/A"}`);
      const changesApplied = parsedMod.changesApplied || [];
      console.log(`  Changes applied: ${changesApplied.length}`);

      if (parsedMod.annotationsResolved) {
        const resolved = parsedMod.annotationsResolved.filter((a) => a.resolved);
        console.log(
          `  Annotations resolved: ${resolved.length}/${parsedMod.annotationsResolved.length}`
        );
      }
    }

    // Print combined usage
    let totalPrompt = 0;
    let totalCompletion = 0;
    if (annotationResponse.usage) {
      totalPrompt += annotationResponse.usage.prompt_tokens;
      totalCompletion += annotationResponse.usage.completion_tokens;
    }
    if (modificationResponse.usage) {
      totalPrompt += modificationResponse.usage.prompt_tokens;
      totalCompletion += modificationResponse.usage.completion_tokens;
    }

    console.log("\n[TOTAL USAGE]");
    console.log(THIN_SEPARATOR);
    console.log(
      JSON.stringify(
        {
          total_prompt_tokens: totalPrompt,
          total_completion_tokens: totalCompletion,
          total_tokens: totalPrompt + totalCompletion,
        },
        null,
        2
      )
    );

    console.log(`\n${SEPARATOR}\n`);

    logProgress(
      "COMPLETE",
      "Two-step annotation and modification completed successfully"
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
