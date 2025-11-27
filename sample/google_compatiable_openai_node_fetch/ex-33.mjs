#!/usr/bin/env node
/**
 * Gemini OpenAI-Compatible REST API Client - Liquid Template Code Generation
 * Single-file implementation using Node.js 23+ with undici
 *
 * Features:
 * - RAG context via Markdown with annotations
 * - Structured JSON output from LLM
 * - Liquid template rendering for code generation
 * - Pipeline: Markdown → JSON → Liquid Template → Generated Code
 * - User can provide custom Liquid templates
 * - Proxy support (optional)
 * - Certificate/CA bundle support (optional)
 * - Keep-alive with configurable connections
 * - Custom headers
 * - Full OpenAI-compatible chat completion parameters
 * - User-friendly JSON output with metadata
 *
 * Use Case:
 * - User provides Markdown context with annotations
 * - LLM generates structured JSON output
 * - JSON is fed into Liquid template
 * - Final code is rendered from template
 *
 * Based on: https://ai.google.dev/gemini-api/docs/openai#rest
 * Liquid Template: https://shopify.github.io/liquid/
 */

import { Agent, request } from "undici";
import { readFileSync } from "node:fs";
import { Liquid } from "liquidjs"; // npm install liquidjs

// Default configuration
const DEFAULT_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai";
const DEFAULT_MODEL = "gemini-2.0-flash";
const DEFAULT_TIMEOUT = 60000; // 60 seconds
const DEFAULT_MAX_CONNECTIONS = 10;

// Output formatting
const SEPARATOR = "=".repeat(70);
const THIN_SEPARATOR = "-".repeat(70);

// Initialize Liquid engine
const liquidEngine = new Liquid();

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
  "@USER",
  "@NOTE",
  "@HINT",
  "@TEMPLATE", // Special marker for template hints
  "@OUTPUT", // Expected output structure hints
];

// =============================================================================
// Liquid Template Functions
// =============================================================================

/**
 * Returns the default Liquid template for React components.
 * @returns {string} Liquid template
 */
function getDefaultReactTemplate() {
  return `{% comment %}
React Component Template - Liquid Format
Variables: componentName, imports, stateVariables, effects, jsxContent, props, apiConfig
{% endcomment %}
{%- for import in imports -%}
{{ import }}
{% endfor %}

{% if stateVariables.size > 0 -%}
export default function {{ componentName }}({% if props.size > 0 %}{ {% for prop in props %}{{ prop.name }}{% unless forloop.last %}, {% endunless %}{% endfor %} }{% endif %}) {
  {%- for state in stateVariables %}
  const [{{ state.name }}, {{ state.setter }}] = useState({{ state.initial }});
  {%- endfor %}

  {%- for effect in effects %}
  useEffect(() => {
    {{ effect.body }}
  }, [{{ effect.deps | join: ", " }}]);
  {%- endfor %}

  {% if apiConfig.hasLoading -%}
  if (loading) {
    return {{ apiConfig.loadingComponent }};
  }
  {%- endif %}

  {% if apiConfig.hasError -%}
  if (error) {
    return {{ apiConfig.errorComponent }};
  }
  {%- endif %}

  return (
{{ jsxContent }}
  );
}
{%- else -%}
export default function {{ componentName }}() {
  return (
{{ jsxContent }}
  );
}
{%- endif %}
`;
}

/**
 * Returns a Liquid template for React components with API integration.
 * @returns {string} Liquid template
 */
