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
export interface CompiledOriginMatcher {
    type: OriginPatternType;
    pattern: string;
    test: (origin: string) => boolean;
    description?: string;
}
/**
 * Compiles an origin pattern into a testable matcher
 */
export declare function compileOriginPattern(pattern: OriginPattern, namedPatterns?: Record<string, OriginPattern>): CompiledOriginMatcher;
export declare class CorsPolicyEngine {
    private config;
    private environment;
    private resolvedPolicies;
    private logger?;
    constructor(config: CorsConfig, environment?: string, logger?: FastifyBaseLogger);
    /**
     * Validates the CORS configuration
     */
    private validateConfig;
    /**
     * Resolves the CORS policy for a given app
     */
    resolvePolicy(appName?: string): ResolvedCorsPolicy;
    /**
     * Checks if an origin is allowed by the policy
     */
    checkOrigin(origin: string, appName?: string): CorsDecision;
    /**
     * Logs a CORS decision based on logging configuration
     */
    private logDecision;
    /**
     * Logs at the configured level
     */
    private logAtLevel;
    /**
     * Gets the Fastify CORS options for the policy
     */
    getFastifyCorsOptions(appName?: string): object;
    /**
     * Gets the origin value to set in Access-Control-Allow-Origin header
     */
    getAllowedOriginHeader(origin: string, appName?: string): string | null;
    /**
     * Gets the current environment
     */
    getEnvironment(): string;
    /**
     * Gets the raw configuration
     */
    getConfig(): CorsConfig;
    /**
     * Prints the computed policy for debugging
     */
    printPolicy(appName?: string): void;
}
/**
 * Creates a CORS Policy Engine from configuration
 */
export declare function createCorsPolicyEngine(config: CorsConfig, environment?: string, logger?: FastifyBaseLogger): CorsPolicyEngine;
export default CorsPolicyEngine;
//# sourceMappingURL=cors-policy-engine.d.ts.map