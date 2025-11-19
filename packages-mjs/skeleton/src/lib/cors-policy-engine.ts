/**
 * Enterprise CORS Policy Engine
 *
 * Provides centralized CORS policy management with support for:
 * - Multiple origin pattern types (exact, wildcard, regex)
 * - Environment-specific configurations
 * - App-level overrides
 * - Violation logging with context
 *
 * @module cors-policy-engine
 */

import type { FastifyBaseLogger } from 'fastify';

// =============================================================================
// Types
// =============================================================================

export type OriginPatternType = 'exact' | 'wildcard' | 'regex' | 'reference';

export interface OriginPattern {
  type: OriginPatternType;
  value?: string;
  pattern?: string;
  name?: string;
  description?: string;
}

export interface LoggingConfig {
  enabled: boolean;
  level: 'debug' | 'info' | 'warn' | 'error';
  includeRejections: boolean;
  includeAllowances: boolean;
}

export interface GlobalCorsConfig {
  enabled: boolean;
  credentials: boolean;
  maxAge: number;
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  logging: LoggingConfig;
}

export interface EnvironmentConfig {
  description?: string;
  origins: OriginPattern[];
  strictMode: boolean;
  requireExplicitOrigins?: boolean;
  logging?: Partial<LoggingConfig>;
}

export interface AppConfig {
  description?: string;
  origins: OriginPattern[];
  additionalHeaders?: string[];
  additionalExposedHeaders?: string[];
  methods?: string[];
}

export interface CorsConfig {
  version: string;
  description?: string;
  global: GlobalCorsConfig;
  environments: Record<string, EnvironmentConfig>;
  apps?: Record<string, AppConfig>;
  patterns?: Record<string, OriginPattern>;
}

export interface ResolvedCorsPolicy {
  enabled: boolean;
  credentials: boolean;
  maxAge: number;
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  origins: CompiledOriginMatcher[];
  strictMode: boolean;
  logging: LoggingConfig;
}

export interface CorsDecision {
  allowed: boolean;
  origin: string;
  matchedPattern?: string;
  reason: string;
}

export interface CorsViolation {
  timestamp: string;
  origin: string;
  app?: string;
  route?: string;
  method: string;
  reason: string;
}

// =============================================================================
// Origin Matchers
// =============================================================================

export interface CompiledOriginMatcher {
  type: OriginPatternType;
  pattern: string;
  test: (origin: string) => boolean;
  description?: string;
}

/**
 * Compiles an origin pattern into a testable matcher
 */
export function compileOriginPattern(
  pattern: OriginPattern,
  namedPatterns?: Record<string, OriginPattern>,
): CompiledOriginMatcher {
  switch (pattern.type) {
    case 'exact':
      if (!pattern.value) {
        throw new Error('Exact pattern requires "value" field');
      }
      return {
        type: 'exact',
        pattern: pattern.value,
        test: (origin: string) => origin === pattern.value,
        description: pattern.description,
      };

    case 'wildcard':
      if (!pattern.pattern) {
        throw new Error('Wildcard pattern requires "pattern" field');
      }
      const wildcardRegex = wildcardToRegex(pattern.pattern);
      return {
        type: 'wildcard',
        pattern: pattern.pattern,
        test: (origin: string) => wildcardRegex.test(origin),
        description: pattern.description,
      };

    case 'regex':
      if (!pattern.pattern) {
        throw new Error('Regex pattern requires "pattern" field');
      }
      const regex = new RegExp(pattern.pattern);
      return {
        type: 'regex',
        pattern: pattern.pattern,
        test: (origin: string) => regex.test(origin),
        description: pattern.description,
      };

    case 'reference':
      if (!pattern.name) {
        throw new Error('Reference pattern requires "name" field');
      }
      if (!namedPatterns || !namedPatterns[pattern.name]) {
        throw new Error(`Referenced pattern "${pattern.name}" not found`);
      }
      return compileOriginPattern(namedPatterns[pattern.name], namedPatterns);

    default:
      throw new Error(`Unknown pattern type: ${(pattern as OriginPattern).type}`);
  }
}

/**
 * Converts a wildcard pattern to a RegExp
 * Supports: *.example.com, https://*.example.com
 */
function wildcardToRegex(pattern: string): RegExp {
  // Escape special regex characters except *
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  // Convert * to regex pattern
  const regexPattern = escaped.replace(/\*/g, '[^/]+');
  return new RegExp(`^${regexPattern}$`);
}

