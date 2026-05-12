import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  workers: 1,
  reporter: [['html', { outputFolder: 'e2e-report' }], ['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'cd server && npm run dev',
      port: 3001,
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: 'cd client && npm run dev',
      port: 3000,
      reuseExistingServer: true,
      timeout: 60000,
    },
  ],
});
