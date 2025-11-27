#!/usr/bin/env node
/**
 * Gemini OpenAI-Compatible REST API Client - React Component with User Annotations
 * Single-file implementation using Node.js 23+ with undici
 *
 * Features:
 * - User can add their own annotations/comments to original code
 * - Two-step approach: Enhance annotations, then generate modified version
 * - Preserves and respects user-provided annotations
 * - Shows user annotations alongside AI-generated annotations in resolved output
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
 * - User adds their own annotations to guide the modification
 * - AI enhances with additional annotations
 * - Both user and AI annotations are tracked and resolved
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

// Annotation markers
const ANNOTATION_MARKERS = [
  "@TODO",
  "@ADD",
  "@REMOVE",
  "@REPLACE",
  "@HOOK",
  "@STATE",
  "@EFFECT",
  "@API",
  "@USER", // Special marker for user annotations
  "@NOTE", // User notes/context
  "@HINT", // User hints for AI
];

// =============================================================================
// Annotation Parsing Functions
// =============================================================================

/**
 * Extracts annotations from code and counts by type.
 * @param {string} code - Source code with annotations
 * @returns {{ annotations: Array, counts: Object }} Annotations and counts
 */
function extractAnnotations(code) {
  const annotations = [];
  const counts = {};
  for (const marker of ANNOTATION_MARKERS) {
    counts[marker.slice(1)] = 0; // Remove @ prefix for key
  }

  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    for (const marker of ANNOTATION_MARKERS) {
      // Match patterns like // @TODO: description or /* @TODO: description */
      const pattern = new RegExp(
        `(?:\\/\\/|#|{\\/\\*)\\s*(${marker.replace("@", "@")}):\\s*(.+?)(?:\\s*\\*\\/})?$`
      );
      const match = line.match(pattern);

      if (match) {
        const markerFound = match[1];
        const content = match[2].trim();
        const markerKey = markerFound.slice(1); // Remove @

        // Determine source based on marker
        const source = ["@USER", "@NOTE", "@HINT"].includes(markerFound)
          ? "user"
          : "ai";

        annotations.push({
          marker: markerFound,
          content,
          lineNumber,
          source,
          resolved: false,
          implementation: null,
        });

        counts[markerKey] = (counts[markerKey] || 0) + 1;
      }
    }
  }

  return { annotations, counts };
}

/**
 * Formats annotations for display output.
 * @param {Array} annotations - List of annotation objects
 * @returns {string} Formatted string
 */
function formatAnnotationsForDisplay(annotations) {
  if (!annotations || annotations.length === 0) {
    return "  No annotations found";
  }

  const lines = [];
  const userAnnotations = annotations.filter((a) => a.source === "user");
  const aiAnnotations = annotations.filter((a) => a.source === "ai");

  if (userAnnotations.length > 0) {
    lines.push("  [USER ANNOTATIONS]");
    for (const ann of userAnnotations) {
      const status = ann.resolved ? "DONE" : "PENDING";
      const lineInfo = ann.lineNumber ? `L${ann.lineNumber}` : "?";
      lines.push(`    [${status}] ${lineInfo} ${ann.marker}: ${ann.content}`);
      if (ann.implementation) {
        lines.push(`           -> ${ann.implementation}`);
      }
    }
  }

  if (aiAnnotations.length > 0) {
    if (userAnnotations.length > 0) {
      lines.push("");
    }
    lines.push("  [AI ANNOTATIONS]");
    for (const ann of aiAnnotations) {
      const status = ann.resolved ? "DONE" : "PENDING";
      const lineInfo = ann.lineNumber ? `L${ann.lineNumber}` : "?";
      lines.push(`    [${status}] ${lineInfo} ${ann.marker}: ${ann.content}`);
      if (ann.implementation) {
        lines.push(`           -> ${ann.implementation}`);
      }
    }
  }

  return lines.join("\n");
}

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
 * @param {string} originalCode - The original React code (with user annotations)
 * @param {Array} userAnnotations - User-provided annotations
 * @param {string[]} changes - List of requested changes
 * @param {Object} response - The API response object
 * @param {Object} requestOptions - The request options used
 * @returns {string|null} The annotated code if successfully parsed
 */
