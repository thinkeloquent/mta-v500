/**
 * @module @internal/core-plugin-logger
 * Fastify plugin for logging all registered plugins
 */

import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { PluginLoggerOptions, PluginLogResult } from './types.js';
import { PluginLoggerOptionsSchema } from './types.js';

/**
 * Default options for the plugin logger
 */
const DEFAULT_OPTIONS: Required<PluginLoggerOptions> = {
  enabled: true,
  outputPath: './plugins.log',
  consoleOutput: true,
  fileOutput: true,
  includeTimestamp: true,
  prettyPrint: true,
  outputMode: 'pretty',
  loggerOutput: false,
  port: 3000,
  host: '0.0.0.0',
};

/**
 * Filter out internal bound_ entries from plugins output
 */
function filterBoundEntries(pluginsString: string): string {
  return pluginsString
    .split('\n')
    .filter((line) => !line.includes('bound _'))
    .join('\n');
}

/**
 * Format plugins for display
 */
function formatPlugins(plugins: string, options: Required<PluginLoggerOptions>): string {
  const { port } = options;
  const filteredPlugins = filterBoundEntries(plugins);
  const timestamp = options.includeTimestamp ? `Generated at: ${new Date().toISOString()}\n\n` : '';

  if (options.prettyPrint) {
    const header = `${'='.repeat(80)}\nFastify Plugins\nhttp://localhost:${port}\n${'='.repeat(80)}\n`;
    const footer = `\n${'='.repeat(80)}\n`;
    return `${header}${timestamp}${filteredPlugins}${footer}`;
  }

  return `${timestamp}${filteredPlugins}`;
}

/**
 * Parse and count plugins from the printPlugins output
 * Handles tree format output, excludes internal bound_ entries
 */
function countPlugins(pluginsString: string): number {
  const lines = pluginsString
    .split('\n')
    .filter((line) => line.trim() && !line.includes('bound _'));

  // Count lines that represent plugins (lines with tree characters or plugin names)
  // Plugins are indicated by lines starting with └──, ├──, or containing plugin markers
  return lines.filter((line) => {
    const trimmed = line.trim();
    return (
      trimmed.startsWith('└──') ||
      trimmed.startsWith('├──') ||
      // Also count lines that don't have tree characters but contain plugin info
      (trimmed && !trimmed.startsWith('│') && trimmed.length > 0)
    );
  }).length;
}

/**
 * Log plugins to console
 * Uses console.log directly to ensure output regardless of Fastify logger configuration
 * Wrapped in setImmediate to prevent conflicts with Fastify's response handling in onReady hook
 */
function logToConsole(formattedPlugins: string): void {
  setImmediate(() => {
    console.log('\n' + formattedPlugins);
  });
}

/**
 * Write plugins to file
 */
async function logToFile(formattedPlugins: string, outputPath: string, logger: any): Promise<void> {
  try {
    // Ensure directory exists
    const dir = dirname(outputPath);
    await mkdir(dir, { recursive: true });

    // Write to file
    await writeFile(outputPath, formattedPlugins, 'utf-8');
    logger.info(`Plugins written to: ${outputPath}`);
  } catch (error) {
    logger.error({ error }, `Failed to write plugins to file: ${outputPath}`);
    throw error;
  }
}

/**
 * Log plugins as structured JSON to Fastify logger
 */
function logToFastifyLogger(pluginsString: string, pluginCount: number, logger: any): void {
  // Parse plugins into array of lines
  const pluginLines = pluginsString
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => line.trim());

  // Log as structured JSON
  logger.info(
    {
      event: 'plugins_registered',
      timestamp: new Date().toISOString(),
      count: pluginCount,
      plugins: pluginLines,
    },
    `Registered ${pluginCount} plugins`,
  );
}

/**
 * Fastify plugin for plugin logging
 */
