import type { AppPrismaClientOptions, DatabaseConfigValidation, PrismaClientOptions, PrismaInitResult } from './types';
/**
 * Validate database configuration URL
 */
export declare function validateDatabaseConfig(databaseUrl?: string): DatabaseConfigValidation;
/**
 * Initialize Prisma client with standardized configuration
 *
 * @example
 * ```typescript
 * import { PrismaClient } from '@prisma/client-auth';
 * import { initializePrismaClient } from '@thinkeloquent/core-prisma-utils';
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
export declare function initializePrismaClient<T extends {
    $connect: () => Promise<void>;
    $disconnect: () => Promise<void>;
}>(PrismaClientConstructor: new (options?: any) => T, options?: PrismaClientOptions): Promise<PrismaInitResult<T>>;
/**
 * Create a standardized Prisma client factory for a capability
 *
 * @example
 * ```typescript
 * import { PrismaClient } from '@prisma/client-auth';
 * import { createPrismaClientFactory } from '@thinkeloquent/core-prisma-utils';
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
export declare function createPrismaClientFactory<T extends {
    $connect: () => Promise<void>;
    $disconnect: () => Promise<void>;
}>(PrismaClientConstructor: new (options?: any) => T, defaultOptions?: PrismaClientOptions): (overrideOptions?: PrismaClientOptions) => Promise<PrismaInitResult<T>>;
/**
 * Create an app-specific Prisma client factory with enhanced logging and tenant context
 *
 * @example
 * ```typescript
 * import { PrismaClient } from '.prisma/client-auth';
 * import { createAppPrismaClientFactory } from '@thinkeloquent/core-prisma-utils';
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
export declare function createAppPrismaClientFactory<T extends {
    $connect: () => Promise<void>;
    $disconnect: () => Promise<void>;
}>(appName: string, PrismaClientConstructor: new (options?: any) => T, defaultOptions?: AppPrismaClientOptions): (overrideOptions?: AppPrismaClientOptions) => Promise<PrismaInitResult<T>>;
//# sourceMappingURL=prisma-factory.d.ts.map