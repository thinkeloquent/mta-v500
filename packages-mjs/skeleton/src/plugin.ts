import noCache from "@internal/core-no-cache";
import pluginLogger from "@internal/core-plugin-logger";
import routeLogger from "@internal/core-route-logger";
import type { FastifyInstance } from "fastify";
import {
  type AppRegistration,
  AppRegistry,
  type RegisteredApp,
} from "./lib/app-registry.js";
import { headerRequestEnhancements } from "./plugins/header-request-enhancements/index.js";
import { processExceptionHandlers } from "./plugins/process-exception/index.js";
import { swaggerPlugin } from "./plugins/swagger/index.js";
import type { ServerConfig } from "./types.js";

const swaggerRegisterPlugin = async (fastify: FastifyInstance) => {
  // ==========================================
  // Swagger/OpenAPI Documentation Plugin
  // ==========================================
  //
  // Choose ONE of the following approaches:
  //
  // 1. SINGLE-MODULE MODE (default - simple setup)
  //    Use this for single apps or when you don't need module separation
  //
  // 2. MULTI-MODULE MODE (for monorepos/microservices)
  //    Use this when you have multiple apps/modules that need separate docs
  //    Each module gets its own route: /documentation/{type}/{moduleName}
  //

  // ========== OPTION 1: Single-Module Mode (Currently Active) ==========
  await fastify.register(swaggerPlugin, {
    routePrefix: "/documentation",
    openapi: {
      title:
        process.env.NODE_ENV === "development"
          ? "API Documentation (Development)"
          : "API Documentation",
      version: "1.0.0",
      description: "REST API documentation",
    },
    ui: {
      displayOperationId: process.env.NODE_ENV === "development",
      defaultModelsExpandDepth: process.env.NODE_ENV === "development" ? 3 : 1,
      defaultModelExpandDepth: process.env.NODE_ENV === "development" ? 3 : 1,
    },
  });

  // ========== OPTION 2: Multi-Module Mode (Commented Out) ==========
  // Uncomment this section and comment out OPTION 1 above to enable multi-module mode
  //
  // // Register your modules BEFORE registering the multiModuleSwagger plugin
  // registerModule({
  //   module: {
  //     name: 'core-api',
  //     type: 'core',
  //     version: '1.0.0',
  //     description: 'Core API functionality',
  //     tags: ['core', 'api'],
  //   },
  // });
  //
  // // Example: Register an app module
  // registerModule({
  //   module: {
  //     name: 'user-service',
  //     type: 'apps',
  //     version: '1.0.0',
  //     description: 'User management service',
  //     routePrefix: '/api/users',
  //     tags: ['users', 'authentication'],
  //     contact: {
  //       name: 'User Service Team',
  //       email: 'users@example.com',
  //     },
  //   },
  // });
  //
  // // Example: Register a capability module
  // registerModule({
  //   module: {
  //     name: 'analytics',
  //     type: 'capability',
  //     version: '2.0.0',
  //     description: 'Analytics and reporting capabilities',
  //     routePrefix: '/api/analytics',
  //     tags: ['analytics', 'reports'],
  //   },
  // });
  //
  // // Register the multi-module plugin
  // await fastify.register(multiModuleSwagger, {
  //   enableCombinedDocs: true,
  //   combinedDocsRoute: '/documentation',
  //   globalOptions: {
  //     ui: {
  //       displayOperationId: process.env.NODE_ENV === "development",
  //       defaultModelsExpandDepth: process.env.NODE_ENV === "development" ? 3 : 1,
  //       defaultModelExpandDepth: process.env.NODE_ENV === "development" ? 3 : 1,
  //     },
  //   },
  // });
  //
  // Module docs will be available at:
  // - /documentation (combined view of all modules)
  // - /documentation/core/core-api
  // - /documentation/apps/user-service
  // - /documentation/capability/analytics
};

