/**
 * Gemini OpenAI-Compatible REST API Client - Structured Output (React Component) Example
 * Single-file implementation using Node.js 23+ undici
 *
 * Features:
 * - Structured output for generating React components
 * - Component schema with props, state, and JSX template
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

    if (Object.keys(tlsOptions).length > 0) {
      agentOpts.connect = tlsOptions;
    }

    config.dispatcher = new Agent(agentOpts);
  }

  return config;
}

/**
 * Defines a React component schema for structured output
 * @param {Object} config - Component configuration
 * @param {string} config.name - Component name (PascalCase)
 * @param {string} [config.description] - Component description
 * @param {Array<Object>} [config.props] - Props definitions [{name, type, description, required, defaultValue}]
 * @param {Array<Object>} [config.state] - State definitions [{name, type, initialValue, description}]
 * @param {string} [config.template] - JSX template hint (e.g., "<div>{{content}}</div>")
 * @param {Array<string>} [config.imports] - Required imports
 * @param {string} [config.componentType] - "functional" or "class" (default: functional)
 * @returns {Object} Schema definition
 */
export function defineReactComponentSchema(config) {
  const {
    name,
    description = "",
    props = [],
    state = [],
    template = "",
    imports = [],
    componentType = "functional",
  } = config;

  // Build props description
  const propsDesc = props.length > 0
    ? props.map((p) => {
        let desc = `  - ${p.name}: ${p.type}`;
        if (p.required) desc += " (required)";
        if (p.defaultValue !== undefined) desc += ` = ${JSON.stringify(p.defaultValue)}`;
        if (p.description) desc += ` - ${p.description}`;
        return desc;
      }).join("\n")
    : "  (no props)";

  // Build state description
  const stateDesc = state.length > 0
    ? state.map((s) => {
        let desc = `  - ${s.name}: ${s.type}`;
        if (s.initialValue !== undefined) desc += ` = ${JSON.stringify(s.initialValue)}`;
        if (s.description) desc += ` - ${s.description}`;
        return desc;
      }).join("\n")
    : "  (no state)";

  // Build imports hint
  const importsHint = imports.length > 0
    ? `Required imports: ${imports.join(", ")}`
    : "";

  // Build template hint
  const templateHint = template
    ? `Template structure hint: ${template}`
    : "";

  const systemPrompt = `You are a React component generator. Generate a complete, working React ${componentType} component.

Component Requirements:
- Name: ${name}
- Type: ${componentType} component
${description ? `- Description: ${description}` : ""}

Props:
${propsDesc}

State:
${stateDesc}

${importsHint}
${templateHint}

Output Format - Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "componentName": "${name}",
  "componentType": "${componentType}",
  "imports": ["import statements as strings"],
  "props": {
    "propName": { "type": "string", "required": true, "defaultValue": null }
  },
  "state": {
    "stateName": { "type": "string", "initialValue": "" }
  },
  "propTypes": "PropTypes definition as string or null",
  "defaultProps": "defaultProps definition as string or null",
  "componentCode": "The complete component function/class code as a string",
  "fullCode": "The complete file content including imports, component, and exports",
  "usage": "Example usage of the component as JSX string"
}

Generate clean, modern React code following best practices. Use hooks for functional components.`;

  return {
    name,
    description,
    props,
    state,
    template,
    imports,
    componentType,
    systemPrompt,
    _schema: config,
  };
}

/**
 * Performs a structured chat completion request for React component generation
 * @param {Object} client - Client from createClient()
 * @param {Object} options - Request options
 * @param {Array} options.messages - Array of {role, content} message objects
 * @param {Object} options.componentSchema - Schema from defineReactComponentSchema()
 * @param {string} [options.model] - Model to use
 * @param {number} [options.temperature] - Sampling temperature (0-2)
 * @param {number} [options.maxTokens] - Maximum tokens to generate
 * @param {number} [options.topP] - Nucleus sampling parameter
 * @param {number} [options.n] - Number of completions to generate
 * @param {string|Array} [options.stop] - Stop sequence(s)
 * @param {...any} kwargs - Additional parameters passed to the API
 * @returns {Promise<Object>} Chat completion response with parsed component
 */
