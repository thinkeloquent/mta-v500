import { ConnectionError, DatabaseConfigurationError } from '@internal/core-exceptions';
import type {
  AppPrismaClientOptions,
  DatabaseConfigValidation,
  PrismaClientOptions,
  PrismaInitResult,
} from './types';

/**
 * Validate database configuration URL
 */
export function validateDatabaseConfig(databaseUrl?: string): DatabaseConfigValidation {
  const errors: string[] = [];

  if (!databaseUrl) {
    errors.push(
      'Database URL is required (provide via databaseUrl option or DATABASE_URL env var)',
    );
    return { valid: false, errors };
  }

  // Detect database type from URL protocol
  let databaseType: DatabaseConfigValidation['databaseType'];

  if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
    databaseType = 'postgresql';
  } else if (databaseUrl.startsWith('mysql://')) {
    databaseType = 'mysql';
  } else if (databaseUrl.startsWith('file:') || databaseUrl.endsWith('.db')) {
    databaseType = 'sqlite';
  } else if (databaseUrl.startsWith('mongodb://') || databaseUrl.startsWith('mongodb+srv://')) {
    databaseType = 'mongodb';
  } else if (databaseUrl.startsWith('sqlserver://')) {
    databaseType = 'sqlserver';
  } else {
    errors.push(`Unknown database type in URL: ${databaseUrl.split(':')[0]}`);
  }

  // Validate PostgreSQL URLs
  if (databaseType === 'postgresql') {
    if (!databaseUrl.includes('@')) {
      errors.push('PostgreSQL URL must include credentials (user@host)');
    }
    if (!databaseUrl.includes('/') || databaseUrl.split('/').length < 4) {
      errors.push('PostgreSQL URL must include database name');
    }
  }

  // Validate SQLite URLs
  if (databaseType === 'sqlite') {
    if (databaseUrl === 'file:') {
      errors.push('SQLite URL must include file path');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    ...(databaseType && { databaseType }),
  };
}

/**
 * Initialize Prisma client with standardized configuration
 *
 * @example
 * ```typescript
 * import { PrismaClient } from '@prisma/client-auth';
 * import { initializePrismaClient } from '@internal/core-prisma-utils';
 *
 * const { client, disconnect } = await initializePrismaClient(PrismaClient, {
 *   databaseUrl: process.env.DATABASE_URL,
 *   enableQueryLogging: true,
 *   autoConnect: true,
 * });
 *
 * // Use client
 * const users = await client.user.findMany();
 *
 * // Cleanup
 * await disconnect();
 * ```
 */
export async function initializePrismaClient<
  T extends { $connect: () => Promise<void>; $disconnect: () => Promise<void> },
>(
  PrismaClientConstructor: new (options?: any) => T,
  options: PrismaClientOptions = {},
): Promise<PrismaInitResult<T>> {
  const {
    databaseUrl = process.env.DATABASE_URL,
    enableQueryLogging = false,
    enableInfoLogging = false,
    autoConnect = true,
    logLevels,
  } = options;

  // Validate database configuration
  const validation = validateDatabaseConfig(databaseUrl);
  if (!validation.valid) {
    throw new DatabaseConfigurationError(
      `Prisma client initialization failed:\n${validation.errors.map((e) => `  - ${e}`).join('\n')}`,
      {
        validationErrors: validation.errors,
        databaseUrl: databaseUrl ? '***' : undefined,
      },
    );
  }

  // Determine log levels
  let finalLogLevels: Array<'query' | 'info' | 'warn' | 'error'> = ['error', 'warn'];

  if (logLevels) {
    finalLogLevels = logLevels;
  } else {
    if (enableQueryLogging) finalLogLevels.push('query');
    if (enableInfoLogging) finalLogLevels.push('info');
  }

  // Create Prisma client
  const clientOptions: any = {
    log: finalLogLevels,
  };

  // Override datasource URL if provided
  if (databaseUrl) {
    clientOptions.datasources = {
      db: { url: databaseUrl },
    };
  }

  const client = new PrismaClientConstructor(clientOptions);
  let connected = false;

  // Connect if autoConnect is enabled
  if (autoConnect) {
    try {
      await client.$connect();
      connected = true;
    } catch (error) {
      throw new ConnectionError(
        `Failed to connect to database: ${error instanceof Error ? error.message : String(error)}`,
        {
          originalError: error instanceof Error ? error.message : String(error),
          databaseUrl: databaseUrl ? '***' : undefined,
        },
      );
    }
  }

  // Disconnect function
  const disconnect = async (): Promise<void> => {
    if (connected) {
      await client.$disconnect();
      connected = false;
    }
  };

  // Reconnect function
  const reconnect = async (): Promise<void> => {
    if (connected) {
      await disconnect();
    }
    await client.$connect();
    connected = true;
  };

  // Connection status function
  const isConnected = (): boolean => connected;

  return {
    client,
    disconnect,
    reconnect,
    isConnected,
  };
}

