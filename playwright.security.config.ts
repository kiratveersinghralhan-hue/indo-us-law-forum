import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/browser',
  testMatch: 'backend.ts',
  grep: /security headers:/,
  outputDir: '.qa/security-browser-results',
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: 'http://127.0.0.1:5193',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/security-browser-server.mjs',
    url: 'http://127.0.0.1:5193/admin/login',
    reuseExistingServer: false,
  },
});
