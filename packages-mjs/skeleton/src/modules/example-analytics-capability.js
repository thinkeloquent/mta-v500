/**
 * Example Module: Analytics Capability
 *
 * This file demonstrates how to structure a capability module
 * with Swagger documentation in a multi-module setup.
 */
import { registerModule, registerModuleRoutes } from '../plugins/swagger/index.js';
/**
 * Analytics Capability Module Configuration
 */
export function registerAnalyticsModule() {
    registerModule({
        module: {
            name: 'analytics',
            type: 'capability',
            version: '2.0.0',
            description: 'Analytics and reporting capabilities',
            routePrefix: '/api/analytics',
            tags: ['analytics', 'reports', 'metrics'],
            contact: {
                name: 'Analytics Team',
            },
        },
    });
}
/**
 * Analytics Capability Routes
 */
export async function registerAnalyticsRoutes(fastify) {
    await registerModuleRoutes(fastify, {
        name: 'analytics',
        type: 'capability',
        version: '2.0.0',
        description: 'Analytics and reporting capabilities',
    }, async (instance) => {
        // Get analytics dashboard data
        instance.get('/api/analytics/dashboard', {
            schema: {
                description: 'Retrieve dashboard analytics data',
                summary: 'Get dashboard data',
                tags: ['analytics'],
                response: {
                    200: {
                        description: 'Dashboard data',
                        type: 'object',
                        properties: {
                            totalUsers: { type: 'number' },
                            activeUsers: { type: 'number' },
                            totalRevenue: { type: 'number' },
                            period: { type: 'string' },
                        },
                    },
                },
            },
            handler: async () => {
                return {
                    totalUsers: 1250,
                    activeUsers: 842,
                    totalRevenue: 45678.9,
                    period: 'last-30-days',
                };
            },
        });
        // Get specific report
        instance.get('/api/analytics/reports/:reportType', {
            schema: {
                description: 'Generate a specific analytics report',
                summary: 'Get report by type',
                tags: ['reports'],
                params: {
                    type: 'object',
                    properties: {
                        reportType: {
                            type: 'string',
                            enum: ['sales', 'users', 'traffic', 'engagement'],
                            description: 'Type of report to generate',
                        },
                    },
                    required: ['reportType'],
                },
                querystring: {
                    type: 'object',
                    properties: {
                        startDate: { type: 'string', format: 'date' },
                        endDate: { type: 'string', format: 'date' },
                        format: { type: 'string', enum: ['json', 'csv', 'pdf'] },
                    },
                },
                response: {
                    200: {
                        description: 'Report data',
                        type: 'object',
                        properties: {
                            reportType: { type: 'string' },
                            data: { type: 'array', items: { type: 'object' } },
                            generatedAt: { type: 'string', format: 'date-time' },
                        },
                    },
                },
            },
            handler: async (request) => {
                const { reportType } = request.params;
                const query = request.query;
                return {
                    reportType,
                    data: [
                        { date: '2025-10-01', value: 100 },
                        { date: '2025-10-02', value: 150 },
                    ],
                    generatedAt: new Date().toISOString(),
                    filters: query,
                };
            },
        });
    });
}
//# sourceMappingURL=example-analytics-capability.js.map