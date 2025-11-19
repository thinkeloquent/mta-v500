import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // Global setup runs once before all tests
  // Note: API mocking is done per-test using page.route() in fixtures
  console.log('Playwright global setup: API mocking enabled for Vite-only tests');
}

export default globalSetup;
