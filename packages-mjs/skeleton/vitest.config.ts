import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test file patterns - only match .spec.vite.ts files in src/
    include: ['src/**/*.spec.vite.ts'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],

    // Environment
    environment: 'node',

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['html', 'lcov', 'text-summary'],
      exclude: ['node_modules/', 'dist/', '**/*.spec.vite.ts', 'vitest.config.ts'],
    },

    // Reporters - clean tree view with summary
    // Add 'github-actions' when running in CI
    reporters: process.env.GITHUB_ACTIONS
      ? ['default', 'html', 'github-actions']
      : ['default', 'html'],

    // UI configuration
    ui: false,
    open: false, // Don't auto-open browser

    // Test timeout
    testTimeout: 10000,

    // Globals (optional - allows using describe/it without importing)
    globals: true,

    // Threads
    threads: true,
    isolate: true,
  },
});
