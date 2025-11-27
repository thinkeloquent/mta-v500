/**
 * CORS Configuration Loader
 *
 * Loads and merges CORS configuration from:
 * 1. Central cors.json file
 * 2. Environment variables (highest priority)
 *
 * @module cors-config-loader
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyBaseLogger } from 'fastify';
import type { CorsConfig, OriginPattern } from './cors-policy-engine.js';

// =============================================================================
// Types
// =============================================================================

export interface CorsConfigLoaderOptions {
  /** Path to cors.json file */
  configPath?: string;
  /** Override environment (defaults to NODE_ENV) */
  environment?: string;
  /** Logger instance */
  logger?: FastifyBaseLogger;
  /** Monorepo root path */
  monorepoRoot?: string;
}

export interface LoadedCorsConfig extends CorsConfig {
  /** Source of the configuration */
  _source: string;
  /** Environment variables that were applied */
  _envOverrides: string[];
}

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: CorsConfig = {
  version: '1.0.0',
  description: 'Default CORS configuration',
  global: {
    enabled: true,
    credentials: true,
    maxAge: 3600,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    logging: {
      enabled: true,
      level: 'warn',
      includeRejections: true,
      includeAllowances: false,
    },
  },
  environments: {
    development: {
      description: 'Default development configuration',
      origins: [
        {
          type: 'regex',
          pattern: '^https?://(localhost|127\\.0\\.0\\.1)(:\\d+)?$',
          description: 'Any localhost port',
        },
      ],
      strictMode: false,
    },
    production: {
      description: 'Default production configuration',
      origins: [],
      strictMode: true,
      requireExplicitOrigins: true,
    },
  },
};

// =============================================================================
// Configuration Loader
// =============================================================================

/**
 * Loads CORS configuration from file and merges with environment variables
 */
export function loadCorsConfig(options: CorsConfigLoaderOptions = {}): LoadedCorsConfig {
  const {
    configPath,
    environment = process.env.NODE_ENV || 'development',
    logger,
    monorepoRoot = process.env.MONOREPO_ROOT,
  } = options;

  const envOverrides: string[] = [];
  let config: CorsConfig;
  let source: string;

  // Determine config file path
  const resolvedPath = resolveConfigPath(configPath, monorepoRoot);

  // Load configuration
  if (resolvedPath && existsSync(resolvedPath)) {
    try {
      const fileContents = readFileSync(resolvedPath, 'utf-8');
      config = JSON.parse(fileContents) as CorsConfig;
      source = resolvedPath;
      logger?.debug({ path: resolvedPath }, 'Loaded CORS config from file');
    } catch (error) {
      logger?.error(
        { error: (error as Error).message, path: resolvedPath },
        'Failed to load CORS config file, using defaults',
      );
      config = structuredClone(DEFAULT_CONFIG);
      source = 'default (file load failed)';
    }
  } else {
    logger?.info(
      { searchedPath: resolvedPath },
      'CORS config file not found, using defaults',
    );
    config = structuredClone(DEFAULT_CONFIG);
    source = 'default';
  }

  // Apply environment variable overrides
  config = applyEnvironmentOverrides(config, environment, envOverrides, logger);

  return {
    ...config,
    _source: source,
    _envOverrides: envOverrides,
  };
}

/**
 * Resolves the path to cors.json
 */
