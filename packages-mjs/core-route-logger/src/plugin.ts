/**
 * @module @internal/core-route-logger
 * Fastify plugin for logging all registered routes
 */

import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { mkdir, writeFile } from "fs/promises";
import { dirname } from "path";
import type { RouteLoggerOptions, RouteLogResult } from "./types.js";
import { RouteLoggerOptionsSchema } from "./types.js";

/**
 * Default options for the route logger
 */
const DEFAULT_OPTIONS: Required<RouteLoggerOptions> = {
  enabled: true,
  outputPath: "./routes.log",
  consoleOutput: true,
  fileOutput: true,
  includeTimestamp: true,
  prettyPrint: true,
  outputMode: "pretty",
  loggerOutput: false,
  flattenRoutes: false,
  port: 3000,
  host: "0.0.0.0",
};

/**
 * Format routes for display
 */
function formatRoutes(
  routes: string,
  options: Required<RouteLoggerOptions>
): string {
  const { port } = options;
  const timestamp = options.includeTimestamp
    ? `Generated at: ${new Date().toISOString()}\n\n`
    : "";

  if (options.prettyPrint) {
    const header = `${"=".repeat(80)}\nFastify Routes\nhttp://localhost:${port}\n${"=".repeat(80)}\n`;
    const footer = `\n${"=".repeat(80)}\n`;
    return `${header}${timestamp}${routes}${footer}`;
  }

  return `${timestamp}${routes}`;
}

/**
 * Parse and count routes from the printRoutes output
 * Handles both tree format and flattened format
 */
function countRoutes(routesString: string): number {
  const lines = routesString.split("\n").filter((line) => line.trim());

  // Check if this is tree format (contains tree characters) or flat format
  const isTreeFormat = lines.some(
    (line) => line.includes("└──") || line.includes("├──") || line.includes("│")
  );

  if (isTreeFormat) {
    // Count lines that start with └── or ├── (route indicators in tree format)
    return lines.filter(
      (line) => line.trim().startsWith("└──") || line.trim().startsWith("├──")
    ).length;
  } else {
    // For flat format, count all non-empty lines (each line is a route)
    return lines.length;
  }
}

/**
 * Flatten routes tree structure into a simple list
 * Parses the tree output and converts to "METHOD /path" format
 */
function flattenRoutesTree(routesString: string): string {
  const lines = routesString.split("\n");
  const flatRoutes: string[] = [];
  const pathStack: string[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    // Remove tree characters (└──, ├──, │, spaces)
    const cleanLine = line.replace(/[└├│─\s]/g, "");
    if (!cleanLine) continue;

    // Calculate indentation level to determine path hierarchy
    const indent = line.search(/[└├]/);
    const level = indent >= 0 ? Math.floor(indent / 4) : 0;

    // Check if line contains methods in parentheses
    const methodMatch = cleanLine.match(/^(.+?)\(([^)]+)\)$/);

    if (methodMatch) {
      const [, pathPart, methodsPart] = methodMatch;
      const methods = methodsPart.split(",").map((m) => m.trim());

      // Update path stack for current level
      pathStack[level] = pathPart;
      pathStack.length = level + 1;

      // Build full path
      const fullPath =
        "/" +
        pathStack
          .filter(Boolean)
          .join("")
          .replace(/\/+/g, "/")
          .replace(/^\//, "");

      // Add each method as a separate route
      for (const method of methods) {
        flatRoutes.push(`${method.padEnd(7)} ${fullPath || "/"}`);
      }
    } else {
      // Path segment without methods (intermediate path)
      pathStack[level] = cleanLine;
      pathStack.length = level + 1;
    }
  }

  return flatRoutes.join("\n");
}

/**
 * Log routes to console
 * Uses console.log directly to ensure output regardless of Fastify logger configuration
 * Wrapped in setImmediate to prevent conflicts with Fastify's response handling in onReady hook
 */
function logToConsole(formattedRoutes: string): void {
  setImmediate(() => {
    console.log("\n" + formattedRoutes);
  });
}

/**
 * Write routes to file
 */
async function logToFile(
  formattedRoutes: string,
  outputPath: string,
  logger: any
): Promise<void> {
  try {
    // Ensure directory exists
    const dir = dirname(outputPath);
    await mkdir(dir, { recursive: true });

    // Write to file
    await writeFile(outputPath, formattedRoutes, "utf-8");
    logger.info(`Routes written to: ${outputPath}`);
  } catch (error) {
    logger.error({ error }, `Failed to write routes to file: ${outputPath}`);
    throw error;
  }
}

/**
 * Log routes as structured JSON to Fastify logger
 */
function logToFastifyLogger(
  routesString: string,
  routeCount: number,
  logger: any
): void {
  // Parse routes into array of lines
  const routeLines = routesString
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => line.trim());

  // Log as structured JSON
  logger.info(
    {
      event: "routes_registered",
      timestamp: new Date().toISOString(),
      count: routeCount,
      routes: routeLines,
    },
    `Registered ${routeCount} routes`
  );
}