// =============================================================================
// CORS Policy Engine
// =============================================================================

export class CorsPolicyEngine {
  private config: CorsConfig;
  private environment: string;
  private resolvedPolicies: Map<string, ResolvedCorsPolicy> = new Map();
  private logger?: FastifyBaseLogger;

  constructor(
    config: CorsConfig,
    environment: string = 'development',
    logger?: FastifyBaseLogger,
  ) {
    this.config = config;
    this.environment = environment;
    this.logger = logger;

    // Validate configuration on construction
    this.validateConfig();
  }

  /**
   * Validates the CORS configuration
   */
  private validateConfig(): void {
    if (!this.config.version) {
      throw new Error('CORS config must have a version');
    }

    if (!this.config.global) {
      throw new Error('CORS config must have global settings');
    }

    if (!this.config.environments) {
      throw new Error('CORS config must have environments');
    }

    const envConfig = this.config.environments[this.environment];
    if (!envConfig) {
      this.logger?.warn(
        { environment: this.environment, available: Object.keys(this.config.environments) },
        'Environment not found in CORS config, using development defaults',
      );
    }

    // Validate all patterns can be compiled
    if (envConfig?.origins) {
      for (const pattern of envConfig.origins) {
        try {
          compileOriginPattern(pattern, this.config.patterns);
        } catch (error) {
          throw new Error(
            `Invalid origin pattern in ${this.environment}: ${(error as Error).message}`,
          );
        }
      }
    }

    // Check production strict mode
    if (
      this.environment === 'production' &&
      envConfig?.requireExplicitOrigins &&
      (!envConfig.origins || envConfig.origins.length === 0)
    ) {
      throw new Error(
        'Production requires explicit origins but none configured. ' +
          'Set CORS_ALLOW_ORIGINS environment variable or configure origins in cors.json',
      );
    }
  }

  /**
   * Resolves the CORS policy for a given app
   */
  resolvePolicy(appName?: string): ResolvedCorsPolicy {
    const cacheKey = appName || '__global__';

    if (this.resolvedPolicies.has(cacheKey)) {
      return this.resolvedPolicies.get(cacheKey)!;
    }

    const global = this.config.global;
    const envConfig = this.config.environments[this.environment] ||
      this.config.environments['development'] || {
        origins: [],
        strictMode: false,
      };

    const appConfig = appName ? this.config.apps?.[appName] : undefined;

    // Merge headers
    let allowedHeaders = [...global.allowedHeaders];
    let exposedHeaders = [...global.exposedHeaders];
    let methods = [...global.methods];

    if (appConfig) {
      if (appConfig.additionalHeaders) {
        allowedHeaders = [...new Set([...allowedHeaders, ...appConfig.additionalHeaders])];
      }
      if (appConfig.additionalExposedHeaders) {
        exposedHeaders = [...new Set([...exposedHeaders, ...appConfig.additionalExposedHeaders])];
      }
      if (appConfig.methods) {
        methods = appConfig.methods;
      }
    }

    // Compile origin patterns
    const origins: CompiledOriginMatcher[] = [];

    // Add environment origins
    for (const pattern of envConfig.origins) {
      origins.push(compileOriginPattern(pattern, this.config.patterns));
    }

    // Add app-specific origins
    if (appConfig?.origins) {
      for (const pattern of appConfig.origins) {
        origins.push(compileOriginPattern(pattern, this.config.patterns));
      }
    }

    // Merge logging config
    const logging: LoggingConfig = {
      ...global.logging,
      ...envConfig.logging,
    };

    const policy: ResolvedCorsPolicy = {
      enabled: global.enabled,
      credentials: global.credentials,
      maxAge: global.maxAge,
      methods,
      allowedHeaders,
      exposedHeaders,
      origins,
      strictMode: envConfig.strictMode,
      logging,
    };

    this.resolvedPolicies.set(cacheKey, policy);
    return policy;
  }

  /**
   * Checks if an origin is allowed by the policy
   */
  checkOrigin(origin: string, appName?: string): CorsDecision {
    const policy = this.resolvePolicy(appName);

    if (!policy.enabled) {
      return {
        allowed: false,
        origin,
        reason: 'CORS is disabled',
      };
    }

    if (!origin) {
      // No origin header - same-origin request or non-browser client
      return {
        allowed: true,
        origin: '',
        reason: 'No origin header (same-origin or non-browser)',
      };
    }

    // Check against all compiled patterns
    for (const matcher of policy.origins) {
      if (matcher.test(origin)) {
        const decision: CorsDecision = {
          allowed: true,
          origin,
          matchedPattern: matcher.pattern,
          reason: `Matched ${matcher.type} pattern: ${matcher.pattern}`,
        };

        this.logDecision(decision, appName);
        return decision;
      }
    }

    // No match found
    const decision: CorsDecision = {
      allowed: false,
      origin,
      reason: `Origin not in allowed list (${policy.origins.length} patterns checked)`,
    };

    this.logDecision(decision, appName);
    return decision;
  }