const pluginLoggerPlugin: FastifyPluginAsync<PluginLoggerOptions> = async (fastify, options) => {
  // Validate and merge options with defaults
  const validatedOptions = PluginLoggerOptionsSchema.parse(options);
  const opts: Required<PluginLoggerOptions> = {
    ...DEFAULT_OPTIONS,
    ...validatedOptions,
  };

  // Skip if disabled
  if (!opts.enabled) {
    fastify.log.info('Plugin logger is disabled');
    return;
  }

  fastify.log.info('Initializing plugin logger plugin...');

  // Register onReady hook to log plugins after server is ready
  fastify.addHook('onReady', async () => {
    const hookStartTime = Date.now();
    fastify.log.debug({ hook: 'onReady', plugin: 'core-plugin-logger' }, 'Hook started');

    try {
      fastify.log.info('Server is ready, logging plugins...');

      // Get plugins from Fastify
      const pluginsString = fastify.printPlugins();

      // Count plugins
      const pluginCount = countPlugins(pluginsString);

      // Initialize result
      const result: PluginLogResult = {
        success: true,
        pluginCount,
        consoleLogged: false,
        fileLogged: false,
        loggerLogged: false,
      };

      // Determine actual output mode (handle deprecated loggerOutput option)
      let effectiveOutputMode = opts.outputMode;
      if (opts.loggerOutput && effectiveOutputMode === 'pretty') {
        // Backwards compatibility: loggerOutput=true means 'both'
        effectiveOutputMode = 'both';
      }

      // Handle different output modes
      if (effectiveOutputMode === 'json') {
        // JSON mode: Only structured JSON to fastify.log
        logToFastifyLogger(pluginsString, pluginCount, fastify.log);
        result.loggerLogged = true;
      } else if (effectiveOutputMode === 'both') {
        // Both mode: Pretty console/file + JSON to fastify.log
        const formattedPlugins = formatPlugins(pluginsString, opts);

        // Log to console if enabled
        if (opts.consoleOutput) {
          logToConsole(formattedPlugins);
          result.consoleLogged = true;
        }

        // Write to file if enabled
        if (opts.fileOutput) {
          await logToFile(formattedPlugins, opts.outputPath, fastify.log);
          result.fileLogged = true;
          result.outputPath = opts.outputPath;
        }

        // Also log as structured JSON
        logToFastifyLogger(pluginsString, pluginCount, fastify.log);
        result.loggerLogged = true;
      } else {
        // Pretty mode (default): Console and/or file output
        const formattedPlugins = formatPlugins(pluginsString, opts);

        // Log to console if enabled
        if (opts.consoleOutput) {
          logToConsole(formattedPlugins);
          result.consoleLogged = true;
        }

        // Write to file if enabled
        if (opts.fileOutput) {
          await logToFile(formattedPlugins, opts.outputPath, fastify.log);
          result.fileLogged = true;
          result.outputPath = opts.outputPath;
        }
      }

      // Log summary
      fastify.log.info(
        {
          pluginCount: result.pluginCount,
          consoleLogged: result.consoleLogged,
          fileLogged: result.fileLogged,
          loggerLogged: result.loggerLogged,
          outputPath: result.outputPath,
          outputMode: effectiveOutputMode,
        },
        'Plugin logging completed',
      );

      // Decorate fastify with the result (optional, for testing)
      fastify.decorate('pluginLogResult', result);

      const hookDuration = Date.now() - hookStartTime;
      fastify.log.debug(
        { hook: 'onReady', plugin: 'core-plugin-logger', duration: hookDuration },
        'Hook completed successfully',
      );
    } catch (error) {
      const hookDuration = Date.now() - hookStartTime;
      fastify.log.error(
        {
          error,
          stack: error instanceof Error ? error.stack : undefined,
          hook: 'onReady',
          plugin: 'core-plugin-logger',
          duration: hookDuration,
        },
        'Plugin logger onReady hook failed',
      );

      // Decorate with error result
      const errorResult: PluginLogResult = {
        success: false,
        pluginCount: 0,
        consoleLogged: false,
        fileLogged: false,
        loggerLogged: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      fastify.decorate('pluginLogResult', errorResult);

      // Don't throw - we don't want to prevent server startup
    }
  });

  fastify.log.info('Plugin logger plugin initialized');
};

// Export as fastify plugin
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default fp(pluginLoggerPlugin as any, {
  name: 'core-plugin-logger',
  fastify: '>=4.0.0',
});

// Augment Fastify type definitions
declare module 'fastify' {
  interface FastifyInstance {
    pluginLogResult?: PluginLogResult;
  }
}
