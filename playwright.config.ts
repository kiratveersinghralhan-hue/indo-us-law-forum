import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: [
    'homepage-motion.ts',
    'public-frontend.ts',
    'experience.ts',
    'intro.ts',
    'admin.ts',
    'redesign.ts',
    'confirmed-requirements.ts',
    'managed-hero.ts',
  ],
  outputDir: '.qa/browser-results',
  workers: 1,
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:5181',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    // UI demo regressions are isolated from the regular app's live backend.
    env: { VITE_DATA_MODE: 'mock' },
    command: 'npm run dev -- --port 5181 --strictPort --mode browser-test',
    url: 'http://127.0.0.1:5181',
    reuseExistingServer: false,
  },
});