export async function chatCompletionParseComponent(client, options) {
  const {
    messages,
    componentSchema,
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

  if (!componentSchema) {
    throw new Error("componentSchema is required for React component generation");
  }

  const url = `${client.baseUrl}/chat/completions`;

  // Merge system prompts
  const messagesWithSchema = [];
  let hasSystemMessage = false;

  for (const msg of messages) {
    if (msg.role === "system") {
      messagesWithSchema.push({
        role: "system",
        content: `${componentSchema.systemPrompt}\n\nAdditional instructions: ${msg.content}`,
      });
      hasSystemMessage = true;
    } else {
      messagesWithSchema.push(msg);
    }
  }

  if (!hasSystemMessage) {
    messagesWithSchema.unshift({
      role: "system",
      content: componentSchema.systemPrompt,
    });
  }

  // Build request body
  const body = {
    model,
    messages: messagesWithSchema,
    ...kwargs,
  };

  if (temperature !== undefined) body.temperature = temperature;
  if (maxTokens !== undefined) body.max_tokens = maxTokens;
  if (topP !== undefined) body.top_p = topP;
  if (n !== undefined) body.n = n;
  if (stop !== undefined) body.stop = stop;

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${client.apiKey}`,
    ...client.customHeaders,
  };

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

  // Parse the JSON component from the response
  const choice = response.choices?.[0];
  if (choice?.message?.content) {
    try {
      let content = choice.message.content.trim();

      // Remove markdown code blocks if present
      if (content.startsWith("```json")) {
        content = content.slice(7);
      } else if (content.startsWith("```")) {
        content = content.slice(3);
      }
      if (content.endsWith("```")) {
        content = content.slice(0, -3);
      }
      content = content.trim();

      choice.message.parsed = JSON.parse(content);
      choice.message.rawJson = content;
    } catch (e) {
      choice.message.parsed = null;
      choice.message.parseError = e.message;
    }
  }

  return response;
}

/**
 * Standard chat completion request (non-structured)
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

  const body = {
    model,
    messages,
    ...kwargs,
  };

  if (temperature !== undefined) body.temperature = temperature;
  if (maxTokens !== undefined) body.max_tokens = maxTokens;
  if (topP !== undefined) body.top_p = topP;
  if (n !== undefined) body.n = n;
  if (stop !== undefined) body.stop = stop;

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${client.apiKey}`,
    ...client.customHeaders,
  };

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
 * Generates a complete React component file from parsed response
 * @param {Object} parsed - Parsed component data
 * @returns {string} Complete component file content
 */
export function generateComponentFile(parsed) {
  if (!parsed) return "";

  // If fullCode is provided, use it directly
  if (parsed.fullCode) {
    return parsed.fullCode;
  }

  // Otherwise, build from parts
  let code = "";

  // Imports
  if (parsed.imports && parsed.imports.length > 0) {
    code += parsed.imports.join("\n") + "\n\n";
  } else {
    code += "import React from 'react';\n\n";
  }

  // Component code
  if (parsed.componentCode) {
    code += parsed.componentCode + "\n\n";
  }

  // PropTypes
  if (parsed.propTypes) {
    code += parsed.propTypes + "\n\n";
  }

  // Default props
  if (parsed.defaultProps) {
    code += parsed.defaultProps + "\n\n";
  }

  // Export
  if (parsed.componentName && !code.includes(`export default ${parsed.componentName}`)) {
    code += `export default ${parsed.componentName};\n`;
  }

  return code;
}

/**
 * Logs progress messages to the user
 */
function logProgress(stage, message = "") {
  const timestamp = new Date().toISOString().split("T")[1].slice(0, -1);
  console.log(`[${timestamp}] [${stage}] ${message}`);
}

/**
 * Formats and prints the response in a user-friendly way
 */