  /**
   * Logs a CORS decision based on logging configuration
   */
  private logDecision(decision: CorsDecision, appName?: string): void {
    if (!this.logger) return;

    const policy = this.resolvePolicy(appName);
    if (!policy.logging.enabled) return;

    const logData = {
      origin: decision.origin,
      allowed: decision.allowed,
      reason: decision.reason,
      matchedPattern: decision.matchedPattern,
      app: appName,
    };

    if (decision.allowed && policy.logging.includeAllowances) {
      this.logAtLevel(policy.logging.level, logData, 'CORS origin allowed');
    } else if (!decision.allowed && policy.logging.includeRejections) {
      this.logger.warn(logData, 'CORS origin rejected');
    }
  }

  /**
   * Logs at the configured level
   */
  private logAtLevel(
    level: LoggingConfig['level'],
    data: object,
    message: string,
  ): void {
    if (!this.logger) return;

    switch (level) {
      case 'debug':
        this.logger.debug(data, message);
        break;
      case 'info':
        this.logger.info(data, message);
        break;
      case 'warn':
        this.logger.warn(data, message);
        break;
      case 'error':
        this.logger.error(data, message);
        break;
    }
  }

  /**
   * Gets the Fastify CORS options for the policy
   */
  getFastifyCorsOptions(appName?: string): object {
    const policy = this.resolvePolicy(appName);

    return {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin) {
          // Allow requests without origin (same-origin, non-browser)
          callback(null, true);
          return;
        }

        const decision = this.checkOrigin(origin, appName);
        callback(null, decision.allowed);
      },
      methods: policy.methods,
      allowedHeaders: policy.allowedHeaders,
      exposedHeaders: policy.exposedHeaders,
      credentials: policy.credentials,
      maxAge: policy.maxAge,
    };
  }

  /**
   * Gets the origin value to set in Access-Control-Allow-Origin header
   */
  getAllowedOriginHeader(origin: string, appName?: string): string | null {
    const decision = this.checkOrigin(origin, appName);
    return decision.allowed ? origin : null;
  }

  /**
   * Gets the current environment
   */
  getEnvironment(): string {
    return this.environment;
  }

  /**
   * Gets the raw configuration
   */
  getConfig(): CorsConfig {
    return this.config;
  }

  /**
   * Prints the computed policy for debugging
   */
  printPolicy(appName?: string): void {
    const policy = this.resolvePolicy(appName);

    console.log('\n=== CORS Policy ===');
    console.log(`Environment: ${this.environment}`);
    console.log(`App: ${appName || '(global)'}`);
    console.log(`Enabled: ${policy.enabled}`);
    console.log(`Credentials: ${policy.credentials}`);
    console.log(`Max Age: ${policy.maxAge}s`);
    console.log(`Strict Mode: ${policy.strictMode}`);
    console.log(`\nMethods: ${policy.methods.join(', ')}`);
    console.log(`Allowed Headers: ${policy.allowedHeaders.join(', ')}`);
    console.log(`Exposed Headers: ${policy.exposedHeaders.join(', ')}`);
    console.log(`\nOrigin Patterns (${policy.origins.length}):`);

    for (const matcher of policy.origins) {
      console.log(`  - [${matcher.type}] ${matcher.pattern}`);
      if (matcher.description) {
        console.log(`    ${matcher.description}`);
      }
    }

    console.log('\nLogging:');
    console.log(`  Level: ${policy.logging.level}`);
    console.log(`  Include Rejections: ${policy.logging.includeRejections}`);
    console.log(`  Include Allowances: ${policy.logging.includeAllowances}`);
    console.log('==================\n');
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Creates a CORS Policy Engine from configuration
 */
export function createCorsPolicyEngine(
  config: CorsConfig,
  environment?: string,
  logger?: FastifyBaseLogger,
): CorsPolicyEngine {
  const env = environment || process.env.NODE_ENV || 'development';
  return new CorsPolicyEngine(config, env, logger);
}

export default CorsPolicyEngine;
