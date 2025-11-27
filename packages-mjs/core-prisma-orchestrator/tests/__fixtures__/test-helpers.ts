import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AppConfig, MtaPrismaConfig } from '../../src/types/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const FIXTURES_DIR = __dirname;

export function getFixturePath(filename: string): string {
  return resolve(FIXTURES_DIR, filename);
}

export function createMockAppConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    name: 'test-app',
    schemaPath: 'apps/test-app/prisma/schema.prisma',
    outputName: 'client-test-app',
    enabled: true,
    dependencies: [],
    ...overrides,
  };
}

export function createMockConfig(overrides: Partial<MtaPrismaConfig> = {}): MtaPrismaConfig {
  return {
    apps: [
      createMockAppConfig({
        name: 'auth',
        schemaPath: 'apps/auth/prisma/schema.prisma',
        outputName: 'client-auth',
      }),
      createMockAppConfig({
        name: 'billing',
        schemaPath: 'apps/billing/prisma/schema.prisma',
        outputName: 'client-billing',
        dependencies: ['auth'],
      }),
    ],
    strategy: 'orchestrated',
    ...overrides,
  };
}

export function createMockPrismaSchema(modelName: string = 'User'): string {
  return `
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/client-test"
}

model ${modelName} {
  id    String @id @default(cuid())
  email String @unique
}
`.trim();
}