function formatOutput(question, response, requestOptions = {}, schemaInfo = null) {
  const separator = "=".repeat(70);
  const thinSeparator = "-".repeat(70);

  console.log("\n" + separator);
  console.log("  GEMINI STRUCTURED OUTPUT (REACT COMPONENT) CHAT COMPLETION");
  console.log(separator);

  console.log("\n[PROMPT]");
  console.log(thinSeparator);
  console.log(question);

  if (schemaInfo) {
    console.log("\n[COMPONENT SCHEMA]");
    console.log(thinSeparator);
    console.log(`Name: ${schemaInfo.name}`);
    console.log(`Type: ${schemaInfo.componentType}`);
    if (schemaInfo.description) console.log(`Description: ${schemaInfo.description}`);
    if (schemaInfo.props?.length > 0) {
      console.log(`Props: ${schemaInfo.props.map((p) => p.name).join(", ")}`);
    }
    if (schemaInfo.state?.length > 0) {
      console.log(`State: ${schemaInfo.state.map((s) => s.name).join(", ")}`);
    }
  }

  console.log("\n[REQUEST PARAMS]");
  console.log(thinSeparator);
  const params = {
    model: requestOptions.model || DEFAULT_MODEL,
  };
  if (requestOptions.temperature !== undefined)
    params.temperature = requestOptions.temperature;
  if (requestOptions.maxTokens !== undefined)
    params.max_tokens = requestOptions.maxTokens;
  console.log(JSON.stringify(params, null, 2));

  const choice = response.choices?.[0];

  // Print parsed component info
  if (choice?.message?.parsed) {
    const parsed = choice.message.parsed;

    console.log("\n[GENERATED COMPONENT INFO]");
    console.log(thinSeparator);
    console.log(JSON.stringify({
      componentName: parsed.componentName,
      componentType: parsed.componentType,
      props: parsed.props,
      state: parsed.state,
    }, null, 2));

    console.log("\n[GENERATED CODE]");
    console.log(thinSeparator);
    console.log(generateComponentFile(parsed));

    if (parsed.usage) {
      console.log("\n[USAGE EXAMPLE]");
      console.log(thinSeparator);
      console.log(parsed.usage);
    }
  }

  if (choice?.message?.parseError) {
    console.log("\n[PARSE ERROR]");
    console.log(thinSeparator);
    console.log(choice.message.parseError);
    console.log("\n[RAW CONTENT]");
    console.log(thinSeparator);
    console.log(choice.message.content);
  }

  if (!choice?.message?.parsed && choice?.message?.content && !choice?.message?.parseError) {
    console.log("\n[RAW CONTENT]");
    console.log(thinSeparator);
    console.log(choice.message.content);
  }

  if (choice?.finish_reason) {
    console.log("\n[FINISH REASON]");
    console.log(thinSeparator);
    console.log(choice.finish_reason);
  }

  console.log("\n[METADATA]");
  console.log(thinSeparator);
  console.log(JSON.stringify({
    id: response.id || "N/A",
    model: response.model || "N/A",
    created: response.created
      ? new Date(response.created * 1000).toISOString()
      : "N/A",
    finish_reason: choice?.finish_reason || "N/A",
  }, null, 2));

  if (response.usage) {
    console.log("\n[USAGE]");
    console.log(thinSeparator);
    console.log(JSON.stringify(response.usage, null, 2));
  }

  console.log("\n" + separator + "\n");
}

/**
 * Main execution - demonstrates React component generation
 */
