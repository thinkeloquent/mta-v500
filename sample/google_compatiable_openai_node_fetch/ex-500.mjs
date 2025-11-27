/**
 * Gemini OpenAI-Compatible REST API Client - Image/Vision Example
 * Single-file implementation using Node.js 23+ undici
 *
 * Features:
 * - Image/Vision support with base64 encoding
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
import { readFileSync, existsSync } from "node:fs";
import { basename, extname } from "node:path";

// Default configuration
const DEFAULT_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai";
const DEFAULT_MODEL = "gemini-2.0-flash";
const DEFAULT_TIMEOUT = 60000; // 60 seconds
const DEFAULT_KEEP_ALIVE_TIMEOUT = 5000; // 5 seconds
const DEFAULT_MAX_CONNECTIONS = 10;

// MIME type mapping for images
const MIME_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
};

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
 * Encodes an image file to base64 data URL
 * @param {string} imagePath - Path to the image file
 * @returns {Object} Object with base64 URL and metadata
 */
export function encodeImageToBase64(imagePath) {
  if (!existsSync(imagePath)) {
    throw new Error(`Image file not found: ${imagePath}`);
  }

  const ext = extname(imagePath).toLowerCase();
  const mimeType = MIME_TYPES[ext];

  if (!mimeType) {
    throw new Error(
      `Unsupported image format: ${ext}. Supported: ${Object.keys(MIME_TYPES).join(", ")}`
    );
  }

  const imageBuffer = readFileSync(imagePath);
  const base64Data = imageBuffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64Data}`;

  return {
    url: dataUrl,
    mimeType,
    fileName: basename(imagePath),
    sizeBytes: imageBuffer.length,
    base64Length: base64Data.length,
  };
}

/**
 * Creates an image content part for the message
 * @param {string} imageSource - Either a file path or URL
 * @returns {Object} Image URL content part
 */
export function createImageContent(imageSource) {
  // Check if it's a URL or file path
  if (imageSource.startsWith("http://") || imageSource.startsWith("https://")) {
    return {
      type: "image_url",
      image_url: { url: imageSource },
    };
  }

  // It's a file path - encode to base64
  const encoded = encodeImageToBase64(imageSource);
  return {
    type: "image_url",
    image_url: { url: encoded.url },
    _metadata: {
      fileName: encoded.fileName,
      mimeType: encoded.mimeType,
      sizeBytes: encoded.sizeBytes,
    },
  };
}

/**
 * Creates a text content part for the message
 * @param {string} text - The text content
 * @returns {Object} Text content part
 */
export function createTextContent(text) {
  return {
    type: "text",
    text,
  };
}

/**
 * Creates a vision message with text and image(s)
 * @param {string} text - The text prompt
 * @param {string|string[]} images - Image path(s) or URL(s)
 * @returns {Object} Message object with content array
 */
export function createVisionMessage(text, images) {
  const imageArray = Array.isArray(images) ? images : [images];

  const content = [createTextContent(text)];

  for (const image of imageArray) {
    content.push(createImageContent(image));
  }

  return {
    role: "user",
    content,
  };
}

/**
 * Performs a chat completion request with vision support
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
 * Generates a sample base64 image for testing (1x1 red pixel PNG)
 * @returns {Object} Base64 image data
 */
export function generateSampleImage() {
  // Minimal 1x1 red PNG (base64)
  const redPixelPng =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

  return {
    url: `data:image/png;base64,${redPixelPng}`,
    mimeType: "image/png",
    fileName: "sample-red-pixel.png",
    description: "1x1 red pixel PNG for testing",
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
 * @param {Object} imageInfo - Optional image metadata
 */
function formatOutput(question, response, requestOptions = {}, imageInfo = null) {
  const separator = "=".repeat(60);
  const thinSeparator = "-".repeat(60);

  console.log("\n" + separator);
  console.log("  GEMINI VISION CHAT COMPLETION");
  console.log(separator);

  // Print the question for context
  console.log("\n[QUESTION]");
  console.log(thinSeparator);
  console.log(question);

  // Print image info if provided
  if (imageInfo) {
    console.log("\n[IMAGE INFO]");
    console.log(thinSeparator);
    console.log(JSON.stringify(imageInfo, null, 2));
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

  // Print the response content
  console.log("\n[RESPONSE]");
  console.log(thinSeparator);
  const choice = response.choices?.[0];
  if (choice?.message?.content) {
    console.log(choice.message.content);
  } else {
    console.log("(No content in response)");
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
 * Main execution - demonstrates image/vision API with sample question
 */
async function main() {
  logProgress("INIT", "Starting Gemini Vision API Client...");

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

  // Build request options
  const requestOptions = {
    messages: [{ role: "user", content: question }],
    model: "gemini-2.0-flash",
    // temperature: 0.7,
    // maxTokens: 1000,
    // topP: 0.9,
  };

  logProgress("REQUEST", `Preparing request to ${client.baseUrl}...`);
  logProgress("REQUEST", `Model: ${requestOptions.model}`);

  try {
    // Execute text-only request first
    logProgress("API", "Sending text request to Gemini API...");
    const response = await chatCompletion(client, requestOptions);
    logProgress("API", "Received response from API");

    formatOutput(question, response, requestOptions);

    // Demonstrate image/vision capability
    logProgress("VISION", "Demonstrating image/vision capability...");

    // Generate a sample base64 image for testing
    const sampleImage = generateSampleImage();
    logProgress("VISION", `Generated sample image: ${sampleImage.description}`);

    const visionQuestion = "What is in this image?";

    // Create vision message with the sample image
    const visionMessage = {
      role: "user",
      content: [
        createTextContent(visionQuestion),
        {
          type: "image_url",
          image_url: { url: sampleImage.url },
        },
      ],
    };

    const visionRequestOptions = {
      messages: [visionMessage],
      model: "gemini-2.0-flash",
    };

    logProgress("API", "Sending vision request to Gemini API...");
    const visionResponse = await chatCompletion(client, visionRequestOptions);
    logProgress("API", "Received vision response from API");

    formatOutput(visionQuestion, visionResponse, visionRequestOptions, {
      type: "sample_image",
      mimeType: sampleImage.mimeType,
      description: sampleImage.description,
    });

    logProgress("COMPLETE", "Vision demo completed successfully");
  } catch (error) {
    logProgress("ERROR", `Request failed: ${error.message}`);
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

// Run if executed directly
main();