function resolveConfigPath(configPath?: string, monorepoRoot?: string): string | null {
  // Explicit path takes priority
  if (configPath) {
    return resolve(configPath);
  }

  // Try monorepo root
  if (monorepoRoot) {
    const monorepoPath = resolve(monorepoRoot, 'common/config/cors.json');
    if (existsSync(monorepoPath)) {
      return monorepoPath;
    }
  }

  // Try relative paths from current file
  const possiblePaths = [
    // From packages-mjs/skeleton/src/lib/ up to monorepo root
    resolve(dirname(fileURLToPath(import.meta.url)), '../../../../common/config/cors.json'),
    // From packages-mjs/skeleton/dist/lib/ up to monorepo root
    resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../common/config/cors.json'),
    // Absolute common path
    '/Users/Shared/autoload/mta-v500/common/config/cors.json',
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}

/**
 * Applies environment variable overrides to the configuration
 */
function applyEnvironmentOverrides(
  config: CorsConfig,
  environment: string,
  envOverrides: string[],
  logger?: FastifyBaseLogger,
): CorsConfig {
  // CORS_ALLOW_ORIGINS - Comma-separated list of origins
  const corsAllowOrigins = process.env.CORS_ALLOW_ORIGINS;
  if (corsAllowOrigins) {
    const origins = parseOriginsFromEnv(corsAllowOrigins);
    if (origins.length > 0) {
      // Initialize environment if not exists
      if (!config.environments[environment]) {
        config.environments[environment] = {
          origins: [],
          strictMode: environment === 'production',
        };
      }

      // Add parsed origins
      config.environments[environment].origins = [
        ...config.environments[environment].origins,
        ...origins,
      ];

      envOverrides.push('CORS_ALLOW_ORIGINS');
      logger?.info(
        { origins: origins.map((o) => o.value || o.pattern), environment },
        'Applied CORS_ALLOW_ORIGINS override',
      );
    }
  }

  // CORS_STRICT_MODE - Force strict validation
  const corsStrictMode = process.env.CORS_STRICT_MODE;
  if (corsStrictMode !== undefined) {
    const strict = corsStrictMode.toLowerCase() === 'true';
    if (config.environments[environment]) {
      config.environments[environment].strictMode = strict;
      envOverrides.push('CORS_STRICT_MODE');
      logger?.info({ strictMode: strict, environment }, 'Applied CORS_STRICT_MODE override');
    }
  }

  // CORS_LOG_LEVEL - Override logging level
  const corsLogLevel = process.env.CORS_LOG_LEVEL;
  if (corsLogLevel && ['debug', 'info', 'warn', 'error'].includes(corsLogLevel)) {
    config.global.logging.level = corsLogLevel as 'debug' | 'info' | 'warn' | 'error';
    envOverrides.push('CORS_LOG_LEVEL');
    logger?.info({ level: corsLogLevel }, 'Applied CORS_LOG_LEVEL override');
  }

  // CORS_ENABLED - Global enable/disable
  const corsEnabled = process.env.CORS_ENABLED;
  if (corsEnabled !== undefined) {
    config.global.enabled = corsEnabled.toLowerCase() === 'true';
    envOverrides.push('CORS_ENABLED');
    logger?.info({ enabled: config.global.enabled }, 'Applied CORS_ENABLED override');
  }

  // CORS_CREDENTIALS - Allow credentials
  const corsCredentials = process.env.CORS_CREDENTIALS;
  if (corsCredentials !== undefined) {
    config.global.credentials = corsCredentials.toLowerCase() === 'true';
    envOverrides.push('CORS_CREDENTIALS');
    logger?.info({ credentials: config.global.credentials }, 'Applied CORS_CREDENTIALS override');
  }

  return config;
}

/**
 * Parses a comma-separated list of origins from environment variable
 * Supports exact URLs and patterns prefixed with 'regex:' or 'wildcard:'
 */
function parseOriginsFromEnv(value: string): OriginPattern[] {
  const origins: OriginPattern[] = [];

  const parts = value.split(',').map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.startsWith('regex:')) {
      origins.push({
        type: 'regex',
        pattern: part.slice(6),
        description: 'From CORS_ALLOW_ORIGINS env var',
      });
    } else if (part.startsWith('wildcard:')) {
      origins.push({
        type: 'wildcard',
        pattern: part.slice(9),
        description: 'From CORS_ALLOW_ORIGINS env var',
      });
    } else if (part === '*') {
      // Wildcard all - use permissive regex
      origins.push({
        type: 'regex',
        pattern: '.*',
        description: 'Allow all origins (from CORS_ALLOW_ORIGINS=*)',
      });
    } else {
      // Exact URL
      origins.push({
        type: 'exact',
        value: part,
        description: 'From CORS_ALLOW_ORIGINS env var',
      });
    }
  }

  return origins;
}

/**
 * Validates that the configuration is correct for the environment
 */
export function validateCorsConfig(
  config: CorsConfig,
  environment: string,
  logger?: FastifyBaseLogger,
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check version
  if (!config.version) {
    errors.push('Configuration missing version');
  }

  // Check global config
  if (!config.global) {
    errors.push('Configuration missing global settings');
  }

  // Check environment config
  const envConfig = config.environments[environment];
  if (!envConfig) {
    warnings.push(`Environment "${environment}" not found, will use defaults`);
  }

  // Production checks
  if (environment === 'production') {
    if (!envConfig?.origins || envConfig.origins.length === 0) {
      const hasEnvOverride = !!process.env.CORS_ALLOW_ORIGINS;
      if (!hasEnvOverride) {
        errors.push(
          'Production requires explicit origins. Set CORS_ALLOW_ORIGINS or configure in cors.json',
        );
      }
    }

    // Check for dangerous patterns in production
    if (envConfig?.origins) {
      for (const origin of envConfig.origins) {
        if (origin.type === 'regex' && origin.pattern === '.*') {
          warnings.push('Production has "allow all" regex pattern - this is not recommended');
        }
      }
    }
  }

  // Validate pattern syntax
  if (envConfig?.origins) {
    for (let i = 0; i < envConfig.origins.length; i++) {
      const origin = envConfig.origins[i];
      try {
        if (origin.type === 'regex' && origin.pattern) {
          new RegExp(origin.pattern);
        }
      } catch {
        errors.push(`Invalid regex pattern at index ${i}: ${origin.pattern}`);
      }
    }
  }

  if (errors.length > 0 || warnings.length > 0) {
    logger?.info(
      { errors, warnings, environment },
      'CORS configuration validation results',
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Gets a human-readable summary of the CORS configuration
 */
export function getCorsConfigSummary(
  config: LoadedCorsConfig,
  environment: string,
): string {
  const envConfig = config.environments[environment];
  const lines: string[] = [
    `CORS Configuration Summary`,
    `========================`,
    `Source: ${config._source}`,
    `Environment: ${environment}`,
    `Version: ${config.version}`,
    ``,
    `Global Settings:`,
    `  Enabled: ${config.global.enabled}`,
    `  Credentials: ${config.global.credentials}`,
    `  Max Age: ${config.global.maxAge}s`,
    `  Methods: ${config.global.methods.join(', ')}`,
    ``,
    `Environment Settings:`,
    `  Strict Mode: ${envConfig?.strictMode ?? 'N/A'}`,
    `  Origins: ${envConfig?.origins?.length ?? 0}`,
  ];

  if (envConfig?.origins) {
    for (const origin of envConfig.origins) {
      const value = origin.value || origin.pattern || origin.name || 'unknown';
      lines.push(`    - [${origin.type}] ${value}`);
    }
  }

  if (config._envOverrides.length > 0) {
    lines.push(``);
    lines.push(`Environment Overrides Applied:`);
    for (const override of config._envOverrides) {
      lines.push(`  - ${override}`);
    }
  }

  return lines.join('\n');
}

export default loadCorsConfig;
