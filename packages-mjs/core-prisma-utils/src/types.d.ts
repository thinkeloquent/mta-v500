/**
 * Prisma client initialization options
 */
export interface PrismaClientOptions {
    /**
     * Database URL (overrides env DATABASE_URL)
     */
    databaseUrl?: string;
    /**
     * Enable query logging
     */
    enableQueryLogging?: boolean;
    /**
     * Enable info logging
     */
    enableInfoLogging?: boolean;
    /**
     * Connect on initialization
     */
    autoConnect?: boolean;
    /**
     * Custom log levels
     */
    logLevels?: Array<'query' | 'info' | 'warn' | 'error'>;
}
/**
 * Tenant context provider for multi-tenancy
 */
export interface TenantContext {
    /**
     * Get current tenant ID
     */
    getTenantId: () => string | null | undefined;
    /**
     * Optional: Get tenant-specific database URL
     */
    getDatabaseUrl?: () => string | undefined;
}
/**
 * Extended options with app context for app-specific clients
 */
export interface AppPrismaClientOptions extends PrismaClientOptions {
    /**
     * App name for logging and debugging
     */
    appName?: string;
    /**
     * Tenant context for multi-tenant applications
     */
    tenantContext?: TenantContext;
    /**
     * Custom logger for app-specific logging
     */
    logger?: {
        info: (message: string) => void;
        warn: (message: string) => void;
        error: (message: string) => void;
    };
}
/**
 * Prisma client initialization result
 */
export interface PrismaInitResult<T> {
    /**
     * Prisma client instance
     */
    client: T;
    /**
     * Disconnect function to close connection
     */
    disconnect: () => Promise<void>;
    /**
     * Reconnect function to reconnect to database
     */
    reconnect: () => Promise<void>;
    /**
     * Connection status
     */
    isConnected: () => boolean;
}
/**
 * Database configuration validation result
 */
export interface DatabaseConfigValidation {
    /**
     * Whether the configuration is valid
     */
    valid: boolean;
    /**
     * Validation errors
     */
    errors: string[];
    /**
     * Database type detected from URL
     */
    databaseType?: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb' | 'sqlserver';
}
//# sourceMappingURL=types.d.ts.map