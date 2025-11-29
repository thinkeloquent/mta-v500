/**
 * Main Server Launcher
 *
 * This module provides the server initialization and launch functionality.
 * It can be imported by other modules to:
 * 1. Create a configured Fastify instance
 * 2. Extend the server with additional plugins/routes
 * 3. Start the server
 *
 * Usage:
 *   import { createMainServer, startServer, initializeServer } from './launch.mjs';
 *
 *   // Option 1: Full initialization + start
 *   const fastify = await initializeServer();
 *   await startServer(fastify);
 *
 *   // Option 2: Create server, extend it, then start
 *   const { fastify, config, databaseUrl } = await createMainServer();
 *   // ... add custom plugins/routes ...
 *   await startServer(fastify);
 */

import "dotenv/config";
import { timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import basicAuth from "@fastify/basic-auth";
import { createServer, launchServer } from "@internal/skeleton";
import { createProxyDispatcherFactory } from "@internal/fetch-proxy-dispatcher";
import { settings } from "./config.mjs";
import aiSdkChatPlugin from "../ai_sdk_chat/src/index.mjs";
import { authServiceApp } from "./modules/auth-service.mjs";
import { userServiceApp } from "./modules/user-service.mjs";
import { googleGeminiOpenaiChatCompletionsPlugin } from "../app_google_gemini_openai_chat_completions/src/index.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// =============================================================================
// Proxy Configuration
// =============================================================================

// Configure proxy settings here (primary configuration)
// Environment variables (HTTP_PROXY, PROXY_*_URL) are used as fallback
const PROXY_CONFIG = {
  // Explicit proxy URLs per environment (optional)
  proxyUrls: {
    DEV: null, // No proxy in dev
    STAGE: null,
    QA: null,
    PROD: null, // Set to "http://proxy.company.com:8080" if needed
  },
  // Agent proxy override (optional)
  agentProxy: {
    httpProxy: null, // Falls back to HTTP_PROXY env var
    httpsProxy: null, // Falls back to HTTPS_PROXY env var
  },
};

// SSL certificate paths (optional)
const PROXY_CERT = null; // Path to client certificate
const PROXY_CA_BUNDLE = null; // Path to CA bundle

// Create factory instance
const proxyFactory = createProxyDispatcherFactory(PROXY_CONFIG);

// =============================================================================
// Configuration Loading
// =============================================================================

/**
 * Loads the application configuration from mta-prisma.config.json
 * @param {string} [configPath] - Optional custom config path
 * @returns {object} The parsed configuration
 * @throws {Error} If configuration is invalid or missing
 */
export function loadConfig(configPath) {
  const resolvedPath = configPath || join(__dirname, "mta-prisma.config.json");

  if (!existsSync(resolvedPath)) {
    throw new Error(`Configuration file not found: ${resolvedPath}`);
  }

  const configContent = readFileSync(resolvedPath, "utf-8");

  if (!configContent.trim()) {
    throw new Error(`Configuration file is empty: ${resolvedPath}`);
  }

  const config = JSON.parse(configContent);

  if (!config.apps || !Array.isArray(config.apps)) {
    throw new Error("Invalid configuration: 'apps' must be an array");
  }

  return config;
}

/**
 * Builds the DATABASE_URL from environment variables
 * @returns {string|undefined} The database URL or undefined if not configured
 */
export function buildDatabaseUrl() {
  // Return explicit DATABASE_URL if set, otherwise use settings.databaseUrl
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (!settings.hasDatabaseCredentials) {
    return undefined;
  }

  return settings.databaseUrl;
}

// =============================================================================
// Server Creation
// =============================================================================

/**
 * Creates and configures a Fastify server instance
 * Does NOT register apps or start the server - allows customization
 *
 * @param {object} [options] - Server options
 * @param {string} [options.configPath] - Custom config file path
 * @param {object} [options.serverOptions] - Additional Fastify server options
 * @param {object} [options.globalSettings] - Global settings accessible via fastify.settings
 * @returns {Promise<{fastify: object, config: object, databaseUrl: string|undefined}>}
 */
export async function createMainServer(options = {}) {
  // Load configuration
  let config;
  try {
    config = loadConfig(options.configPath);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `Configuration file contains invalid JSON: ${error.message}`
      );
    }
    throw error;
  }

  const databaseUrl = buildDatabaseUrl();

  // Create Fastify instance with CORS configured via skeleton
  const port = options.port || settings.PORT;
  const host = options.host || settings.HOST;
  const fastify = await createServer({
    logger: {
      level: settings.LOG_LEVEL,
    },
    prettyPrint: !settings.isProduction,
    corsAllowLocalhost: !settings.isProduction,
    port,
    host,
    ...options.serverOptions,
  });

  // Decorate fastify with global settings for access by all plugins
  fastify.decorate("settings", {
    databaseUrl: undefined, // Will be set below
    isProduction: settings.isProduction,
    ...options.globalSettings,
  });

  // Log database configuration status with safe URL masking
  if (databaseUrl) {
    let maskedUrl;
    try {
      maskedUrl = databaseUrl.replace(/:([^:@]+)@/, ":***@");
    } catch {
      maskedUrl = "[malformed URL - password hidden]";
      fastify.log.warn("Failed to mask database URL");
    }
    fastify.log.info(`Database URL configured: ${maskedUrl}`);
  } else {
    fastify.log.warn(
      "⚠ Database URL not configured. Set POSTGRES_USER and POSTGRES_PASSWORD, or DATABASE_URL"
    );
  }

  // Update settings with databaseUrl
  fastify.settings.databaseUrl = databaseUrl;

  return { fastify, config, databaseUrl };
}

