import { z } from 'zod';
/**
 * Merge strategy for configuration values
 */
export declare enum MergeStrategy {
    /** Replace the entire value (no merging) */
    OVERRIDE = "override",
    /** Deep merge objects, concatenate arrays */
    MERGE = "merge",
    /** Extend arrays and objects without replacing */
    EXTEND = "extend"
}
/**
 * Configuration source priority
 */
export declare enum ConfigSource {
    DEFAULT = "default",
    FILESYSTEM = "filesystem",
    CONTROL_PLANE = "control_plane",
    RUNTIME = "runtime"
}
/**
 * Entity definition schema
 */
export declare const EntityDefinitionSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    enabled: z.ZodDefault<z.ZodBoolean>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    createdAt: z.ZodOptional<z.ZodDate>;
    updatedAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: string;
    name: string;
    enabled: boolean;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
}, {
    id: string;
    type: string;
    name: string;
    description?: string | undefined;
    enabled?: boolean | undefined;
    metadata?: Record<string, unknown> | undefined;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
}>;
export type EntityDefinition = z.infer<typeof EntityDefinitionSchema>;
/**
 * Entity configuration schema
 */
export declare const EntityConfigSchema: z.ZodObject<{
    plugins: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    routes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    services: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    schemas: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    settings: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    security: z.ZodOptional<z.ZodObject<{
        allowedOrigins: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        rateLimit: z.ZodOptional<z.ZodObject<{
            max: z.ZodOptional<z.ZodNumber>;
            timeWindow: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            max?: number | undefined;
            timeWindow?: number | undefined;
        }, {
            max?: number | undefined;
            timeWindow?: number | undefined;
        }>>;
        jwtSecret: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        allowedOrigins?: string[] | undefined;
        rateLimit?: {
            max?: number | undefined;
            timeWindow?: number | undefined;
        } | undefined;
        jwtSecret?: string | undefined;
    }, {
        allowedOrigins?: string[] | undefined;
        rateLimit?: {
            max?: number | undefined;
            timeWindow?: number | undefined;
        } | undefined;
        jwtSecret?: string | undefined;
    }>>;
    database: z.ZodOptional<z.ZodObject<{
        url: z.ZodOptional<z.ZodString>;
        pool: z.ZodOptional<z.ZodObject<{
            min: z.ZodOptional<z.ZodNumber>;
            max: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            max?: number | undefined;
            min?: number | undefined;
        }, {
            max?: number | undefined;
            min?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        url?: string | undefined;
        pool?: {
            max?: number | undefined;
            min?: number | undefined;
        } | undefined;
    }, {
        url?: string | undefined;
        pool?: {
            max?: number | undefined;
            min?: number | undefined;
        } | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    plugins?: string[] | undefined;
    routes?: string[] | undefined;
    services?: string[] | undefined;
    schemas?: string[] | undefined;
    settings?: Record<string, unknown> | undefined;
    security?: {
        allowedOrigins?: string[] | undefined;
        rateLimit?: {
            max?: number | undefined;
            timeWindow?: number | undefined;
        } | undefined;
        jwtSecret?: string | undefined;
    } | undefined;
    database?: {
        url?: string | undefined;
        pool?: {
            max?: number | undefined;
            min?: number | undefined;
        } | undefined;
    } | undefined;
}, {
    plugins?: string[] | undefined;
    routes?: string[] | undefined;
    services?: string[] | undefined;
    schemas?: string[] | undefined;
    settings?: Record<string, unknown> | undefined;
    security?: {
        allowedOrigins?: string[] | undefined;
        rateLimit?: {
            max?: number | undefined;
            timeWindow?: number | undefined;
        } | undefined;
        jwtSecret?: string | undefined;
    } | undefined;
    database?: {
        url?: string | undefined;
        pool?: {
            max?: number | undefined;
            min?: number | undefined;
        } | undefined;
    } | undefined;
}>;
export type EntityConfig = z.infer<typeof EntityConfigSchema>;
/**
 * Configuration layer with source tracking
 */
export interface ConfigLayer {
    source: ConfigSource;
    priority: number;
    config: EntityConfig;
    timestamp: Date;
}
/**
 * Merge options
 */
export interface MergeOptions {
    strategy: MergeStrategy;
    arrayMerge?: 'replace' | 'concat' | 'unique';
    customMerge?: (key: string, target: unknown, source: unknown) => unknown;
}
/**
 * Configuration manager options
 */
export declare const ConfigurationManagerOptionsSchema: z.ZodObject<{
    defaultMergeStrategy: z.ZodDefault<z.ZodNativeEnum<typeof MergeStrategy>>;
    enableValidation: z.ZodDefault<z.ZodBoolean>;
    enableCaching: z.ZodDefault<z.ZodBoolean>;
    persistenceEnabled: z.ZodDefault<z.ZodBoolean>;
    persistencePath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    defaultMergeStrategy: MergeStrategy;
    enableValidation: boolean;
    enableCaching: boolean;
    persistenceEnabled: boolean;
    persistencePath?: string | undefined;
}, {
    defaultMergeStrategy?: MergeStrategy | undefined;
    enableValidation?: boolean | undefined;
    enableCaching?: boolean | undefined;
    persistenceEnabled?: boolean | undefined;
    persistencePath?: string | undefined;
}>;
export type ConfigurationManagerOptions = z.infer<typeof ConfigurationManagerOptionsSchema>;
/**
 * Configuration validation result
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
/**
 * Configuration metadata
 */
export interface ConfigMetadata {
    entityId: string;
    entityType: string;
    version: string;
    sources: ConfigSource[];
    lastUpdated: Date;
    checksum?: string;
}
//# sourceMappingURL=types.d.ts.map