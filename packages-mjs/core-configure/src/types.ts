import { z } from 'zod';

/**
 * Merge strategy for configuration values
 */
export enum MergeStrategy {
  /** Replace the entire value (no merging) */
  OVERRIDE = 'override',
  /** Deep merge objects, concatenate arrays */
  MERGE = 'merge',
  /** Extend arrays and objects without replacing */
  EXTEND = 'extend',
}

/**
 * Configuration source priority
 */
export enum ConfigSource {
  DEFAULT = 'default',
  FILESYSTEM = 'filesystem',
  CONTROL_PLANE = 'control_plane',
  RUNTIME = 'runtime',
}

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

export type EntityDefinition = z.infer<typeof EntityDefinitionSchema>;

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
export const ConfigurationManagerOptionsSchema = z.object({
  defaultMergeStrategy: z.nativeEnum(MergeStrategy).default(MergeStrategy.MERGE),
  enableValidation: z.boolean().default(true),
  enableCaching: z.boolean().default(true),
  persistenceEnabled: z.boolean().default(false),
  persistencePath: z.string().optional(),
});

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
