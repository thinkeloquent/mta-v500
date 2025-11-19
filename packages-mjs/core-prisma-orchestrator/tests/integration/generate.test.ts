import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateCommand } from '../../src/commands/generate.js';
import type { MtaPrismaConfig } from '../../src/types/config.js';
import { createMockPrismaSchema } from '../__fixtures__/test-helpers.js';

// Mock executor to avoid real Prisma calls
vi.mock('../../src/lib/executor.js', () => ({
  executePrisma: vi.fn().mockResolvedValue({
    success: true,
    duration: 100,
  }),
  executePrismaParallel: vi.fn().mockResolvedValue(
    new Map([
      ['auth', { success: true, duration: 100 }],
      ['billing', { success: true, duration: 150 }],
    ]),
  ),
  executePrismaSequential: vi.fn().mockResolvedValue(
    new Map([
      ['auth', { success: true, duration: 100 }],
      ['billing', { success: true, duration: 150 }],
    ]),
  ),
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

// Mock ora
vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
  })),
}));

describe('Generate Command Integration', () => {
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

  it('should generate clients for all enabled apps', async () => {
    // Create test structure
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
        },
      ],
      strategy: 'orchestrated',
    };

    await generateCommand(config, { cwd: testDir });

    const { executePrismaParallel } = await import('../../src/lib/executor.js');
    expect(executePrismaParallel).toHaveBeenCalled();
  });

  it('should generate client for specific app only', async () => {
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

    await generateCommand(config, { app: 'auth', cwd: testDir });

    const { executePrismaParallel } = await import('../../src/lib/executor.js');
    expect(executePrismaParallel).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ name: 'auth' })]),
      'generate',
      expect.any(Array),
      expect.any(Object),
      expect.any(Number),
    );
  });

  it('should skip disabled apps', async () => {
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
          enabled: false,
        },
      ],
      strategy: 'orchestrated',
    };

    await generateCommand(config, { cwd: testDir });

    const { executePrismaParallel } = await import('../../src/lib/executor.js');
    expect(executePrismaParallel).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ name: 'auth' })]),
      expect.any(String),
      expect.any(Array),
      expect.any(Object),
      expect.any(Number),
    );
  });

  it('should handle generation errors gracefully', async () => {
    const { executePrismaParallel } = await import('../../src/lib/executor.js');
    vi.mocked(executePrismaParallel).mockResolvedValueOnce(
      new Map([
        ['auth', { success: true, duration: 100 }],
        ['billing', { success: false, error: new Error('Schema error'), duration: 50 }],
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
        },
      ],
      strategy: 'orchestrated',
    };

    await generateCommand(config, { cwd: testDir });

    const { logger } = await import('../../src/lib/logger.js');
    expect(logger.success).toHaveBeenCalledWith(expect.stringContaining('auth'));
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('billing'));
  });
});
