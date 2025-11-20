import { z } from 'zod';
/**
 * Merge strategy for configuration values
 */
export var MergeStrategy;
(function (MergeStrategy) {
    /** Replace the entire value (no merging) */
    MergeStrategy["OVERRIDE"] = "override";
    /** Deep merge objects, concatenate arrays */
    MergeStrategy["MERGE"] = "merge";
    /** Extend arrays and objects without replacing */
    MergeStrategy["EXTEND"] = "extend";
})(MergeStrategy || (MergeStrategy = {}));
/**
 * Configuration source priority
 */
export var ConfigSource;
(function (ConfigSource) {
    ConfigSource["DEFAULT"] = "default";
    ConfigSource["FILESYSTEM"] = "filesystem";
    ConfigSource["CONTROL_PLANE"] = "control_plane";
    ConfigSource["RUNTIME"] = "runtime";
})(ConfigSource || (ConfigSource = {}));
/**
 * Entity definition schema
 */
export const EntityDefinitionSchema = z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    enabled: z.boolean().default(true),
    metadata: z.record(z.string(), z.unknown()).optional(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
});
/**
 * Entity configuration schema
 */
export const EntityConfigSchema = z.object({
    plugins: z.array(z.string()).optional(),
    routes: z.array(z.string()).optional(),
    services: z.array(z.string()).optional(),
    schemas: z.array(z.string()).optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
    security: z
        .object({
        allowedOrigins: z.array(z.string()).optional(),
        rateLimit: z
            .object({
            max: z.number().optional(),
            timeWindow: z.number().optional(),
        })
            .optional(),
        jwtSecret: z.string().optional(),
    })
        .optional(),
    database: z
        .object({
        url: z.string().optional(),
        pool: z
            .object({
            min: z.number().optional(),
            max: z.number().optional(),
        })
            .optional(),
    })
        .optional(),
});
/**
 * Configuration manager options
 */
export const ConfigurationManagerOptionsSchema = z.object({
    defaultMergeStrategy: z.nativeEnum(MergeStrategy).default(MergeStrategy.MERGE),
    enableValidation: z.boolean().default(true),
    enableCaching: z.boolean().default(true),
    persistenceEnabled: z.boolean().default(false),
    persistencePath: z.string().optional(),
});
//# sourceMappingURL=types.js.map