export default async (fastify: FastifyInstance, config: ServerConfig) => {
  // Register process exception handlers plugin first
  // This ensures error handling and graceful shutdown are set up before other plugins
  await fastify.register(processExceptionHandlers, {
    // Use environment-based configuration
    enableErrorHandler: true,
    enableGracefulShutdown: true,
    enableProcessHandlers: true,
    shutdownTimeout: process.env.NODE_ENV === "production" ? 30000 : 10000,
    exposeGracefulShutdown: true,
    features: {
      validationErrors: true,
      handleSigInt: true,
      handleSigTerm: true,
      handleUnhandledRejection: true,
      handleUncaughtException: true,
    },
  });

  // Register header request enhancements plugin
  await fastify.register(headerRequestEnhancements, {
    // CORS: allow any localhost in non-production, use CORS_ALLOW_ORIGINS in production
    corsAllowLocalhost: config.corsAllowLocalhost ?? (process.env.NODE_ENV !== "production"),
    corsUseOrigin: config.corsUseOrigin,
    corsAllowedOrigins: config.corsAllowedOrigins,
    rateLimitMax: process.env.NODE_ENV === "production" ? 100 : 1000,
  });

  // ==========================================
  // No-Cache Plugin - Disables caching for development
  // ==========================================
  await fastify.register(noCache, {
    enabled: process.env.NODE_ENV === "development",
  });

  // ==========================================
  // App Registry - Dynamic app loading
  // ==========================================
  fastify.log.info("Initializing App Registry");

  let registry: AppRegistry;

  try {
    // Support configurable base path via environment variable
    // Defaults to process.cwd() if not set
    const basePath = process.env.MONOREPO_ROOT;
    registry = new AppRegistry(fastify, basePath);

    // Decorate fastify instance with app registry methods
    fastify.decorate("apps", {
      register: registry.register.bind(registry),
      registerAll: registry.registerAll.bind(registry),
      loadApps: registry.loadApps.bind(registry),
      get: registry.get.bind(registry),
      list: registry.list.bind(registry),
      isLoaded: registry.isLoaded.bind(registry),
    });

    fastify.log.info("📦 App registry initialized");
  } catch (error) {
    fastify.log.error(
      {
        error: (error as Error).message,
        stack: (error as Error).stack,
      },
      "Failed to initialize App Registry"
    );
    throw error;
  }

  // ==========================================
  // App Management Routes
  // ==========================================

  // List all registered apps
  fastify.get("/sys/status/apps", async () => {
    return {
      apps: fastify.apps.list().map((app) => ({
        name: app.name,
        status: app.status,
        backendPrefix: app.options?.backendPrefix,
        frontendPrefix: app.options?.frontendPrefix,
        version: app.metadata?.version,
        description: app.metadata?.description,
        loadedAt: app.loadedAt,
        error: app.error?.message,
      })),
      summary: {
        total: fastify.apps.list().length,
        loaded: registry.getLoadedCount(),
        failed: registry.getFailedCount(),
      },
    };
  });

  // Get specific app details
  fastify.get<{ Params: { name: string } }>(
    "/sys/status/apps/:name",
    async (request, reply) => {
      const app = fastify.apps.get(request.params.name);
      if (!app) {
        return reply.code(404).send({ error: "App not found" });
      }

      return {
        name: app.name,
        status: app.status,
        options: app.options,
        metadata: app.metadata,
        loadedAt: app.loadedAt,
        error: app.error
          ? {
              message: app.error.message,
              stack:
                process.env.NODE_ENV === "development"
                  ? app.error.stack
                  : undefined,
            }
          : undefined,
      };
    }
  );

  // Health check for specific app
  fastify.get<{ Params: { name: string } }>(
    "/sys/status/apps/:name/health",
    async (request, reply) => {
      const app = fastify.apps.get(request.params.name);
      if (!app) {
        return reply.code(404).send({ error: "App not found" });
      }

      const healthy = app.status === "loaded";

      if (!healthy) {
        return reply.code(503).send({
          healthy: false,
          status: app.status,
          error: app.error?.message,
        });
      }

      return {
        healthy: true,
        status: app.status,
        loadedAt: app.loadedAt,
      };
    }
  );

  await swaggerRegisterPlugin(fastify);

  // ==========================================
  // Plugin Logger - Logs all registered plugins
  // ==========================================
  await fastify.register(pluginLogger, {
    enabled: true,
    // enabled: process.env.NODE_ENV === "development",
    consoleOutput: true,
    fileOutput: true,
    outputPath: "./logs/plugins.log",
    prettyPrint: true,
    includeTimestamp: true,
    outputMode: "pretty", // Options: 'pretty', 'json', 'both'
    host: config.host ?? "0.0.0.0",
    port: config.port ?? 3000,
  });

  // ==========================================
  // Route Logger - Logs all registered routes
  // ==========================================
  await fastify.register(routeLogger, {
    enabled: true,
    // enabled: process.env.NODE_ENV === "development",
    consoleOutput: true,
    fileOutput: true,
    outputPath: "./logs/routes.log",
    prettyPrint: true,
    includeTimestamp: true,
    outputMode: "pretty", // Options: 'pretty', 'json', 'both'
    host: config.host ?? "0.0.0.0",
    port: config.port ?? 3000,
  });
};

// ==========================================
// Type Augmentation for fastify.apps
// ==========================================
declare module "fastify" {
  interface FastifyInstance {
    apps: {
      register: (registration: AppRegistration) => Promise<void>;
      registerAll: (registrations: AppRegistration[]) => Promise<void>;
      loadApps: (
        appConfigs: Array<{
          name: string;
          enabled?: boolean;
          dependencies?: string[];
          [key: string]: unknown;
        }>,
        databaseUrl?: string
      ) => Promise<{ loadAppStaticAssets: () => Promise<void> }>;
      get: (name: string) => RegisteredApp | undefined;
      list: () => RegisteredApp[];
      isLoaded: (name: string) => boolean;
    };
  }
}