function getReactWithApiTemplate() {
  return `{% comment %}
React Component with API Integration - Liquid Template
Generated from structured JSON output
{% endcomment %}
{%- for import in imports -%}
{{ import }}
{% endfor %}

/**
 * {{ componentName }}
 * {{ description }}
 *
 * API: {{ apiConfig.endpoint }}
 * Data Field: {{ apiConfig.displayField }}
 */
export default function {{ componentName }}({% if props.size > 0 %}{ {% for prop in props %}{{ prop.name }}{% if prop.defaultValue %} = {{ prop.defaultValue }}{% endif %}{% unless forloop.last %}, {% endunless %}{% endfor %} }{% endif %}) {
  // State Management
  {%- for state in stateVariables %}
  const [{{ state.name }}, {{ state.setter }}] = useState({{ state.initial }});
  {%- endfor %}

  // API Effect
  {%- for effect in effects %}
  useEffect(() => {
    {{ effect.body }}
  }, [{{ effect.deps | join: ", " }}]);
  {%- endfor %}

  // Loading State
  {%- if apiConfig.hasLoading %}
  if (loading) {
    return (
      {{ apiConfig.loadingComponent }}
    );
  }
  {%- endif %}

  // Error State
  {%- if apiConfig.hasError %}
  if (error) {
    return (
      {{ apiConfig.errorComponent }}
    );
  }
  {%- endif %}

  // Main Render
  return (
{{ jsxContent }}
  );
}
`;
}

/**
 * Renders a Liquid template with the given context.
 * @param {string} templateStr - The Liquid template string
 * @param {Object} context - Dictionary of variables for the template
 * @returns {Promise<string>} Rendered template string
 */
async function renderLiquidTemplate(templateStr, context) {
  try {
    return await liquidEngine.parseAndRender(templateStr, context);
  } catch (e) {
    return `// Template rendering error: ${e.message}\n// Context: ${JSON.stringify(context, null, 2)}`;
  }
}

// =============================================================================
// Markdown Parsing Functions
// =============================================================================

/**
 * Parses a Markdown document to extract RAG context.
 * @param {string} markdown - The Markdown content
 * @returns {Object} Dictionary with parsed sections
 */
