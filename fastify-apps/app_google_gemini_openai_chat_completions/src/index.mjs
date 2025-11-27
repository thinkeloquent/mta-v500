/**
 * Google Gemini OpenAI Chat Completions - Fastify Plugin
 *
 * Provides Google Gemini chat completion endpoints via OpenAI-compatible API.
 * Uses the @internal/google-gemini-openai-client package for API communication.
 *
 * @param {object} fastify - Fastify instance
 * @param {object} options - Plugin options passed from server.mjs
 * @param {string} [options.model] - Default model to use (default: 'gemini-2.0-flash')
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import fastifyPlugin from "fastify-plugin";

import { getProxyDispatcher } from "@internal/fetch-proxy-dispatcher";
import {
  createClient,
  createClientWithDispatcher,
  chatCompletion,
  chatCompletionStructured,
  parseStructuredOutput,
  createJsonSchema,
  extractContent,
  DEFAULT_MODEL,
} from "@internal/google-gemini-openai-client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_PREFIX = "/api/apps/google-gemini-openai-chat-completions";

// Shared JSON Schema definitions for request validation
const chatMessageSchema = {
  type: "object",
  properties: {
    role: {
      type: "string",
      enum: ["user", "assistant", "system"],
      description: "Message role",
    },
    content: { type: "string", description: "Message content" },
  },
  required: ["role", "content"],
};

const chatRequestSchema = {
  type: "object",
  properties: {
    messages: {
      type: "array",
      items: chatMessageSchema,
      minItems: 1,
      description: "List of messages",
    },
    model: {
      type: "string",
      description: "Model to use",
    },
    temperature: {
      type: "number",
      minimum: 0,
      maximum: 2,
      description: "Sampling temperature (0-2)",
    },
    max_tokens: {
      type: "integer",
      minimum: 1,
      description: "Maximum tokens to generate",
    },
  },
  required: ["messages"],
};

const structuredChatRequestSchema = {
  type: "object",
  properties: {
    ...chatRequestSchema.properties,
    schema_name: {
      type: "string",
      description: "Name for the JSON schema",
    },
    schema_properties: {
      type: "object",
      description: "JSON schema properties definition",
    },
    schema_required: {
      type: "array",
      items: { type: "string" },
      description: "Required property names",
    },
  },
  required: ["messages", "schema_name", "schema_properties"],
};

async function googleGeminiOpenaiChatCompletionsPlugin(fastify, options = {}) {
  const {
    model: defaultModel = DEFAULT_MODEL,
    proxyFactory,
    proxyCert,
    proxyCaBundle,
  } = options;

  fastify.log.info("-> Initializing Google Gemini OpenAI Chat Completions plugin...");

  // Create client instance (reused for all requests)
  // Uses proxy configuration from options (primary) or environment variables (fallback)
  let client;
  try {
    if (proxyFactory) {
      // Use factory from options (primary configuration from launch.mjs)
      const dispatcher = proxyFactory.getProxyDispatcher();
      client = createClientWithDispatcher(
        { cert: proxyCert, caBundle: proxyCaBundle },
        dispatcher
      );
      fastify.log.info("  Using proxy configuration from server entry point");
    } else {
      // Fallback to environment-based detection
      const dispatcher = getProxyDispatcher();
      if (dispatcher) {
        client = createClientWithDispatcher({}, dispatcher);
        fastify.log.info("  Using proxy configuration from environment variables");
      } else {
        client = createClient();
        fastify.log.info("  No proxy configured, using direct connection");
      }
    }
  } catch (error) {
    fastify.log.warn(
      { error: error.message },
      "Failed to create Gemini client - GEMINI_API_KEY may not be set"
    );
  }

  // Log received options for debugging
  fastify.log.debug(
    { options },
    "Google Gemini OpenAI Chat Completions Service options received"
  );

  // ==========================================================================
  // Health Check
  // ==========================================================================

  fastify.get(
    `${API_PREFIX}/health`,
    {
      schema: {
        description: "Health check for Google Gemini chat completions service",
        tags: ["ai-provider", "gemini"],
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string" },
              service: { type: "string" },
              model: { type: "string" },
              clientReady: { type: "boolean" },
            },
          },
        },
      },
    },
    async (_request, _reply) => {
      return {
        status: "healthy",
        service: "google_gemini_openai_chat_completions",
        model: defaultModel,
        clientReady: client !== undefined,
      };
    }
  );

  // ==========================================================================
  // Chat Completion
  // ==========================================================================

  fastify.post(
    `${API_PREFIX}/chat`,
    {
      schema: {
        description: "Send messages to Google Gemini and get a response",
        tags: ["ai-provider", "gemini"],
        body: chatRequestSchema,
        response: {
          200: {
            type: "object",
            properties: {
              content: { type: "string" },
              model: { type: "string" },
              finish_reason: { type: "string" },
              usage: {
                type: "object",
                properties: {
                  prompt_tokens: { type: "integer" },
                  completion_tokens: { type: "integer" },
                  total_tokens: { type: "integer" },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!client) {
        return reply.code(503).send({
          error: "Service Unavailable",
          message:
            "Gemini client not initialized. Check GEMINI_API_KEY environment variable.",
        });
      }

      try {
        const { messages, model, temperature, max_tokens } = request.body;

        // Build options
        const chatOptions = {
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          model: model || defaultModel,
        };

        if (temperature !== undefined) {
          chatOptions.temperature = temperature;
        }
        if (max_tokens !== undefined) {
          chatOptions.maxTokens = max_tokens;
        }

        const response = await chatCompletion(client, chatOptions);

        // Build usage object if available
        let usage = null;
        if (response.usage) {
          usage = {
            prompt_tokens: response.usage.promptTokens,
            completion_tokens: response.usage.completionTokens,
            total_tokens: response.usage.totalTokens,
          };
        }

        return {
          content: extractContent(response),
          model: response.model,
          finish_reason: response.choices?.[0]?.finishReason || null,
          usage,
        };
      } catch (error) {
        fastify.log.error({ error: error.message }, "Chat completion failed");

        if (error.response?.status) {
          return reply.code(error.response.status).send({
            error: "Gemini API Error",
            message: error.message,
          });
        }

        return reply.code(500).send({
          error: "Internal Server Error",
          message: error.message,
        });
      }
    }
  );

  // ==========================================================================
  // Structured Chat Completion
  // ==========================================================================

  fastify.post(
    `${API_PREFIX}/chat/structured`,
    {
      schema: {
        description: "Get structured JSON response from Google Gemini",
        tags: ["ai-provider", "gemini"],
        body: structuredChatRequestSchema,
        response: {
          200: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              data: { type: "object" },
              raw: { type: "string" },
              error: { type: "string" },
              model: { type: "string" },
              usage: {
                type: "object",
                properties: {
                  prompt_tokens: { type: "integer" },
                  completion_tokens: { type: "integer" },
                  total_tokens: { type: "integer" },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!client) {
        return reply.code(503).send({
          error: "Service Unavailable",
          message:
            "Gemini client not initialized. Check GEMINI_API_KEY environment variable.",
        });
      }

      try {
        const {
          messages,
          model,
          temperature,
          max_tokens,
          schema_name,
          schema_properties,
          schema_required,
        } = request.body;

        // Create JSON schema
        const schema = createJsonSchema(
          schema_name,
          schema_properties,
          schema_required || []
        );

        // Build options
        const chatOptions = {
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          model: model || defaultModel,
        };

        if (temperature !== undefined) {
          chatOptions.temperature = temperature;
        }
        if (max_tokens !== undefined) {
          chatOptions.maxTokens = max_tokens;
        }

        const response = await chatCompletionStructured(
          client,
          chatOptions,
          schema
        );

        // Parse the structured output
        const result = parseStructuredOutput(response);

        // Build usage object if available
        let usage = null;
        if (response.usage) {
          usage = {
            prompt_tokens: response.usage.promptTokens,
            completion_tokens: response.usage.completionTokens,
            total_tokens: response.usage.totalTokens,
          };
        }

        return {
          success: result.success,
          data: result.data,
          raw: result.raw,
          error: result.error || null,
          model: response.model,
          usage,
        };
      } catch (error) {
        fastify.log.error(
          { error: error.message },
          "Structured chat completion failed"
        );

        if (error.response?.status) {
          return reply.code(error.response.status).send({
            error: "Gemini API Error",
            message: error.message,
          });
        }

        return reply.code(500).send({
          error: "Internal Server Error",
          message: error.message,
        });
      }
    }
  );

  // ==========================================================================
  // Static File Serving for Frontend
  // ==========================================================================

  if (options.frontendPrefix) {
    try {
      const { readFileSync, existsSync, statSync } = await import("node:fs");
      const { readFile } = await import("node:fs/promises");
      const { lookup } = await import("mime-types");
      const staticRoot = resolve(__dirname, "../frontend/dist");

      fastify.log.info(`-> Setting up frontend static serving...`);
      fastify.log.info(`  Root: ${staticRoot}`);
      fastify.log.info(`  Prefix: ${options.frontendPrefix}`);

      // Read index.html once for SPA fallback
      const indexPath = resolve(staticRoot, "index.html");
      const indexHtml = readFileSync(indexPath, "utf-8");

      // Route 1: Serve index.html at the root path
      fastify.get(options.frontendPrefix, async (_request, reply) => {
        reply.type("text/html");
        if (process.env.NODE_ENV === "development") {
          reply.header("Cache-Control", "no-cache, no-store, must-revalidate");
        }
        return reply.send(indexHtml);
      });

      // Route 2: Serve static files and SPA fallback
      fastify.get(`${options.frontendPrefix}/*`, async (request, reply) => {
        const requestedPath = request.url.replace(options.frontendPrefix, "");
        const cleanPath = requestedPath.startsWith("/")
          ? requestedPath.slice(1)
          : requestedPath;
        const filePath = resolve(staticRoot, cleanPath);

        // Security: ensure path is within staticRoot
        if (!filePath.startsWith(staticRoot)) {
          return reply.code(403).send({ error: "Forbidden" });
        }

        // Check if file exists and is a file (not directory)
        try {
          if (existsSync(filePath)) {
            const stats = statSync(filePath);
            if (stats.isFile()) {
              // Serve the static file
              const content = await readFile(filePath);
              const mimeType = lookup(filePath) || "application/octet-stream";

              reply.type(mimeType);
              if (process.env.NODE_ENV === "development") {
                reply.header(
                  "Cache-Control",
                  "no-cache, no-store, must-revalidate"
                );
              }
              return reply.send(content);
            }
          }
        } catch (err) {
          fastify.log.debug(`File not found or error: ${filePath}`, err);
        }

        // SPA fallback - serve index.html for client-side routes
        reply.type("text/html");
        if (process.env.NODE_ENV === "development") {
          reply.header("Cache-Control", "no-cache, no-store, must-revalidate");
        }
        return reply.send(indexHtml);
      });

      fastify.log.info(
        `  ✓ Registered static assets at: ${options.frontendPrefix}`
      );
      fastify.log.info(`     Serving from: ${staticRoot}`);
    } catch (error) {
      fastify.log.warn(
        `  ⚠ Failed to register static assets: ${error.message}`
      );
      fastify.log.error(error);
    }
  }

  fastify.log.info(
    "✅ Google Gemini OpenAI Chat Completions plugin successfully loaded"
  );
}

// Export as Fastify plugin
export default fastifyPlugin(googleGeminiOpenaiChatCompletionsPlugin, {
  name: "google-gemini-openai-chat-completions",
  fastify: "5.x",
});

// Also export the plugin function for direct use
export { googleGeminiOpenaiChatCompletionsPlugin };