// =============================================================================
// Under Construction Middleware
// =============================================================================

/**
 * Registers the "Under Construction" basic auth middleware
 * When UNDER_CONSTRUCTION_KEY is set, all routes except health endpoints require auth
 *
 * @param {object} fastify - Fastify instance
 * @returns {Promise<void>}
 */
export async function registerUnderConstructionAuth(fastify) {
  const underConstructionKey = settings.UNDER_CONSTRUCTION_KEY;

  if (!underConstructionKey) {
    return;
  }

  fastify.log.info(
    "🚧 Under Construction mode enabled - BasicAuth required for all routes except health checks"
  );

  // Define paths that are exempt from authentication
  const EXEMPT_PATHS = new Set(["/", "/health", "/status", "/ping"]);
  const EXEMPT_PREFIXES = ["/sys/status/", "/documentation/"];

  const isExemptPath = (path) => {
    if (EXEMPT_PATHS.has(path)) {
      return true;
    }
    for (const prefix of EXEMPT_PREFIXES) {
      if (path.startsWith(prefix)) {
        return true;
      }
    }
    return false;
  };

  // Register basic auth plugin
  await fastify.register(basicAuth, {
    validate: async (username, password) => {
      try {
        const usernameBuffer = Buffer.from(username, "utf8");
        const passwordBuffer = Buffer.from(password, "utf8");
        const keyBuffer = Buffer.from(underConstructionKey, "utf8");

        const usernameMatches =
          usernameBuffer.length === keyBuffer.length &&
          timingSafeEqual(usernameBuffer, keyBuffer);
        const passwordMatches =
          passwordBuffer.length === keyBuffer.length &&
          timingSafeEqual(passwordBuffer, keyBuffer);

        if (!usernameMatches || !passwordMatches) {
          return new Error("Invalid credentials");
        }
      } catch {
        return new Error("Invalid credentials");
      }
    },
    authenticate: { realm: "Under Construction" },
  });

  // Add global hook to enforce authentication on non-exempt routes
  fastify.addHook("onRequest", async (request) => {
    if (isExemptPath(request.url)) {
      return;
    }
    await request.basicAuth();
  });
}

// =============================================================================
// App Registration
// =============================================================================

/**
 * Gets the default internal apps to register
 * @param {object} [appOptions] - Optional options to pass to individual apps
 * @param {object} [appOptions.authService] - Options for auth-service
 * @param {object} [appOptions.userService] - Options for user-service
 * @param {object} [appOptions.aiSdkChat] - Options for ai-sdk-chat
 * @returns {Array} Array of app configurations
 */
export function getDefaultApps(appOptions = {}) {
  return [
    {
      name: "auth-service",
      plugin: authServiceApp,
      options: { ...(appOptions.authService || {}) },
      metadata: {
        version: "1.0.0",
        description: "Authentication service",
        dependencies: [],
      },
    },
    {
      name: "user-service",
      plugin: userServiceApp,
      options: { ...(appOptions.userService || {}) },
      metadata: {
        version: "1.0.0",
        description: "User management service",
        dependencies: ["auth-service"],
      },
    },
    {
      name: "ai-sdk-chat",
      plugin: aiSdkChatPlugin,
      options: {
        apiPrefix: "/api/ai-sdk-chat",
        frontendPrefix: "/apps/ai-sdk-chat",
        useFastifyPlugin: false,
        ...(appOptions.aiSdkChat || {}),
      },
      metadata: {
        version: "1.0.0",
        description: "AI SDK chat with multi-provider support",
        tags: ["ai", "streaming", "chat"],
        dependencies: [],
      },
    },
    {
      name: "google-gemini-openai-chat-completions",
      plugin: googleGeminiOpenaiChatCompletionsPlugin,
      options: {
        frontendPrefix: "/apps/google-gemini-openai-chat-completions",
        // Pass proxy configuration
        proxyFactory,
        proxyCert: PROXY_CERT,
        proxyCaBundle: PROXY_CA_BUNDLE,
        ...(appOptions.googleGeminiOpenaiChatCompletions || {}),
      },
      metadata: {
        version: "1.0.0",
        description:
          "Google Gemini chat completion service via OpenAI-compatible API",
        tags: ["ai-provider", "gemini", "chat"],
        dependencies: [],
      },
    },
  ];
}

/**
 * Registers internal service modules
 * @param {object} fastify - Fastify instance
 * @param {Array} [apps] - Optional custom apps array (defaults to getDefaultApps())
 * @param {object} [appOptions] - Options to pass to individual apps (only used when apps is null)
 * @returns {Promise<void>}
 */