function parseMarkdownContext(markdown) {
  const sections = {
    title: "",
    description: "",
    codeBlocks: [],
    annotations: [],
    requirements: [],
    templateHints: [],
    outputSchema: null,
  };

  const lines = markdown.split("\n");
  let currentSection = null;
  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeBlockContent = [];

  for (const line of lines) {
    // Handle code blocks
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        sections.codeBlocks.push({
          language: codeBlockLang,
          content: codeBlockContent.join("\n"),
        });
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeBlockLang = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Handle headers
    if (line.startsWith("# ")) {
      sections.title = line.slice(2).trim();
    } else if (line.startsWith("## ")) {
      currentSection = line.slice(3).trim().toLowerCase();
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      const item = line.slice(2).trim();
      if (currentSection === "requirements") {
        sections.requirements.push(item);
      } else if (currentSection === "template hints") {
        sections.templateHints.push(item);
      }
    }

    // Extract annotations from inline comments
    for (const marker of ANNOTATION_MARKERS) {
      const pattern = new RegExp(
        `(?:\\/\\/|#|<!--)\\s*(${marker.replace("@", "@")}):\\s*(.+?)(?:-->)?$`
      );
      const match = line.match(pattern);
      if (match) {
        sections.annotations.push({
          marker: match[1],
          content: match[2].trim(),
        });
      }
    }
  }

  return sections;
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
 * Formats and prints the complete pipeline output.
 * @param {Object} markdownContext - Parsed Markdown context
 * @param {Object} jsonOutput - Structured JSON from LLM
 * @param {string} liquidTemplate - The Liquid template used
 * @param {string} renderedCode - The final rendered code
 * @param {Object} response - The API response object
 * @param {Object} requestOptions - The request options used
 * @param {string} templateName - Name of the primary template used
 * @param {string} renderedCodeAlt - Alternative template output for comparison
 * @param {string} altTemplateName - Name of the alternative template
 */
function formatPipelineOutput(
  markdownContext,
  jsonOutput,
  liquidTemplate,
  renderedCode,
  response,
  requestOptions = {},
  templateName = "Default",
  renderedCodeAlt = null,
  altTemplateName = null
) {
  console.log(`\n${SEPARATOR}`);
  console.log("  LIQUID TEMPLATE CODE GENERATION PIPELINE");
  console.log(SEPARATOR);

  // Print the task description
  console.log("\n[TASK DESCRIPTION]");
  console.log(THIN_SEPARATOR);
  console.log("Pipeline: Markdown (RAG) → JSON (LLM) → Liquid Template → Code");
  console.log(`Title: ${markdownContext.title || "N/A"}`);

  // Print Markdown context summary
  console.log("\n[STEP 1: MARKDOWN CONTEXT (RAG)]");
  console.log(THIN_SEPARATOR);
  console.log(`  Code blocks found: ${markdownContext.codeBlocks?.length || 0}`);
  console.log(`  Annotations found: ${markdownContext.annotations?.length || 0}`);
  console.log(`  Requirements: ${markdownContext.requirements?.length || 0}`);
  if (markdownContext.annotations?.length > 0) {
    console.log("\n  Annotations:");
    for (const ann of markdownContext.annotations.slice(0, 5)) {
      console.log(`    ${ann.marker}: ${ann.content.slice(0, 50)}...`);
    }
  }

  // Print JSON output from LLM
  console.log("\n[STEP 2: STRUCTURED JSON OUTPUT (LLM)]");
  console.log(THIN_SEPARATOR);
  if (jsonOutput) {
    console.log(`  Component: ${jsonOutput.componentName || "N/A"}`);
    console.log(`  Imports: ${jsonOutput.imports?.length || 0}`);
    console.log(`  State Variables: ${jsonOutput.stateVariables?.length || 0}`);
    console.log(`  Effects: ${jsonOutput.effects?.length || 0}`);
    if (jsonOutput.apiConfig) {
      console.log(`  API Endpoint: ${jsonOutput.apiConfig.endpoint || "N/A"}`);
    }

    console.log("\n  Full JSON Structure:");
    console.log(JSON.stringify(jsonOutput, null, 2));
  }

  // Print Liquid template info
  console.log("\n[STEP 3: LIQUID TEMPLATE]");
  console.log(THIN_SEPARATOR);
  console.log(`  Selected template: ${templateName}`);
  const templateLines = liquidTemplate.trim().split("\n");
  console.log(`  Template lines: ${templateLines.length}`);
  console.log("\n  Template preview (first 15 lines):");
  for (const line of templateLines.slice(0, 15)) {
    console.log(`    ${line}`);
  }
  if (templateLines.length > 15) {
    console.log(`    ... (${templateLines.length - 15} more lines)`);
  }

  // Print rendered code (primary template)
  console.log(`\n[STEP 4: RENDERED CODE OUTPUT (${templateName})]`);
  console.log(THIN_SEPARATOR);
  console.log(renderedCode);

  // Print alternative template output if available
  if (renderedCodeAlt && altTemplateName) {
    console.log(`\n[STEP 4b: ALTERNATIVE OUTPUT (${altTemplateName})]`);
    console.log(THIN_SEPARATOR);
    console.log(renderedCodeAlt);
  }

  // Print metadata
  console.log("\n[METADATA]");
  console.log(THIN_SEPARATOR);
  const choice = response.choices?.[0];
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
 * Defines the schema for structured JSON output that will feed into Liquid template.
 * @param {string} componentName - Name of the component
 * @param {string} apiEndpoint - API endpoint to integrate
 * @param {string} responseField - Field to extract from API response
 * @param {Object} templateStructure - Optional custom template structure hints
 * @returns {Object} Schema definition with system prompt
 */
function defineJsonOutputSchema(
  componentName,
  apiEndpoint,
  responseField,
  templateStructure = null
) {
  const systemPrompt = `You are a React code generator. You will receive a React component and requirements.
Your task is to analyze the code and generate a STRUCTURED JSON output that can be used with a Liquid template.

IMPORTANT: Output ONLY valid JSON. No markdown, no code blocks, no explanation text.

The JSON structure must match this exact format for Liquid template compatibility:

{
  "componentName": "${componentName}",
  "description": "Brief description of the component",
  "imports": [
    "import { useState, useEffect } from 'react';",
    "import Box from '@mui/material/Box';",
    "...other imports as strings"
  ],
  "stateVariables": [
    {
      "name": "data",
      "setter": "setData",
      "initial": "[]",
      "type": "array",
      "description": "Stores fetched data"
    },
    {
      "name": "loading",
      "setter": "setLoading",
      "initial": "true",
      "type": "boolean",
      "description": "Loading state"
    },
    {
      "name": "error",
      "setter": "setError",
      "initial": "null",
      "type": "string|null",
      "description": "Error message"
    }
  ],
  "effects": [
    {
      "name": "fetchData",
      "deps": [],
      "body": "const fetchData = async () => {\\n  try {\\n    setLoading(true);\\n    const response = await fetch('${apiEndpoint}');\\n    const json = await response.json();\\n    // Extract ${responseField} from response\\n    setData(json);\\n  } catch (err) {\\n    setError(err.message);\\n  } finally {\\n    setLoading(false);\\n  }\\n};\\nfetchData();",
      "description": "Fetches data from API on mount"
    }
  ],
  "props": [
    {
      "name": "maxItems",
      "type": "number",
      "defaultValue": "10",
      "description": "Maximum items to display"
    }
  ],
  "apiConfig": {
    "endpoint": "${apiEndpoint}",
    "method": "GET",
    "displayField": "${responseField}",
    "dataPath": "prizes[].laureates[]",
    "hasLoading": true,
    "hasError": true,
    "loadingComponent": "<Box sx={{ display: 'flex', justifyContent: 'center' }}>Loading...</Box>",
    "errorComponent": "<Box sx={{ color: 'error.main' }}>Error: {error}</Box>"
  },
  "jsxContent": "    <Card sx={{ minWidth: 275 }}>\\n      <CardContent>\\n        ... JSX content with proper indentation ...\\n      </CardContent>\\n    </Card>",
  "annotations": [
    {
      "marker": "@USER",
      "content": "Original user annotation",
      "resolved": true,
      "implementation": "How it was addressed"
    }
  ]
}

Key requirements:
1. All string values must be properly escaped for JSON
2. JSX content should be a single string with \\n for newlines
3. Effect body should be a single string with proper escaping
4. Include ALL necessary imports
5. State variables must have name, setter, initial, type, description
6. Effects must have name, deps (array), body (string), description
7. Props are optional but should include defaults if present
8. apiConfig must include loading and error component JSX strings`;

  return {
    name: `${componentName}JSONGenerator`,
    componentName,
    apiEndpoint,
    responseField,
    templateStructure,
    systemPrompt,
  };
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Performs a chat completion request expecting JSON output.
 * @param {Object} clientConfig - Client configuration from createClientConfig()
 * @param {Array} messages - Array of message objects with role and content
 * @param {Object} schema - Schema with systemPrompt
 * @param {Object} options - Request options
 * @returns {Promise<Object>} Chat completion response with parsed JSON
 */
async function chatCompletionForJson(
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
  logProgress("INIT", "Starting Liquid Template Code Generation Pipeline...");
  logProgress(
    "INIT",
    "Pipeline: Markdown (RAG) → JSON (LLM) → Liquid Template → Code"
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

  // ==========================================================================
  // STEP 1: Define Markdown Context (RAG Input)
  // ==========================================================================
  logProgress("MARKDOWN", "Preparing Markdown context (RAG input)...");

  const markdownContext = `# React Component Modification Request

## Description
Update the BasicCard component to fetch and display Nobel Prize laureate firstnames.

## Original Code
\`\`\`jsx
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
// @HINT: Add useState and useEffect imports here

const bull = (
  <Box
    component="span"
    sx={{ display: 'inline-block', mx: '2px', transform: 'scale(0.8)' }}
  >
    •
  </Box>
);

// @USER: Replace word of the day with Nobel Prize laureates
// @NOTE: Keep Card structure, update content
export default function BasicCard() {
  // @HINT: Add state variables here
  // @HINT: Add useEffect for API call here

  return (
    <Card sx={{ minWidth: 275 }}>
      <CardContent>
        {/* @TEMPLATE: This section should show laureate list */}
        <Typography gutterBottom sx={{ color: 'text.secondary', fontSize: 14 }}>
          Word of the Day
        </Typography>
        {/* @OUTPUT: Display loading state here */}
        <Typography variant="h5" component="div">
          be{bull}nev{bull}o{bull}lent
        </Typography>
        {/* @OUTPUT: Map laureates.firstname here */}
        <Typography sx={{ color: 'text.secondary', mb: 1.5 }}>adjective</Typography>
        <Typography variant="body2">
          well meaning and kindly.
          <br />
          {'"a benevolent smile"'}
        </Typography>
      </CardContent>
      <CardActions>
        {/* @USER: Change button text to "View All Prizes" */}
        <Button size="small">Learn More</Button>
      </CardActions>
    </Card>
  );
}
\`\`\`

## Requirements
- Fetch data from https://api.nobelprize.org/v1/prize.json
- Display firstname of each laureate
- Add loading state
- Add error handling
- Keep MUI Card structure

## Template Hints
- Use useState for: data, loading, error
- Use useEffect for API fetch on mount
- Map over prizes[].laureates[] to get firstnames
- Show loading spinner while fetching
- Show error message if fetch fails

## Expected Output Schema
The JSON output should include:
- componentName: string
- imports: array of import statements
- stateVariables: array of {name, setter, initial, type}
- effects: array of {name, deps, body}
- jsxContent: string with proper JSX
- apiConfig: {endpoint, displayField, hasLoading, hasError}
`;

  // Parse Markdown
  const parsedMarkdown = parseMarkdownContext(markdownContext);
  logProgress(
    "MARKDOWN",
    `Parsed: ${parsedMarkdown.codeBlocks.length} code blocks, ${parsedMarkdown.annotations.length} annotations`
  );

  // ==========================================================================
  // STEP 2: Get Structured JSON from LLM
  // ==========================================================================
  logProgress("LLM", "Creating JSON output schema...");

  const apiEndpoint = "https://api.nobelprize.org/v1/prize.json";
  const responseField = "firstname";

  const jsonSchema = defineJsonOutputSchema(
    "BasicCard",
    apiEndpoint,
    responseField
  );
  logProgress("LLM", "Schema created");

  const userPrompt = `Analyze this Markdown context and generate structured JSON for a Liquid template.

${markdownContext}

Generate JSON output that follows the exact structure specified in the system prompt.
The JSON will be used to render a React component via Liquid template.

Key requirements:
1. Include all necessary React imports (useState, useEffect, MUI components)
2. Define state variables for: laureates data, loading, error
3. Create useEffect to fetch from ${apiEndpoint}
4. Extract ${responseField} from response.prizes[].laureates[]
5. Generate JSX that maps over the data and displays firstnames
6. Include loading and error states in apiConfig`;

  const requestOptions = {
    model: "gemini-2.0-flash",
    temperature: 0.2,
    max_tokens: 4096,
  };

  logProgress("LLM", "Sending request to Gemini API...");
  const response = await chatCompletionForJson(
    clientConfig,
    [
      {
        role: "system",
        content: "Generate valid JSON for Liquid template rendering.",
      },
      { role: "user", content: userPrompt },
    ],
    jsonSchema,
    requestOptions
  );
  logProgress("LLM", "Received response from API");

  // Extract JSON output
  let jsonOutput = null;
  if (response.choices?.[0]?.message?.parsed) {
    jsonOutput = response.choices[0].message.parsed;
    logProgress(
      "LLM",
      `Successfully parsed JSON for component: ${jsonOutput.componentName || "N/A"}`
    );
  } else {
    logProgress("ERROR", "Failed to parse JSON from LLM response");
    if (response.choices?.[0]?.message?.parseError) {
      logProgress(
        "ERROR",
        `Parse error: ${response.choices[0].message.parseError}`
      );
    }
  }

  // ==========================================================================
  // STEP 3: Render with Liquid Templates (Both Default and API)
  // ==========================================================================
  logProgress("LIQUID", "Preparing Liquid templates...");

  // Get both templates
  const defaultTemplate = getDefaultReactTemplate();
  const apiTemplate = getReactWithApiTemplate();

  logProgress("LIQUID", `Default template loaded (${defaultTemplate.length} characters)`);
  logProgress("LIQUID", `API template loaded (${apiTemplate.length} characters)`);

  // Select template based on whether API integration is needed
  const hasApi = jsonOutput && jsonOutput.apiConfig?.endpoint;
  const liquidTemplate = hasApi ? apiTemplate : defaultTemplate;
  const templateName = hasApi ? "API Template" : "Default Template";
  logProgress("LIQUID", `Selected: ${templateName}`);

  let renderedCode = "";
  let renderedCodeAlt = ""; // Alternative template rendering

  if (jsonOutput) {
    logProgress("LIQUID", "Rendering template with JSON context...");

    // Prepare context for Liquid
    const templateContext = {
      componentName: jsonOutput.componentName || "Component",
      description: jsonOutput.description || "",
      imports: jsonOutput.imports || [],
      stateVariables: jsonOutput.stateVariables || [],
      effects: jsonOutput.effects || [],
      props: jsonOutput.props || [],
      apiConfig: jsonOutput.apiConfig || {},
      jsxContent: jsonOutput.jsxContent || "",
    };

    // Render with selected template
    renderedCode = await renderLiquidTemplate(liquidTemplate, templateContext);
    logProgress("LIQUID", `Primary template rendered (${renderedCode.length} characters)`);

    // Also render with alternative template for comparison
    const altTemplate = hasApi ? defaultTemplate : apiTemplate;
    renderedCodeAlt = await renderLiquidTemplate(altTemplate, templateContext);
    logProgress("LIQUID", "Alternative template also rendered for comparison");
  } else {
    logProgress("ERROR", "Cannot render template without JSON output");
    renderedCode = "// Error: No JSON output from LLM";
  }

  // ==========================================================================
  // STEP 4: Format and Display Output
  // ==========================================================================
  logProgress("OUTPUT", "Formatting pipeline output...");

  const altTemplateName = hasApi ? "Default Template" : "API Template";
  formatPipelineOutput(
    parsedMarkdown,
    jsonOutput || {},
    liquidTemplate,
    renderedCode,
    response,
    requestOptions,
    templateName,
    renderedCodeAlt || null,
    altTemplateName
  );

  // Print final summary
  console.log(`\n${SEPARATOR}`);
  console.log("  PIPELINE SUMMARY");
  console.log(SEPARATOR);

  console.log("\n[PIPELINE STAGES]");
  console.log(THIN_SEPARATOR);
  console.log("  1. Markdown (RAG)    → Parsed context with annotations");
  console.log("  2. LLM (Gemini)      → Structured JSON output");
  console.log("  3. Liquid Template   → Code generation");
  console.log("  4. Output            → Ready-to-use React component");

  console.log("\n[STATS]");
  console.log(THIN_SEPARATOR);
  console.log(`  Markdown lines: ${markdownContext.split("\n").length}`);
  console.log(`  Annotations found: ${parsedMarkdown.annotations?.length || 0}`);
  console.log(`  JSON fields: ${jsonOutput ? Object.keys(jsonOutput).length : 0}`);
  console.log(`  Rendered code lines: ${renderedCode.split("\n").length}`);

  if (response.usage) {
    console.log(`\n  API tokens used: ${response.usage.total_tokens}`);
  }

  console.log(`\n${SEPARATOR}\n`);

  logProgress(
    "COMPLETE",
    "Liquid template code generation pipeline completed successfully"
  );

  // Close the agent to release connections
  if (clientConfig.agent) {
    await clientConfig.agent.close();
  }
}

main();
