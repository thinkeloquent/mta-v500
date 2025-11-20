import type { FastifyInstance } from 'fastify';
import { type AppRegistration, type RegisteredApp } from './lib/app-registry.js';
declare const _default: (fastify: FastifyInstance) => Promise<void>;
export default _default;
declare module 'fastify' {
    interface FastifyInstance {
        apps: {
            register: (registration: AppRegistration) => Promise<void>;
            registerAll: (registrations: AppRegistration[]) => Promise<void>;
            loadApps: (appConfigs: Array<{
                name: string;
                enabled?: boolean;
                dependencies?: string[];
                [key: string]: unknown;
            }>, databaseUrl?: string) => Promise<{
                loadAppStaticAssets: () => Promise<void>;
            }>;
            get: (name: string) => RegisteredApp | undefined;
            list: () => RegisteredApp[];
            isLoaded: (name: string) => boolean;
        };
    }
}
//# sourceMappingURL=plugin.d.ts.map