/**
 * Fastify plugin for route logging
 */
const routeLoggerPlugin: FastifyPluginAsync<RouteLoggerOptions> = async (
  fastify,
  options
) => {
  // Validate and merge options with defaults
  const validatedOptions = RouteLoggerOptionsSchema.parse(options);
  const opts: Required<RouteLoggerOptions> = {
    ...DEFAULT_OPTIONS,
    ...validatedOptions,
  };

  // Skip if disabled
  if (!opts.enabled) {
    fastify.log.info("Route logger is disabled");
    return;
  }

  fastify.log.info("Initializing route logger plugin...");

  // Register onReady hook to log routes after server is ready
  fastify.addHook("onReady", async () => {
    const hookStartTime = Date.now();
    fastify.log.debug(
      { hook: "onReady", plugin: "core-route-logger" },
      "Hook started"
    );

    try {
      fastify.log.info("Server is ready, logging routes...");

      // Get routes from Fastify
      let routesString = fastify.printRoutes({ commonPrefix: false });

      // Flatten routes if option is enabled
      if (opts.flattenRoutes) {
        routesString = flattenRoutesTree(routesString);
      }

      // Count routes
      const routeCount = countRoutes(routesString);

      // Initialize result
      const result: RouteLogResult = {
        success: true,
        routeCount,
        consoleLogged: false,
        fileLogged: false,
        loggerLogged: false,
      };

      // Determine actual output mode (handle deprecated loggerOutput option)
      let effectiveOutputMode = opts.outputMode;
      if (opts.loggerOutput && effectiveOutputMode === "pretty") {
        // Backwards compatibility: loggerOutput=true means 'both'
        effectiveOutputMode = "both";
      }

      // Handle different output modes
      if (effectiveOutputMode === "json") {
        // JSON mode: Only structured JSON to fastify.log
        logToFastifyLogger(routesString, routeCount, fastify.log);
        result.loggerLogged = true;
      } else if (effectiveOutputMode === "both") {
        // Both mode: Pretty console/file + JSON to fastify.log
        const formattedRoutes = formatRoutes(routesString, opts);

        // Log to console if enabled
        if (opts.consoleOutput) {
          logToConsole(formattedRoutes);
          result.consoleLogged = true;
        }

        // Write to file if enabled
        if (opts.fileOutput) {
          await logToFile(formattedRoutes, opts.outputPath, fastify.log);
          result.fileLogged = true;
          result.outputPath = opts.outputPath;
        }

        // Also log as structured JSON
        logToFastifyLogger(routesString, routeCount, fastify.log);
        result.loggerLogged = true;
      } else {
        // Pretty mode (default): Console and/or file output
        const formattedRoutes = formatRoutes(routesString, opts);

        // Log to console if enabled
        if (opts.consoleOutput) {
          logToConsole(formattedRoutes);
          result.consoleLogged = true;
        }

        // Write to file if enabled
        if (opts.fileOutput) {
          await logToFile(formattedRoutes, opts.outputPath, fastify.log);
          result.fileLogged = true;
          result.outputPath = opts.outputPath;
        }
      }

      // Log summary
      fastify.log.info(
        {
          routeCount: result.routeCount,
          consoleLogged: result.consoleLogged,
          fileLogged: result.fileLogged,
          loggerLogged: result.loggerLogged,
          outputPath: result.outputPath,
          outputMode: effectiveOutputMode,
        },
        "Route logging completed"
      );

      // Decorate fastify with the result (optional, for testing)
      fastify.decorate("routeLogResult", result);

      const hookDuration = Date.now() - hookStartTime;
      fastify.log.debug(
        {
          hook: "onReady",
          plugin: "core-route-logger",
          duration: hookDuration,
        },
        "Hook completed successfully"
      );
    } catch (error) {
      const hookDuration = Date.now() - hookStartTime;
      fastify.log.error(
        {
          error,
          stack: error instanceof Error ? error.stack : undefined,
          hook: "onReady",
          plugin: "core-route-logger",
          duration: hookDuration,
        },
        "Route logger onReady hook failed"
      );

      // Decorate with error result
      const errorResult: RouteLogResult = {
        success: false,
        routeCount: 0,
        consoleLogged: false,
        fileLogged: false,
        loggerLogged: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };

      fastify.decorate("routeLogResult", errorResult);

      // Don't throw - we don't want to prevent server startup
    }
  });

  fastify.log.info("Route logger plugin initialized");
};

// Export as fastify plugin
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default fp(routeLoggerPlugin as any, {
  name: "core-route-logger",
  fastify: ">=4.0.0",
});

// Augment Fastify type definitions
declare module "fastify" {
  interface FastifyInstance {
    routeLogResult?: RouteLogResult;
  }
}
