import type { TenantContext } from './types.js';

/**
 * Create a tenant context from a fixed tenant ID
 */
export function createFixedTenantContext(tenantId: string | null): TenantContext {
  return {
    getTenantId: () => tenantId,
  };
}

/**
 * Create a tenant context that resolves from async storage or request context
 */
export function createDynamicTenantContext(
  getTenantIdFn: () => string | null | undefined,
): TenantContext {
  return {
    getTenantId: getTenantIdFn,
  };
}

/**
 * Create a tenant context with database URL mapping
 */
export function createTenantContextWithUrl(
  getTenantIdFn: () => string | null | undefined,
  getDatabaseUrlFn: () => string | undefined,
): TenantContext {
  return {
    getTenantId: getTenantIdFn,
    getDatabaseUrl: getDatabaseUrlFn,
  };
}

/**
 * Create a tenant context from environment variables
 * Useful for multi-database per tenant setups
 */
export function createEnvTenantContext(envKeyPrefix: string = 'TENANT'): TenantContext {
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
  fromHeader: (headerName: string = 'x-tenant-id') => {
    return (request: any): string | null => {
      return request.headers?.[headerName] || null;
    };
  },

  /**
   * Extract tenant ID from subdomain
   * e.g., tenant1.example.com -> tenant1
   */
  fromSubdomain: () => {
    return (request: any): string | null => {
      const host = request.headers?.host || '';
      const parts = host.split('.');
      return parts.length > 2 ? parts[0] : null;
    };
  },

  /**
   * Extract tenant ID from URL path
   * e.g., /tenants/tenant1/... -> tenant1
   */
  fromPath: (pathPrefix: string = '/tenants/') => {
    return (request: any): string | null => {
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
  fromJWT: (claimName: string = 'tenantId') => {
    return (request: any): string | null => {
      return request.user?.[claimName] || request.auth?.[claimName] || null;
    };
  },

  /**
   * Extract tenant ID from query parameter
   */
  fromQuery: (paramName: string = 'tenant_id') => {
    return (request: any): string | null => {
      return request.query?.[paramName] || null;
    };
  },
};

/**
 * Create a Fastify preHandler hook for tenant context
 *
 * @example
 * ```typescript
 * import { createTenantContextHook, TenantExtractors } from '@internal/core-prisma-utils';
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
export function createTenantContextHook(extractor: (request: any) => string | null) {
  return async (request: any, _reply: any) => {
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
 * import { createTenantQueryExtension } from '@internal/core-prisma-utils';
 *
 * const prisma = new PrismaClient().$extends(
 *   createTenantQueryExtension(() => request.tenantId)
 * );
 *
 * // All queries automatically filtered by tenantId
 * const users = await prisma.user.findMany(); // WHERE tenantId = ?
 * ```
 */
export function createTenantQueryExtension(getTenantId: () => string | null) {
  return {
    name: 'tenant-filter',
    query: {
      $allModels: {
        async findMany({ args, query }: any) {
          const tenantId = getTenantId();
          if (tenantId) {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },
        async findFirst({ args, query }: any) {
          const tenantId = getTenantId();
          if (tenantId) {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },
        async create({ args, query }: any) {
          const tenantId = getTenantId();
          if (tenantId) {
            args.data = { ...args.data, tenantId };
          }
          return query(args);
        },
        async update({ args, query }: any) {
          const tenantId = getTenantId();
          if (tenantId) {
            args.where = { ...args.where, tenantId };
          }
          return query(args);
        },
        async delete({ args, query }: any) {
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
