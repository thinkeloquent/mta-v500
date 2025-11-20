import type { TenantContext } from './types.js';
/**
 * Create a tenant context from a fixed tenant ID
 */
export declare function createFixedTenantContext(tenantId: string | null): TenantContext;
/**
 * Create a tenant context that resolves from async storage or request context
 */
export declare function createDynamicTenantContext(getTenantIdFn: () => string | null | undefined): TenantContext;
/**
 * Create a tenant context with database URL mapping
 */
export declare function createTenantContextWithUrl(getTenantIdFn: () => string | null | undefined, getDatabaseUrlFn: () => string | undefined): TenantContext;
/**
 * Create a tenant context from environment variables
 * Useful for multi-database per tenant setups
 */
export declare function createEnvTenantContext(envKeyPrefix?: string): TenantContext;
/**
 * Tenant ID extractor from common sources
 */
export declare const TenantExtractors: {
    /**
     * Extract tenant ID from request header
     */
    fromHeader: (headerName?: string) => (request: any) => string | null;
    /**
     * Extract tenant ID from subdomain
     * e.g., tenant1.example.com -> tenant1
     */
    fromSubdomain: () => (request: any) => string | null;
    /**
     * Extract tenant ID from URL path
     * e.g., /tenants/tenant1/... -> tenant1
     */
    fromPath: (pathPrefix?: string) => (request: any) => string | null;
    /**
     * Extract tenant ID from JWT token claim
     */
    fromJWT: (claimName?: string) => (request: any) => string | null;
    /**
     * Extract tenant ID from query parameter
     */
    fromQuery: (paramName?: string) => (request: any) => string | null;
};
/**
 * Create a Fastify preHandler hook for tenant context
 *
 * @example
 * ```typescript
 * import { createTenantContextHook, TenantExtractors } from '@thinkeloquent/core-prisma-utils';
 *
 * fastify.addHook('preHandler', createTenantContextHook(
 *   TenantExtractors.fromHeader('x-tenant-id')
 * ));
 *
 * // In your route handler
 * fastify.get('/users', async (request, reply) => {
 *   const tenantId = request.tenantId;
 *   // Use tenantId to filter queries
 * });
 * ```
 */
export declare function createTenantContextHook(extractor: (request: any) => string | null): (request: any, _reply: any) => Promise<void>;
/**
 * Create query extension for tenant filtering
 *
 * @example
 * ```typescript
 * import { createTenantQueryExtension } from '@thinkeloquent/core-prisma-utils';
 *
 * const prisma = new PrismaClient().$extends(
 *   createTenantQueryExtension(() => request.tenantId)
 * );
 *
 * // All queries automatically filtered by tenantId
 * const users = await prisma.user.findMany(); // WHERE tenantId = ?
 * ```
 */
export declare function createTenantQueryExtension(getTenantId: () => string | null): {
    name: string;
    query: {
        $allModels: {
            findMany({ args, query }: any): Promise<any>;
            findFirst({ args, query }: any): Promise<any>;
            create({ args, query }: any): Promise<any>;
            update({ args, query }: any): Promise<any>;
            delete({ args, query }: any): Promise<any>;
        };
    };
};
//# sourceMappingURL=tenant-utils.d.ts.map