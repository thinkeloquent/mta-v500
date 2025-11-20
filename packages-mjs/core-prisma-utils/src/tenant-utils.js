/**
 * Create a tenant context from a fixed tenant ID
 */
export function createFixedTenantContext(tenantId) {
    return {
        getTenantId: () => tenantId,
    };
}
/**
 * Create a tenant context that resolves from async storage or request context
 */
export function createDynamicTenantContext(getTenantIdFn) {
    return {
        getTenantId: getTenantIdFn,
    };
}
/**
 * Create a tenant context with database URL mapping
 */
export function createTenantContextWithUrl(getTenantIdFn, getDatabaseUrlFn) {
    return {
        getTenantId: getTenantIdFn,
        getDatabaseUrl: getDatabaseUrlFn,
    };
}
/**
 * Create a tenant context from environment variables
 * Useful for multi-database per tenant setups
 */
export function createEnvTenantContext(envKeyPrefix = 'TENANT') {
    return {
        getTenantId: () => process.env[`${envKeyPrefix}_ID`] || null,
        getDatabaseUrl: () => process.env[`${envKeyPrefix}_DATABASE_URL`],
    };
}
/**
 * Tenant ID extractor from common sources
 */
export const TenantExtractors = {
    /**
     * Extract tenant ID from request header
     */
    fromHeader: (headerName = 'x-tenant-id') => {
        return (request) => {
            return request.headers?.[headerName] || null;
        };
    },
    /**
     * Extract tenant ID from subdomain
     * e.g., tenant1.example.com -> tenant1
     */
    fromSubdomain: () => {
        return (request) => {
            const host = request.headers?.host || '';
            const parts = host.split('.');
            return parts.length > 2 ? parts[0] : null;
        };
    },
    /**
     * Extract tenant ID from URL path
     * e.g., /tenants/tenant1/... -> tenant1
     */
    fromPath: (pathPrefix = '/tenants/') => {
        return (request) => {
            const url = request.url || '';
            if (url.startsWith(pathPrefix)) {
                const parts = url.substring(pathPrefix.length).split('/');
                return parts[0] || null;
            }
            return null;
        };
    },
    /**
     * Extract tenant ID from JWT token claim
     */
    fromJWT: (claimName = 'tenantId') => {
        return (request) => {
            return request.user?.[claimName] || request.auth?.[claimName] || null;
        };
    },
    /**
     * Extract tenant ID from query parameter
     */
    fromQuery: (paramName = 'tenant_id') => {
        return (request) => {
            return request.query?.[paramName] || null;
        };
    },
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
export function createTenantContextHook(extractor) {
    return async (request, _reply) => {
        const tenantId = extractor(request);
        request.tenantId = tenantId;
        // Optionally validate tenant exists
        if (tenantId === null) {
            // You can throw an error here if tenant is required
            // throw new Error('Tenant ID is required');
        }
    };
}
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
export function createTenantQueryExtension(getTenantId) {
    return {
        name: 'tenant-filter',
        query: {
            $allModels: {
                async findMany({ args, query }) {
                    const tenantId = getTenantId();
                    if (tenantId) {
                        args.where = { ...args.where, tenantId };
                    }
                    return query(args);
                },
                async findFirst({ args, query }) {
                    const tenantId = getTenantId();
                    if (tenantId) {
                        args.where = { ...args.where, tenantId };
                    }
                    return query(args);
                },
                async create({ args, query }) {
                    const tenantId = getTenantId();
                    if (tenantId) {
                        args.data = { ...args.data, tenantId };
                    }
                    return query(args);
                },
                async update({ args, query }) {
                    const tenantId = getTenantId();
                    if (tenantId) {
                        args.where = { ...args.where, tenantId };
                    }
                    return query(args);
                },
                async delete({ args, query }) {
                    const tenantId = getTenantId();
                    if (tenantId) {
                        args.where = { ...args.where, tenantId };
                    }
                    return query(args);
                },
            },
        },
    };
}
//# sourceMappingURL=tenant-utils.js.map