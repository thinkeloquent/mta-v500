/**
 * Gemini OpenAI-Compatible REST API Client - Audio Transcription Example
 * Single-file implementation using Node.js 23+ undici
 *
 * Features:
 * - Audio transcription support with base64 encoding
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

// Audio format mapping
const AUDIO_FORMATS = {
  ".wav": "wav",
  ".mp3": "mp3",
  ".aiff": "aiff",
  ".aac": "aac",
  ".ogg": "ogg",
  ".flac": "flac",
  ".m4a": "m4a",
  ".opus": "opus",
  ".webm": "webm",
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
 * Encodes an audio file to base64
 * @param {string} audioPath - Path to the audio file
 * @returns {Object} Object with base64 data and metadata
 */
export function encodeAudioToBase64(audioPath) {
  if (!existsSync(audioPath)) {
    throw new Error(`Audio file not found: ${audioPath}`);
  }

  const ext = extname(audioPath).toLowerCase();
  const format = AUDIO_FORMATS[ext];

  if (!format) {
    throw new Error(
      `Unsupported audio format: ${ext}. Supported: ${Object.keys(AUDIO_FORMATS).join(", ")}`
    );
  }

  const audioBuffer = readFileSync(audioPath);
  const base64Data = audioBuffer.toString("base64");

  return {
    data: base64Data,
    format,
    fileName: basename(audioPath),
    sizeBytes: audioBuffer.length,
    base64Length: base64Data.length,
  };
}

/**
 * Creates an audio content part for the message
 * @param {string} audioSource - File path to audio
 * @returns {Object} Input audio content part
 */
export function createAudioContent(audioSource) {
  const encoded = encodeAudioToBase64(audioSource);
  return {
    type: "input_audio",
    input_audio: {
      data: encoded.data,
      format: encoded.format,
    },
    _metadata: {
      fileName: encoded.fileName,
      format: encoded.format,
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
 * Creates an audio transcription message
 * @param {string} text - The text prompt (e.g., "Transcribe this audio file.")
 * @param {string} audioPath - Path to the audio file
 * @returns {Object} Message object with content array
 */
export function createAudioMessage(text, audioPath) {
  return {
    role: "user",
    content: [createTextContent(text), createAudioContent(audioPath)],
  };
}

/**
 * Performs a chat completion request with audio support
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

  // Build request body - strip _metadata from content parts
  const cleanedMessages = messages.map((msg) => {
    if (Array.isArray(msg.content)) {
      return {
        ...msg,
        content: msg.content.map((part) => {
          const { _metadata, ...cleanPart } = part;
          return cleanPart;
        }),
      };
    }
    return msg;
  });

  const body = {
    model,
    messages: cleanedMessages,
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
 * Generates a sample WAV audio for testing (minimal valid WAV header with silence)
 * @returns {Object} Base64 audio data
 */
export function generateSampleAudio() {
  // Minimal WAV file: 44-byte header + 1 second of silence at 8kHz mono 8-bit
  const sampleRate = 8000;
  const duration = 0.1; // 100ms of silence
  const numSamples = Math.floor(sampleRate * duration);
  const dataSize = numSamples;
  const fileSize = 44 + dataSize - 8;

  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(fileSize, 4);
  buffer.write("WAVE", 8);

  // fmt chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // chunk size
  buffer.writeUInt16LE(1, 20); // audio format (PCM)
  buffer.writeUInt16LE(1, 22); // num channels
  buffer.writeUInt32LE(sampleRate, 24); // sample rate
  buffer.writeUInt32LE(sampleRate, 28); // byte rate
  buffer.writeUInt16LE(1, 32); // block align
  buffer.writeUInt16LE(8, 34); // bits per sample

  // data chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Silence (128 is silence for 8-bit PCM)
  for (let i = 0; i < numSamples; i++) {
    buffer.writeUInt8(128, 44 + i);
  }

  return {
    data: buffer.toString("base64"),
    format: "wav",
    fileName: "sample-silence.wav",
    description: "100ms silence WAV for testing",
    sizeBytes: buffer.length,
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
 * @param {Object} audioInfo - Optional audio metadata
 */
function formatOutput(
  question,
  response,
  requestOptions = {},
  audioInfo = null
) {
  const separator = "=".repeat(60);
  const thinSeparator = "-".repeat(60);

  console.log("\n" + separator);
  console.log("  GEMINI AUDIO TRANSCRIPTION CHAT COMPLETION");
  console.log(separator);

  // Print the question for context
  console.log("\n[QUESTION]");
  console.log(thinSeparator);
  console.log(question);

  // Print audio info if provided
  if (audioInfo) {
    console.log("\n[AUDIO INFO]");
    console.log(thinSeparator);
    console.log(JSON.stringify(audioInfo, null, 2));
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
 * Main execution - demonstrates audio transcription API with sample question
 */
async function main() {
  logProgress("INIT", "Starting Gemini Audio Transcription API Client...");

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

  // Build request options for text-only request
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

    // Demonstrate audio transcription capability
    logProgress("AUDIO", "Demonstrating audio transcription capability...");

    // Generate a sample WAV audio for testing
    const sampleAudio = generateSampleAudio();
    logProgress("AUDIO", `Generated sample audio: ${sampleAudio.description}`);

    const audioQuestion = "Transcribe this audio file.";

    // Create audio message with the sample audio
    const audioMessage = {
      role: "user",
      content: [
        createTextContent(audioQuestion),
        {
          type: "input_audio",
          input_audio: {
            data: sampleAudio.data,
            format: sampleAudio.format,
          },
        },
      ],
    };

    const audioRequestOptions = {
      messages: [audioMessage],
      model: "gemini-2.0-flash",
    };

    logProgress("API", "Sending audio transcription request to Gemini API...");
    const audioResponse = await chatCompletion(client, audioRequestOptions);
    logProgress("API", "Received audio transcription response from API");

    formatOutput(audioQuestion, audioResponse, audioRequestOptions, {
      type: "sample_audio",
      format: sampleAudio.format,
      description: sampleAudio.description,
      sizeBytes: sampleAudio.sizeBytes,
    });

    logProgress("COMPLETE", "Audio transcription demo completed successfully");
  } catch (error) {
    logProgress("ERROR", `Request failed: ${error.message}`);
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

// Run if executed directly
main();
