import { execa } from 'execa';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  executePrisma,
  executePrismaParallel,
  executePrismaSequential,
} from '../../src/lib/executor.js';
import type { AppConfig } from '../../src/types/config.js';
import { createMockAppConfig } from '../__fixtures__/test-helpers.js';

// Mock execa
vi.mock('execa');

// Mock logger to avoid console output during tests
vi.mock('../../src/lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    dim: vi.fn(),
    section: vi.fn(),
  },
}));

describe('Executor Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('executePrisma', () => {
    it('should execute prisma command successfully', async () => {
      const app = createMockAppConfig({ name: 'auth' });
      const mockResult = { stdout: 'Success', stderr: '', exitCode: 0 };

      vi.mocked(execa).mockResolvedValue(mockResult as any);

      const result = await executePrisma(app, 'generate', [], { silent: true });

      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(execa).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['prisma', 'generate']),
        expect.objectContaining({
          stdio: 'pipe',
        }),
      );
    });

    it('should handle prisma command failure', async () => {
      const app = createMockAppConfig({ name: 'auth' });
      const mockError = new Error('Prisma command failed');

      vi.mocked(execa).mockRejectedValue(mockError);

      const result = await executePrisma(app, 'generate', [], { silent: true });

      expect(result.success).toBe(false);
      expect(result.error).toBe(mockError);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should pass schema path to prisma command', async () => {
      const app = createMockAppConfig({
        name: 'auth',
        schemaPath: 'apps/auth/prisma/schema.prisma',
      });

      vi.mocked(execa).mockResolvedValue({ stdout: 'Success' } as any);

      await executePrisma(app, 'generate', [], { silent: true, cwd: '/project' });

      expect(execa).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['prisma', 'generate', expect.stringContaining('schema.prisma')]),
        expect.any(Object),
      );
    });

    it('should support dry run mode', async () => {
      const app = createMockAppConfig();

      const result = await executePrisma(app, 'generate', [], {
        dryRun: true,
        silent: true,
      });

      expect(result.success).toBe(true);
      expect(result.duration).toBe(0);
      expect(execa).not.toHaveBeenCalled();
    });

    it('should pass environment variables', async () => {
      const app = createMockAppConfig();
      const env = { DATABASE_URL: 'postgresql://test' };

      vi.mocked(execa).mockResolvedValue({ stdout: 'Success' } as any);

      await executePrisma(app, 'generate', [], { silent: true, env });

      expect(execa).toHaveBeenCalledWith(
        'npx',
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining(env),
        }),
      );
    });

    it('should support additional arguments', async () => {
      const app = createMockAppConfig();

      vi.mocked(execa).mockResolvedValue({ stdout: 'Success' } as any);

      await executePrisma(app, 'migrate', ['dev', '--name', 'test'], {
        silent: true,
      });

      expect(execa).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['migrate', 'dev', '--name', 'test']),
        expect.any(Object),
      );
    });
  });

  describe('executePrismaParallel', () => {
    it('should execute commands for multiple apps in parallel', async () => {
      const apps = [
        createMockAppConfig({ name: 'auth' }),
        createMockAppConfig({ name: 'billing' }),
      ];

      vi.mocked(execa).mockResolvedValue({ stdout: 'Success' } as any);

      const results = await executePrismaParallel(apps, 'generate', [], {
        silent: true,
      });

      expect(results.size).toBe(2);
      expect(results.get('auth')?.success).toBe(true);
      expect(results.get('billing')?.success).toBe(true);
      expect(execa).toHaveBeenCalledTimes(2);
    });

    it('should continue on individual failures', async () => {
      const apps = [
        createMockAppConfig({ name: 'auth' }),
        createMockAppConfig({ name: 'billing' }),
      ];

      vi.mocked(execa)
        .mockResolvedValueOnce({ stdout: 'Success' } as any)
        .mockRejectedValueOnce(new Error('Failed'));

      const results = await executePrismaParallel(apps, 'generate', [], {
        silent: true,
      });

      expect(results.size).toBe(2);
      expect(results.get('auth')?.success).toBe(true);
      expect(results.get('billing')?.success).toBe(false);
    });

    it('should respect concurrency limit', async () => {
      const apps = Array.from({ length: 5 }, (_, i) => createMockAppConfig({ name: `app${i}` }));

      let concurrentCalls = 0;
      let maxConcurrent = 0;

      vi.mocked(execa).mockImplementation(async () => {
        concurrentCalls++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCalls);
        await new Promise((resolve) => setTimeout(resolve, 10));
        concurrentCalls--;
        return { stdout: 'Success' } as any;
      });

      await executePrismaParallel(apps, 'generate', [], { silent: true }, 2);

      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });
  });

  describe('executePrismaSequential', () => {
    it('should execute commands in sequence', async () => {
      const apps = [
        createMockAppConfig({ name: 'auth', schemaPath: 'apps/auth/prisma/schema.prisma' }),
        createMockAppConfig({ name: 'billing', schemaPath: 'apps/billing/prisma/schema.prisma' }),
      ];

      const callOrder: string[] = [];

      vi.mocked(execa).mockImplementation(async (cmd, args) => {
        const schemaArg = args?.find((arg: string) => arg.includes('--schema='));
        if (schemaArg) {
          const match = schemaArg.match(/apps\/(\w+)\//);
          if (match) callOrder.push(match[1]);
        }
        return { stdout: 'Success' } as any;
      });

      await executePrismaSequential(apps, 'generate', [], { silent: true });

      expect(callOrder).toEqual(['auth', 'billing']);
    });

    it('should stop on first failure', async () => {
      const apps = [
        createMockAppConfig({ name: 'auth' }),
        createMockAppConfig({ name: 'billing' }),
        createMockAppConfig({ name: 'reports' }),
      ];

      let callCount = 0;
      vi.mocked(execa).mockImplementation(async () => {
        callCount++;
        if (callCount === 1) return { stdout: 'Success' } as any;
        if (callCount === 2) throw new Error('Failed');
        return { stdout: 'Success' } as any;
      });

      const results = await executePrismaSequential(apps, 'generate', [], {
        silent: false, // Must be false to trigger break on failure
      });

      // Should have results for auth and billing, but not reports
      expect(results.size).toBe(2);
      expect(results.get('auth')?.success).toBe(true);
      expect(results.get('billing')?.success).toBe(false);
      expect(results.has('reports')).toBe(false);
      expect(callCount).toBe(2); // Should stop after second call
    });

    it('should return results for all successful apps', async () => {
      const apps = [
        createMockAppConfig({ name: 'auth' }),
        createMockAppConfig({ name: 'billing' }),
      ];

      vi.mocked(execa).mockResolvedValue({ stdout: 'Success' } as any);

      const results = await executePrismaSequential(apps, 'generate', [], {
        silent: true,
      });

      expect(results.size).toBe(2);
      expect(results.get('auth')?.success).toBe(true);
      expect(results.get('billing')?.success).toBe(true);
    });
  });
});