function formatAnnotationOutput(
  originalCode,
  userAnnotations,
  changes,
  response,
  requestOptions = {}
) {
  console.log(`\n${SEPARATOR}`);
  console.log("  STEP 1: CODE ANNOTATION (WITH USER HINTS)");
  console.log(SEPARATOR);

  // Print the question/task first for UX context
  console.log("\n[TASK DESCRIPTION]");
  console.log(THIN_SEPARATOR);
  console.log("Enhance React component annotations based on user hints");
  console.log("API: https://api.nobelprize.org/v1/prize.json");
  console.log("Goal: Combine user annotations with AI-generated annotations");

  // Print user annotations summary
  if (userAnnotations && userAnnotations.length > 0) {
    console.log("\n[USER-PROVIDED ANNOTATIONS]");
    console.log(THIN_SEPARATOR);
    for (const ann of userAnnotations) {
      console.log(`  L${ann.lineNumber || "?"} ${ann.marker}: ${ann.content}`);
    }
  } else {
    console.log("\n[USER-PROVIDED ANNOTATIONS]");
    console.log(THIN_SEPARATOR);
    console.log("  None provided");
  }

  // Print the original code (truncated for display)
  console.log("\n[ORIGINAL CODE (WITH USER ANNOTATIONS)]");
  console.log(THIN_SEPARATOR);
  const lines = originalCode.trim().split("\n");
  if (lines.length > 20) {
    console.log(lines.slice(0, 15).join("\n"));
    console.log(`  ... (${lines.length - 15} more lines)`);
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
      userAnnotationsPreserved: parsed.userAnnotationsPreserved,
      aiAnnotationsAdded: parsed.aiAnnotationsAdded,
      annotationTypes: parsed.annotationTypes,
    };
    console.log(JSON.stringify(summary, null, 2));

    console.log("\n[ANNOTATED CODE (ENHANCED)]");
    console.log(THIN_SEPARATOR);
    if (parsed.annotatedCode) {
      annotatedCode = parsed.annotatedCode;
      console.log(annotatedCode);
    }

    if (parsed.userAnnotationContext) {
      console.log("\n[USER ANNOTATION CONTEXT]");
      console.log(THIN_SEPARATOR);
      for (const ctx of parsed.userAnnotationContext) {
        console.log(`  ${ctx.marker || "?"}: ${ctx.interpretation || "N/A"}`);
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
  console.log("  STEP 2: CODE MODIFICATION (USER + AI ANNOTATIONS)");
  console.log(SEPARATOR);

  // Print the question/task first for UX context
  console.log("\n[TASK DESCRIPTION]");
  console.log(THIN_SEPARATOR);
  console.log("Generate modified React component resolving all annotations");
  console.log("API: https://api.nobelprize.org/v1/prize.json");
  console.log("Goal: Implement user hints and AI annotations with proper React hooks");

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

    // Print annotations resolved - separated by source
    if (parsed.annotationsResolved) {
      console.log("\n[ANNOTATIONS RESOLVED]");
      console.log(THIN_SEPARATOR);

      const userResolved = parsed.annotationsResolved.filter(
        (a) => a.source === "user"
      );
      const aiResolved = parsed.annotationsResolved.filter(
        (a) => a.source !== "user"
      );

      if (userResolved.length > 0) {
        console.log("\n  --- USER ANNOTATIONS ---");
        for (const item of userResolved) {
          const status = item.resolved ? "DONE" : "PENDING";
          console.log(`  [${status}] ${item.annotation || "N/A"}`);
          if (item.implementation) {
            console.log(`          -> ${item.implementation}`);
          }
        }
      }

      if (aiResolved.length > 0) {
        console.log("\n  --- AI ANNOTATIONS ---");
        for (const item of aiResolved) {
          const status = item.resolved ? "DONE" : "PENDING";
          console.log(`  [${status}] ${item.annotation || "N/A"}`);
          if (item.implementation) {
            console.log(`          -> ${item.implementation}`);
          }
        }
      }
    }

    // Print user hint acknowledgments
    if (parsed.userHintAcknowledgments) {
      console.log("\n[USER HINT ACKNOWLEDGMENTS]");
      console.log(THIN_SEPARATOR);
      for (const hint of parsed.userHintAcknowledgments) {
        console.log(`  Hint: ${hint.hint || "N/A"}`);
        console.log(`  Action: ${hint.actionTaken || "N/A"}`);
        console.log("");
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
 * Respects and enhances user-provided annotations.
 * @param {string} componentName - Name of the component being annotated
 * @param {string[]} changes - List of changes to annotate
 * @param {string} apiEndpoint - The API endpoint to integrate
 * @param {Array} userAnnotations - User-provided annotations
 * @returns {Object} Schema definition with system prompt
 */
function defineAnnotationSchema(
  componentName,
  changes,
  apiEndpoint,
  userAnnotations
) {
  const changesText = changes
    .map((change, i) => `  ${i + 1}. ${change}`)
    .join("\n");

  let userAnnotationsText = "";
  if (userAnnotations && userAnnotations.length > 0) {
    userAnnotationsText =
      "\n\nUser-provided annotations to PRESERVE and RESPECT:\n";
    for (const ann of userAnnotations) {
      userAnnotationsText += `  - Line ${ann.lineNumber || "?"}: ${ann.marker}: ${ann.content}\n`;
    }
    userAnnotationsText +=
      "\nIMPORTANT: Keep all user annotations (@USER, @NOTE, @HINT) intact. They provide important context.";
  }

  const systemPrompt = `You are a code annotator specializing in React components. Your task is to add inline comments to the code that indicate where changes need to be made.

IMPORTANT RULES:
1. PRESERVE all existing user annotations (@USER, @NOTE, @HINT markers)
2. ADD your own annotations (@TODO, @ADD, @REMOVE, @REPLACE, @HOOK, @STATE, @EFFECT, @API)
3. User annotations provide hints - use them to guide your annotations
4. Do NOT modify the actual code logic yet
${userAnnotationsText}

Changes to annotate:
${changesText}

API to integrate: ${apiEndpoint}

Comment Format Guidelines:
- // @USER: User-provided annotation (PRESERVE these)
- // @NOTE: User notes/context (PRESERVE these)
- // @HINT: User hints for AI (PRESERVE these and follow them)
- // @TODO: for changes that need to be made
- // @ADD: for new code that needs to be added
- // @REMOVE: for code that should be removed
- // @REPLACE: for code that should be replaced
- // @HOOK: for React hooks that need to be added
- // @STATE: for state variables needed
- // @EFFECT: for useEffect hooks needed
- // @API: for API integration points

Output Format - Respond with ONLY valid JSON (no markdown, no code blocks, no backticks):
{
  "componentName": "${componentName}",
  "annotatedCode": "The code with ALL annotations (user preserved + AI added)",
  "totalAnnotations": 0,
  "userAnnotationsPreserved": 0,
  "aiAnnotationsAdded": 0,
  "annotationTypes": {
    "USER": 0,
    "NOTE": 0,
    "HINT": 0,
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
  "userAnnotationContext": [
    { "marker": "@USER/@NOTE/@HINT", "original": "original text", "interpretation": "how AI interpreted this hint" }
  ],
  "annotationLegend": [
    { "marker": "@USER", "description": "User-provided annotation", "source": "user" },
    { "marker": "@NOTE", "description": "User context note", "source": "user" },
    { "marker": "@HINT", "description": "User hint for AI", "source": "user" },
    { "marker": "@TODO", "description": "General change needed", "source": "ai" },
    { "marker": "@ADD", "description": "New code to add", "source": "ai" },
    { "marker": "@REMOVE", "description": "Code to remove", "source": "ai" },
    { "marker": "@REPLACE", "description": "Code to replace", "source": "ai" },
    { "marker": "@HOOK", "description": "React hook needed", "source": "ai" },
    { "marker": "@STATE", "description": "State variable needed", "source": "ai" },
    { "marker": "@EFFECT", "description": "useEffect needed", "source": "ai" },
    { "marker": "@API", "description": "API integration point", "source": "ai" }
  ]
}`;

  return {
    name: `${componentName}Annotator`,
    componentName,
    changes,
    apiEndpoint,
    userAnnotations,
    systemPrompt,
  };
}

/**
 * Defines a schema for modifying annotated React component.
 * Tracks resolution of both user and AI annotations.
 * @param {string} componentName - Name of the component being modified
 * @param {string[]} changes - List of changes to apply
 * @param {string} apiEndpoint - The API endpoint to integrate
 * @param {string} responseField - The field to extract from API response
 * @param {Array} userAnnotations - User-provided annotations
 * @returns {Object} Schema definition with system prompt
 */
function defineModificationSchema(
  componentName,
  changes,
  apiEndpoint,
  responseField,
  userAnnotations
) {
  const changesText = changes
    .map((change, i) => `  ${i + 1}. ${change}`)
    .join("\n");

  let userHintsText = "";
  if (userAnnotations && userAnnotations.length > 0) {
    userHintsText =
      "\n\nUser annotations to address (mark as resolved with implementation details):\n";
    for (const ann of userAnnotations) {
      userHintsText += `  - ${ann.marker}: ${ann.content}\n`;
    }
  }

  const systemPrompt = `You are a React component modifier. You will receive an ANNOTATED React component with:
1. USER annotations (@USER, @NOTE, @HINT) - provided by the developer
2. AI annotations (@TODO, @ADD, @REMOVE, @REPLACE, @HOOK, @STATE, @EFFECT, @API)

Your task:
1. Read and understand ALL annotations from BOTH sources
2. Implement ALL the annotated changes
3. Remove the annotation comments after implementing
4. Add proper React hooks (useState, useEffect) for API integration
5. Handle loading and error states
6. Track which annotations were resolved (both user and AI)
7. Acknowledge user hints and explain how you addressed them
${userHintsText}

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
  "modifiedCode": "The complete modified React component code (all annotations resolved)",
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
    { "annotation": "@MARKER: description", "source": "user|ai", "resolved": true, "implementation": "how it was resolved" }
  ],
  "userHintAcknowledgments": [
    { "hint": "original user hint", "actionTaken": "what was done to address this hint" }
  ]
}

Important:
- Resolve ALL annotations from BOTH user and AI
- Clearly indicate which annotations came from user vs AI
- Acknowledge and address all user hints (@HINT markers)
- Use React hooks (useState, useEffect) for state management
- Handle loading state while fetching
- Handle error state if fetch fails
- Remove all annotation comments from the final code
- The modifiedCode should be complete and ready to use`;

  return {
    name: `${componentName}Modifier`,
    componentName,
    changes,
    apiEndpoint,
    responseField,
    userAnnotations,
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
  logProgress(
    "INIT",
    "Starting Gemini React Component Modifier with User Annotations..."
  );
  logProgress(
    "INIT",
    "Two-step approach: 1) Enhance user annotations, 2) Generate modifications"
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

  // Original React component code WITH USER ANNOTATIONS
  // Users can add their own @USER, @NOTE, @HINT annotations to guide the AI
  const originalCode = `import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
// @HINT: Add useState and useEffect imports here for API integration

const bull = (
  <Box
    component="span"
    sx={{ display: 'inline-block', mx: '2px', transform: 'scale(0.8)' }}
  >
    •
  </Box>
);

// @USER: This component should display Nobel Prize laureates instead of word of the day
// @NOTE: Keep the Card structure but replace content with laureate firstnames
export default function BasicCard() {
  // @HINT: Add state for laureates, loading, and error here

  // @HINT: Add useEffect to fetch from https://api.nobelprize.org/v1/prize.json

  return (
    <Card sx={{ minWidth: 275 }}>
      <CardContent>
        {/* @USER: Replace this section with Nobel Prize data display */}
        <Typography gutterBottom sx={{ color: 'text.secondary', fontSize: 14 }}>
          Word of the Day
        </Typography>
        {/* @HINT: Show loading spinner or "Loading..." text while fetching */}
        <Typography variant="h5" component="div">
          be{bull}nev{bull}o{bull}lent
        </Typography>
        {/* @NOTE: This typography section can be replaced with a list of firstnames */}
        <Typography sx={{ color: 'text.secondary', mb: 1.5 }}>adjective</Typography>
        <Typography variant="body2">
          well meaning and kindly.
          <br />
          {'"a benevolent smile"'}
        </Typography>
      </CardContent>
      <CardActions>
        {/* @USER: Keep this button but maybe change text to "View All Prizes" */}
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

  // Extract user annotations from the code
  logProgress("PARSE", "Extracting user annotations from code...");
  const { annotations: userAnnotations, counts: annotationCounts } =
    extractAnnotations(originalCode);
  logProgress("PARSE", `Found ${userAnnotations.length} user annotations`);

  for (const ann of userAnnotations) {
    logProgress(
      "PARSE",
      `  L${ann.lineNumber}: ${ann.marker}: ${ann.content.slice(0, 50)}...`
    );
  }

  logProgress("INPUT", "Preparing annotation request...");
  logProgress("INPUT", "Component: BasicCard");
  logProgress("INPUT", `API Endpoint: ${apiEndpoint}`);
  logProgress("INPUT", `Changes requested: ${changes.length}`);
  logProgress("INPUT", `User annotations: ${userAnnotations.length}`);

  const requestOptions = {
    model: "gemini-2.0-flash",
    temperature: 0.2,
    max_tokens: 4096,
  };

  try {
    // =========================================================================
    // STEP 1: Enhance annotations (preserve user, add AI)
    // =========================================================================
    logProgress("STEP1", "Creating annotation schema with user hints...");
    const annotationSchema = defineAnnotationSchema(
      "BasicCard",
      changes,
      apiEndpoint,
      userAnnotations
    );
    logProgress("STEP1", "Annotation schema created");

    const annotationPrompt = `Please enhance the following React component with additional annotations.

IMPORTANT: The code already contains USER annotations (@USER, @NOTE, @HINT). You MUST:
1. PRESERVE all existing user annotations exactly as they are
2. ADD your own AI annotations (@TODO, @ADD, @REMOVE, @REPLACE, @HOOK, @STATE, @EFFECT, @API)
3. Use the user hints to guide where you place your annotations

ORIGINAL COMPONENT (WITH USER ANNOTATIONS):
\`\`\`jsx
${originalCode}
\`\`\`

Add AI annotations to complement the user annotations. Return the code with BOTH user and AI annotations.`;

    logProgress("STEP1", "Sending annotation request to Gemini API...");
    const annotationResponse = await chatCompletionWithSchema(
      clientConfig,
      [
        {
          role: "system",
          content:
            "Preserve user annotations and add complementary AI annotations.",
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
      userAnnotations,
      changes,
      annotationResponse,
      requestOptions
    );

    if (!annotatedCode) {
      logProgress(
        "WARN",
        "Failed to get enhanced annotations, using original with user annotations"
      );
      annotatedCode = originalCode;
    }

    // =========================================================================
    // STEP 2: Generate modified code from annotations
    // =========================================================================
    logProgress("STEP2", "Creating modification schema...");
    const modificationSchema = defineModificationSchema(
      "BasicCard",
      changes,
      apiEndpoint,
      responseField,
      userAnnotations
    );
    logProgress("STEP2", "Modification schema created");

    const modificationPrompt = `Please implement all the annotated changes in the following React component.

The code contains TWO types of annotations:
1. USER annotations (@USER, @NOTE, @HINT) - provided by the developer, pay special attention to these
2. AI annotations (@TODO, @ADD, @REMOVE, @REPLACE, @HOOK, @STATE, @EFFECT, @API)

ANNOTATED COMPONENT:
\`\`\`jsx
${annotatedCode}
\`\`\`

API DETAILS:
- Endpoint: ${apiEndpoint}
- Response structure: { prizes: [{ laureates: [{ firstname: "string", ... }] }] }
- Extract and display: firstname of each laureate

Resolve ALL annotations (both user and AI) and return the complete, working modified component.
Make sure to acknowledge each user hint and explain how you addressed it.`;

    logProgress("STEP2", "Sending modification request to Gemini API...");
    const modificationResponse = await chatCompletionWithSchema(
      clientConfig,
      [
        {
          role: "system",
          content:
            "Implement all annotations. Pay special attention to user hints.",
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

    // User annotations summary
    console.log("\n[USER ANNOTATIONS INPUT]");
    console.log(THIN_SEPARATOR);
    console.log(`  Total user annotations provided: ${userAnnotations.length}`);
    const userByType = {};
    for (const ann of userAnnotations) {
      const marker = ann.marker.slice(1); // Remove @
      userByType[marker] = (userByType[marker] || 0) + 1;
    }
    for (const [marker, count] of Object.entries(userByType)) {
      console.log(`    @${marker}: ${count}`);
    }

    if (annotationResponse.choices?.[0]?.message?.parsed) {
      const parsedAnnotation = annotationResponse.choices[0].message.parsed;
      console.log("\n[ANNOTATION ENHANCEMENT STATS]");
      console.log(THIN_SEPARATOR);
      console.log(
        `  User annotations preserved: ${parsedAnnotation.userAnnotationsPreserved || "N/A"}`
      );
      console.log(
        `  AI annotations added: ${parsedAnnotation.aiAnnotationsAdded || "N/A"}`
      );
      console.log(
        `  Total annotations: ${parsedAnnotation.totalAnnotations || "N/A"}`
      );
    }

    if (modificationResponse.choices?.[0]?.message?.parsed) {
      const parsedMod = modificationResponse.choices[0].message.parsed;
      console.log("\n[MODIFICATION STATS]");
      console.log(THIN_SEPARATOR);
      console.log(`  Component: ${parsedMod.componentName || "N/A"}`);
      const changesApplied = parsedMod.changesApplied || [];
      console.log(`  Changes applied: ${changesApplied.length}`);

      if (parsedMod.annotationsResolved) {
        const resolved = parsedMod.annotationsResolved;
        const userResolved = resolved.filter(
          (a) => a.source === "user" && a.resolved
        );
        const aiResolved = resolved.filter(
          (a) => a.source !== "user" && a.resolved
        );
        console.log(`  User annotations resolved: ${userResolved.length}`);
        console.log(`  AI annotations resolved: ${aiResolved.length}`);
      }

      if (parsedMod.userHintAcknowledgments) {
        console.log(
          `  User hints acknowledged: ${parsedMod.userHintAcknowledgments.length}`
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
      "User annotation enhancement and modification completed successfully"
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