export async function registerInternalApps(fastify, apps, appOptions) {
  const appsToRegister = apps || getDefaultApps(appOptions);
  await fastify.apps.registerAll(appsToRegister);
}

/**
 * Loads and registers external apps from config
 * @param {object} fastify - Fastify instance
 * @param {object} config - Configuration object with apps array
 * @param {string|undefined} databaseUrl - Database URL
 * @returns {Promise<void>}
 */
export async function loadExternalApps(fastify, config, databaseUrl) {
  if (config.apps && config.apps.length > 0) {
    const result = await fastify.apps.loadApps(config.apps, databaseUrl);
    await result.loadAppStaticAssets();
  }
}

/**
 * Registers default health check routes
 * @param {object} fastify - Fastify instance
 */
export function registerHealthRoutes(fastify) {
  fastify.get("/", async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      BUILD_COMMIT: process.env.BUILD_COMMIT || "N/A",
      BUILD_DATE: process.env.BUILD_DATE || "N/A",
      BUILD_ID: process.env.BUILD_ID || "N/A",
      BUILD_VERSION: process.env.BUILD_VERSION || "N/A",
    };
  });

  fastify.get("/health", async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      BUILD_COMMIT: process.env.BUILD_COMMIT || "N/A",
      BUILD_DATE: process.env.BUILD_DATE || "N/A",
      BUILD_ID: process.env.BUILD_ID || "N/A",
      BUILD_VERSION: process.env.BUILD_VERSION || "N/A",
    };
  });
}

// =============================================================================
// Server Initialization & Start
// =============================================================================

/**
 * Fully initializes the server with all default configurations
 * Creates server, registers auth, internal apps, external apps, and health routes
 *
 * @param {object} [options] - Initialization options
 * @param {string} [options.configPath] - Custom config file path
 * @param {object} [options.serverOptions] - Additional Fastify server options
 * @param {Array} [options.internalApps] - Custom internal apps (defaults to getDefaultApps())
 * @param {object} [options.internalAppsOptions] - Options to pass to individual default apps
 * @param {boolean} [options.skipExternalApps] - Skip loading external apps from config
 * @param {boolean} [options.skipHealthRoutes] - Skip registering health routes
 * @returns {Promise<{fastify: object, config: object, databaseUrl: string|undefined}>}
 */
export async function initializeServer(options = {}) {
  const { fastify, config, databaseUrl } = await createMainServer(options);

  // Register under construction auth if enabled
  await registerUnderConstructionAuth(fastify);

  // Register internal service modules
  await registerInternalApps(
    fastify,
    options.internalApps,
    options.internalAppsOptions
  );

  // Load external apps from config
  if (!options.skipExternalApps) {
    const appLoadStartTime = Date.now();
    await loadExternalApps(fastify, config, databaseUrl);
    const totalLoadTime = Date.now() - appLoadStartTime;

    fastify.log.info(
      { totalLoadTimeMs: totalLoadTime },
      `Apps and static assets loaded in ${totalLoadTime}ms`
    );
  }

  // Register health routes
  if (!options.skipHealthRoutes) {
    registerHealthRoutes(fastify);
  }

  return { fastify, config, databaseUrl };
}

/**
 * Starts the Fastify server
 *
 * @param {object} fastify - Fastify instance
 * @param {object} [options] - Start options
 * @param {number} [options.port] - Port to listen on (defaults to PORT env or 3000)
 * @param {string} [options.host] - Host to bind to (defaults to HOST env or '0.0.0.0')
 * @param {boolean} [options.quiet] - Suppress startup messages
 * @returns {Promise<void>}
 */
export async function startServer(fastify, options = {}) {
  const port = options.port || settings.PORT;
  const host = options.host || settings.HOST;

  await launchServer(fastify, {
    port,
    host,
    metadata: {
      appsLoaded: fastify.apps.list().map((app) => app.name),
    },
  });

  if (!options.quiet) {
    console.log("\n🚀 User-Auth Service is running!");
    console.log("📝 Try these endpoints:");
    console.log(`   - http://${host}:${port}/api/auth/login`);
    console.log(`   - http://${host}:${port}/api/auth/verify`);
    console.log(`   - http://${host}:${port}/api/users (requires auth)`);
    console.log("\n💡 Get a token first:");
    console.log(`   curl http://localhost:${port}/api/auth/login`);
    console.log("\n💡 Then use it:");
    console.log(
      `   curl -H "Authorization: Bearer valid-token" http://localhost:${port}/api/users`
    );
  }
}

// =============================================================================
// Convenience Export
// =============================================================================

/**
 * Full server bootstrap - initialize and start in one call
 *
 * @param {object} [options] - Options passed to initializeServer and startServer
 * @returns {Promise<{fastify: object, config: object, databaseUrl: string|undefined}>}
 */
export async function bootstrap(options = {}) {
  const result = await initializeServer(options);
  await startServer(result.fastify, options);
  return result;
}
