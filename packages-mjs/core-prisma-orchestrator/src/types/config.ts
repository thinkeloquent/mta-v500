/**
 * Configuration for mta-prisma CLI
 */

export interface AppConfig {
  /**
   * App name (e.g., "auth", "billing")
   */
  name: string;

  /**
   * Path to Prisma schema file relative to project root
   */
  schemaPath: string;

  /**
   * Output name for generated client (e.g., "client-auth")
   */
  outputName: string;

  /**
   * Apps that this app depends on (load order)
   */
  dependencies?: string[];

  /**
   * Whether this app is enabled
   */
  enabled?: boolean;

  /**
   * Custom environment variable for database URL
   */
  databaseUrlEnv?: string;
}

export interface MtaPrismaConfig {
  /**
   * List of app configurations
   */
  apps: AppConfig[];

  /**
   * Migration strategy: "orchestrated" or "merged"
   * - orchestrated: Run migrations independently per app
   * - merged: Merge schemas and run single migration
   */
  strategy: 'orchestrated' | 'merged';

  /**
   * Path for merged schema (when using "merged" strategy)
   */
  mergedSchemaPath?: string;

  /**
   * Database connection URL (default)
   */
  databaseUrl?: string;

  /**
   * Additional Prisma CLI flags
   */
  prismaFlags?: {
    generate?: string[];
    migrate?: string[];
    studio?: string[];
  };
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface AppLoadResult {
  app: AppConfig;
  success: boolean;
  error?: Error;
  duration?: number;
}

export interface MigrationStatus {
  app: string;
  applied: number;
  pending: number;
  failed: number;
  status: 'up-to-date' | 'pending' | 'failed';
}
