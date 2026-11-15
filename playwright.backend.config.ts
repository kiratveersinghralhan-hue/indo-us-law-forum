import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/browser',
  testMatch: 'backend.ts',
  outputDir: '.qa/backend-browser-results',
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:5182',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/backend-browser-server.mjs',
    url: 'http://127.0.0.1:5182',
    reuseExistingServer: false,
  },
});
