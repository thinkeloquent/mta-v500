import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { migrateDevCommand } from '../../src/commands/migrate.js';
import type { MtaPrismaConfig } from '../../src/types/config.js';
import { createMockPrismaSchema } from '../__fixtures__/test-helpers.js';

// Mock executor
vi.mock('../../src/lib/executor.js', () => ({
  executePrisma: vi.fn(async () => ({
    success: true,
    duration: 200,
  })),
  executePrismaSequential: vi.fn(async (apps) => {
    const results = new Map();
    for (const app of apps) {
      results.set(app.name, { success: true, duration: 200 });
    }
    return results;
  }),
}));

// Mock logger
vi.mock('../../src/lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    dim: vi.fn(),
    section: vi.fn(),
    header: vi.fn(),
    step: vi.fn(),
  },
}));

describe('Migrate Command Integration', () => {
  let testDir: string;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'mta-prisma-test-'));
    // Mock process.exit to prevent test termination
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
    processExitSpy.mockRestore();
  });

  it('should run migrations for all enabled apps in dependency order', async () => {
    await mkdir(join(testDir, 'apps/auth/prisma'), { recursive: true });
    await mkdir(join(testDir, 'apps/billing/prisma'), { recursive: true });

    await writeFile(
      join(testDir, 'apps/auth/prisma/schema.prisma'),
      createMockPrismaSchema('User'),
    );
    await writeFile(
      join(testDir, 'apps/billing/prisma/schema.prisma'),
      createMockPrismaSchema('Invoice'),
    );

    const config: MtaPrismaConfig = {
      apps: [
        {
          name: 'billing',
          schemaPath: 'apps/billing/prisma/schema.prisma',
          outputName: 'client-billing',
          enabled: true,
          dependencies: ['auth'],
        },
        {
          name: 'auth',
          schemaPath: 'apps/auth/prisma/schema.prisma',
          outputName: 'client-auth',
          enabled: true,
          dependencies: [],
        },
      ],
      strategy: 'orchestrated',
    };

    await migrateDevCommand(config, { cwd: testDir });

    const { executePrismaSequential } = await import('../../src/lib/executor.js');
    expect(executePrismaSequential).toHaveBeenCalled();

    // Verify auth was processed before billing
    const callArgs = vi.mocked(executePrismaSequential).mock.calls[0];
    const apps = callArgs[0];
    const authIndex = apps.findIndex((a) => a.name === 'auth');
    const billingIndex = apps.findIndex((a) => a.name === 'billing');
    expect(authIndex).toBeLessThan(billingIndex);
  });

  it('should run migration for specific app only', async () => {
    await mkdir(join(testDir, 'apps/auth/prisma'), { recursive: true });
    await writeFile(
      join(testDir, 'apps/auth/prisma/schema.prisma'),
      createMockPrismaSchema('User'),
    );

    const config: MtaPrismaConfig = {
      apps: [
        {
          name: 'auth',
          schemaPath: 'apps/auth/prisma/schema.prisma',
          outputName: 'client-auth',
          enabled: true,
        },
      ],
      strategy: 'orchestrated',
    };

    await migrateDevCommand(config, { app: 'auth', cwd: testDir });

    const { executePrismaSequential } = await import('../../src/lib/executor.js');
    expect(executePrismaSequential).toHaveBeenCalledWith(
      [expect.objectContaining({ name: 'auth' })],
      'migrate dev',
      expect.any(Array),
    );
  });

  it('should stop on first migration failure', async () => {
    const { executePrismaSequential } = await import('../../src/lib/executor.js');
    vi.mocked(executePrismaSequential).mockResolvedValueOnce(
      new Map([
        ['auth', { success: true, duration: 200 }],
        ['billing', { success: false, error: new Error('Migration failed'), duration: 100 }],
      ]),
    );

    const config: MtaPrismaConfig = {
      apps: [
        {
          name: 'auth',
          schemaPath: 'apps/auth/prisma/schema.prisma',
          outputName: 'client-auth',
          enabled: true,
        },
        {
          name: 'billing',
          schemaPath: 'apps/billing/prisma/schema.prisma',
          outputName: 'client-billing',
          enabled: true,
          dependencies: ['auth'],
        },
      ],
      strategy: 'orchestrated',
    };

    await migrateDevCommand(config, { cwd: testDir });

    const { logger } = await import('../../src/lib/logger.js');
    expect(logger.error).toHaveBeenCalled();
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('should pass migration name argument', async () => {
    const config: MtaPrismaConfig = {
      apps: [
        {
          name: 'auth',
          schemaPath: 'apps/auth/prisma/schema.prisma',
          outputName: 'client-auth',
          enabled: true,
        },
      ],
      strategy: 'orchestrated',
    };

    // Reset mock to clear previous calls
    const { executePrismaSequential } = await import('../../src/lib/executor.js');
    vi.mocked(executePrismaSequential).mockClear();

    await migrateDevCommand(config, {
      app: 'auth',
      name: 'add_user_role',
      cwd: testDir,
    });

    expect(executePrismaSequential).toHaveBeenCalledWith(
      [expect.objectContaining({ name: 'auth' })],
      'migrate dev',
      ['--name', 'add_user_role'],
    );
  });
});