async function main() {
  logProgress("INIT", "Starting Gemini React Component Generator API Client...");

  logProgress("CLIENT", "Creating client configuration...");
  const client = createClient({
    // apiKey: "your-api-key",
    // baseUrl: "custom-url",
    // proxy: "http://proxy:8080",
    // cert: "/path/to/cert.pem",
    // caBundle: "/path/to/ca.pem",
    // customHeaders: { "X-Custom": "value" },
    // timeout: 60000,
    // keepAliveTimeout: 10000,
    // maxConnections: 20,
  });
  logProgress("CLIENT", "Client created successfully");

  const question = "Explain to me how AI works";
  logProgress("QUESTION", `Preparing question: "${question}"`);

  try {
    // Standard chat completion first
    logProgress("REQUEST", "Sending standard chat completion request...");

    const standardRequestOptions = {
      messages: [{ role: "user", content: question }],
      model: "gemini-2.0-flash",
    };

    logProgress("API", "Sending text request to Gemini API...");
    const standardResponse = await chatCompletion(client, standardRequestOptions);
    logProgress("API", "Received response from API");

    formatOutput(question, standardResponse, standardRequestOptions);

    // Example 1: Simple Header Component
    logProgress("COMPONENT", "Generating simple Header component...");

    const HeaderSchema = defineReactComponentSchema({
      name: "Header",
      description: "A simple page header component with title and subtitle",
      componentType: "functional",
      props: [
        { name: "title", type: "string", required: true, description: "Main title text" },
        { name: "subtitle", type: "string", required: false, description: "Optional subtitle" },
        { name: "className", type: "string", required: false, defaultValue: "" },
      ],
      template: "<header><h1>{{title}}</h1><p>{{subtitle}}</p></header>",
    });

    const headerPrompt = "Generate a Header component with the specified props. Style it with inline styles for a modern look.";

    const headerRequestOptions = {
      messages: [
        { role: "system", content: "Generate clean, production-ready React code." },
        { role: "user", content: headerPrompt },
      ],
      componentSchema: HeaderSchema,
      model: "gemini-2.0-flash",
      temperature: 0.2,
    };

    logProgress("API", "Sending Header component request to Gemini API...");
    const headerResponse = await chatCompletionParseComponent(client, headerRequestOptions);
    logProgress("API", "Received Header component response from API");

    formatOutput(headerPrompt, headerResponse, headerRequestOptions, HeaderSchema);

    // Example 2: Counter Component with State
    logProgress("COMPONENT", "Generating Counter component with state...");

    const CounterSchema = defineReactComponentSchema({
      name: "Counter",
      description: "An interactive counter component with increment/decrement buttons",
      componentType: "functional",
      props: [
        { name: "initialValue", type: "number", required: false, defaultValue: 0 },
        { name: "step", type: "number", required: false, defaultValue: 1 },
        { name: "min", type: "number", required: false },
        { name: "max", type: "number", required: false },
        { name: "onChange", type: "function", required: false, description: "Callback when value changes" },
      ],
      state: [
        { name: "count", type: "number", initialValue: 0, description: "Current counter value" },
      ],
      imports: ["React", "useState"],
      template: "<div><button>-</button><span>{{count}}</span><button>+</button></div>",
    });

    const counterPrompt = "Generate a Counter component using hooks. Include styled buttons and respect min/max limits if provided.";

    const counterRequestOptions = {
      messages: [
        { role: "system", content: "Generate clean, accessible React code with proper ARIA labels." },
        { role: "user", content: counterPrompt },
      ],
      componentSchema: CounterSchema,
      model: "gemini-2.0-flash",
      temperature: 0.2,
    };

    logProgress("API", "Sending Counter component request to Gemini API...");
    const counterResponse = await chatCompletionParseComponent(client, counterRequestOptions);
    logProgress("API", "Received Counter component response from API");

    formatOutput(counterPrompt, counterResponse, counterRequestOptions, CounterSchema);

    // Example 3: Card Component
    logProgress("COMPONENT", "Generating Card component...");

    const CardSchema = defineReactComponentSchema({
      name: "Card",
      description: "A reusable card component for displaying content with optional image, title, and actions",
      componentType: "functional",
      props: [
        { name: "title", type: "string", required: true },
        { name: "description", type: "string", required: false },
        { name: "imageUrl", type: "string", required: false },
        { name: "children", type: "ReactNode", required: false },
        { name: "onClick", type: "function", required: false },
        { name: "variant", type: "string", required: false, defaultValue: "default", description: "Card style variant: default, outlined, elevated" },
      ],
      template: `<article class="card">
  <img src="{{imageUrl}}" />
  <h3>{{title}}</h3>
  <p>{{description}}</p>
  {{children}}
</article>`,
    });

    const cardPrompt = "Generate a Card component with CSS-in-JS styles (inline styles object). Support hover effects and different variants.";

    const cardRequestOptions = {
      messages: [
        { role: "system", content: "Generate modern React code with clean styling." },
        { role: "user", content: cardPrompt },
      ],
      componentSchema: CardSchema,
      model: "gemini-2.0-flash",
      temperature: 0.2,
    };

    logProgress("API", "Sending Card component request to Gemini API...");
    const cardResponse = await chatCompletionParseComponent(client, cardRequestOptions);
    logProgress("API", "Received Card component response from API");

    formatOutput(cardPrompt, cardResponse, cardRequestOptions, CardSchema);

    // Example 4: Form Input Component
    logProgress("COMPONENT", "Generating FormInput component...");

    const FormInputSchema = defineReactComponentSchema({
      name: "FormInput",
      description: "A form input component with label, validation, and error display",
      componentType: "functional",
      props: [
        { name: "label", type: "string", required: true },
        { name: "name", type: "string", required: true },
        { name: "type", type: "string", required: false, defaultValue: "text" },
        { name: "value", type: "string", required: true },
        { name: "onChange", type: "function", required: true },
        { name: "error", type: "string", required: false },
        { name: "placeholder", type: "string", required: false },
        { name: "required", type: "boolean", required: false, defaultValue: false },
        { name: "disabled", type: "boolean", required: false, defaultValue: false },
      ],
      template: `<div class="form-group">
  <label for="{{name}}">{{label}}</label>
  <input type="{{type}}" name="{{name}}" value="{{value}}" />
  <span class="error">{{error}}</span>
</div>`,
    });

    const formInputPrompt = "Generate a FormInput component with validation styling. Show error state with red border and error message.";

    const formInputRequestOptions = {
      messages: [
        { role: "system", content: "Generate accessible form components following WAI-ARIA guidelines." },
        { role: "user", content: formInputPrompt },
      ],
      componentSchema: FormInputSchema,
      model: "gemini-2.0-flash",
      temperature: 0.2,
    };

    logProgress("API", "Sending FormInput component request to Gemini API...");
    const formInputResponse = await chatCompletionParseComponent(client, formInputRequestOptions);
    logProgress("API", "Received FormInput component response from API");

    formatOutput(formInputPrompt, formInputResponse, formInputRequestOptions, FormInputSchema);

    logProgress("COMPLETE", "React component generation demo completed successfully");

  } catch (error) {
    logProgress("ERROR", `Request failed: ${error.message}`);
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

// Run if executed directly
main();
