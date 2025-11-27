import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import plugin from "./plugin.js";
import type { ServerConfig, LaunchConfig } from "./types.js";

// Export app registry types for consumers
export type { AppRegistration, RegisteredApp } from "./lib/app-registry.js";
export { AppRegistry } from "./lib/app-registry.js";

// Export config types
export type { ServerConfig, LaunchConfig } from "./types.js";

/**
 * Creates and configures a Fastify instance with all plugins
 * @param config - Optional server configuration
 * @returns Configured Fastify instance
 */
export const createServer = async (
  config: ServerConfig = {}
): Promise<FastifyInstance> => {
  // Disable pino-pretty transport in watch mode to prevent worker thread issues
  // tsx sets NODE_ENV to development by default, so we check for TSX explicitly
  const isWatchMode =
    process.env.TSX_WATCH_MODE === "true" || process.argv.includes("--watch");
  const shouldUsePrettyPrint = config?.prettyPrint !== false && !isWatchMode;

  const fastify = Fastify({
    logger: {
      level: config?.loggerLevel || "info",
      transport: shouldUsePrettyPrint
        ? {
            target: "pino-pretty",
            options: {
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
            },
          }
        : undefined,
    },
  });

  await plugin(fastify, config);

  // Add cleanup hook to flush logger on shutdown
  fastify.addHook("onClose", async (instance) => {
    instance.log.info("Flushing logger before shutdown...");
    // Pino's flush method ensures all pending logs are written
    const logger = instance.log as { flush?: () => Promise<void> | void };
    if (typeof logger.flush === "function") {
      await logger.flush();
    }
  });

  return fastify;
};

/**
 * Starts the Fastify server with the given configuration
 * @param fastify - Fastify instance to start
 * @param config - Launch configuration with port, host, and optional metadata
 * @returns The started Fastify instance for lifecycle management
 */
export const launchServer = async (
  fastify: FastifyInstance,
  config?: LaunchConfig
): Promise<FastifyInstance> => {
  // Validate fastify instance
  if (!fastify) {
    throw new Error("Fastify instance is required");
  }

  const port = config?.port || 3000;
  const host = config?.host || "0.0.0.0";

  // Validate port
  if (typeof port !== "number" || port < 0 || port > 65535) {
    throw new Error(
      `Invalid port: ${port}. Port must be a number between 0 and 65535`
    );
  }

  // Validate host
  if (typeof host !== "string" || !host.trim()) {
    throw new Error(`Invalid host: ${host}. Host must be a non-empty string`);
  }

  fastify.log.info(
    {
      port,
      host,
      environment: process.env.NODE_ENV || "development",
    },
    `Starting server on ${host}:${port}`
  );

  try {
    // Use Promise-based listen for better lifecycle management
    const address = await fastify.listen({ port, host });

    // Use structured logging for successful startup
    const appsLoaded = config?.metadata?.appsLoaded || [];
    const environment = process.env.NODE_ENV || "development";

    fastify.log.info(
      {
        address,
        port,
        host,
        appsLoaded,
        appCount: appsLoaded.length,
        environment,
        ...config?.metadata,
      },
      `🚀 Server listening at ${address}`
    );

    // Log additional startup information
    if (appsLoaded.length > 0) {
      fastify.log.info(
        { apps: appsLoaded },
        `📦 Apps loaded: ${appsLoaded.join(", ")}`
      );
    }

    fastify.log.info(
      { url: `${address}/documentation` },
      `📄 API Documentation: ${address}/documentation`
    );
    fastify.log.info(
      { url: `${address}/apps` },
      `🔍 App Registry: ${address}/apps`
    );

    return fastify;
  } catch (err) {
    const error = err as { message: string; code?: string };
    fastify.log.error(
      {
        error: error.message,
        code: error.code,
        port,
        host,
      },
      "Failed to start server"
    );

    // Log additional details for port conflicts
    if (error.code === "EADDRINUSE") {
      fastify.log.error(
        `\n❌ Port ${port} is already in use. Please stop the other server or use a different port.\n`
      );
    }

    process.exit(1);
  }
};

// Default export for convenience
export default createServer;