/**
 * Create a standardized Prisma client factory for a capability
 *
 * @example
 * ```typescript
 * import { PrismaClient } from '@prisma/client-auth';
 * import { createPrismaClientFactory } from '@internal/core-prisma-utils';
 *
 * const createAuthPrisma = createPrismaClientFactory(PrismaClient, {
 *   enableQueryLogging: process.env.NODE_ENV === 'development',
 * });
 *
 * // In your plugin
 * const { client: prisma, disconnect } = await createAuthPrisma({
 *   databaseUrl: options.databaseUrl,
 * });
 *
 * fastify.addHook('onClose', disconnect);
 * ```
 */
export function createPrismaClientFactory<
  T extends { $connect: () => Promise<void>; $disconnect: () => Promise<void> },
>(PrismaClientConstructor: new (options?: any) => T, defaultOptions: PrismaClientOptions = {}) {
  return async (overrideOptions: PrismaClientOptions = {}): Promise<PrismaInitResult<T>> => {
    const mergedOptions = { ...defaultOptions, ...overrideOptions };
    return initializePrismaClient(PrismaClientConstructor, mergedOptions);
  };
}

/**
 * Create an app-specific Prisma client factory with enhanced logging and tenant context
 *
 * @example
 * ```typescript
 * import { PrismaClient } from '.prisma/client-auth';
 * import { createAppPrismaClientFactory } from '@internal/core-prisma-utils';
 *
 * const createAuthPrisma = createAppPrismaClientFactory(
 *   'auth',
 *   PrismaClient,
 *   {
 *     enableQueryLogging: process.env.NODE_ENV === 'development',
 *   }
 * );
 *
 * // In your Fastify plugin
 * export default async (fastify, opts) => {
 *   const { client, disconnect } = await createAuthPrisma({
 *     databaseUrl: opts.databaseUrl,
 *     logger: fastify.log,
 *   });
 *
 *   fastify.decorate('authDb', client);
 *   fastify.addHook('onClose', disconnect);
 * };
 * ```
 */
export function createAppPrismaClientFactory<
  T extends { $connect: () => Promise<void>; $disconnect: () => Promise<void> },
>(
  appName: string,
  PrismaClientConstructor: new (options?: any) => T,
  defaultOptions: AppPrismaClientOptions = {},
) {
  return async (overrideOptions: AppPrismaClientOptions = {}): Promise<PrismaInitResult<T>> => {
    const mergedOptions: AppPrismaClientOptions = {
      ...defaultOptions,
      ...overrideOptions,
      appName: overrideOptions.appName || defaultOptions.appName || appName,
    };

    // Use custom logger if provided
    const logger = mergedOptions.logger;

    // Log app initialization
    if (logger) {
      logger.info(`[${mergedOptions.appName}] Initializing Prisma client`);

      if (mergedOptions.databaseUrl) {
        // Log masked database URL (show only first 20 chars for security)
        const maskedUrl = mergedOptions.databaseUrl.substring(0, 20) + '...';
        logger.info(`[${mergedOptions.appName}] Database: ${maskedUrl}`);
      }

      if (mergedOptions.tenantContext) {
        logger.info(`[${mergedOptions.appName}] Multi-tenancy enabled`);
      }
    }

    // Handle tenant-specific database URL
    if (mergedOptions.tenantContext?.getDatabaseUrl) {
      const tenantUrl = mergedOptions.tenantContext.getDatabaseUrl();
      if (tenantUrl) {
        mergedOptions.databaseUrl = tenantUrl;
        if (logger) {
          logger.info(`[${mergedOptions.appName}] Using tenant-specific database`);
        }
      }
    }

    // Initialize client
    const result = await initializePrismaClient(PrismaClientConstructor, mergedOptions);

    // Log successful connection
    if (logger && result.isConnected()) {
      logger.info(`[${mergedOptions.appName}] Prisma client connected successfully`);
    }

    // Wrap disconnect to log
    const originalDisconnect = result.disconnect;
    result.disconnect = async () => {
      if (logger) {
        logger.info(`[${mergedOptions.appName}] Disconnecting Prisma client`);
      }
      await originalDisconnect();
    };

    return result;
  };
}
