import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { config as loadEnvironment } from 'dotenv';

loadEnvironment({ quiet: true });

const webPort = 5174;
const apiPort = 3101;
const managedOrigin = `http://127.0.0.1:${webPort}`;
const existingOrigin = process.env.E2E_BASE_URL;
const testEnvironment = {
  API_PORT: String(apiPort),
  API_HOST: '127.0.0.1',
  APP_ORIGIN: managedOrigin,
  SESSION_SECRET: process.env.SESSION_SECRET ?? randomBytes(32).toString('hex'),
  IP_HASH_SECRET: process.env.IP_HASH_SECRET ?? randomBytes(32).toString('hex'),
  DATA_DIR: process.env.E2E_DATA_DIR ?? resolve('data', 'e2e'),
  DEEPSEEK_API_KEY: '',
  NODE_ENV: 'test',
};

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '*.spec.ts',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL: existingOrigin ?? managedOrigin,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Dedicated ports avoid reusing an unrelated developer server. An explicit
  // E2E_BASE_URL opts into a separately managed instance instead.
  webServer: existingOrigin
    ? undefined
    : [
        {
          command: 'npm run start --workspace @zdaj/api',
          url: `http://127.0.0.1:${apiPort}/api/v1/health`,
          env: testEnvironment,
          reuseExistingServer: false,
          timeout: 120_000,
          stdout: 'pipe',
          stderr: 'pipe',
        },
        {
          command: `npm run dev --workspace @zdaj/web -- --port ${webPort} --strictPort`,
          url: managedOrigin,
          env: { API_PROXY_TARGET: `http://127.0.0.1:${apiPort}`, VITE_PORT: String(webPort) },
          reuseExistingServer: false,
          timeout: 120_000,
          stdout: 'pipe',
          stderr: 'pipe',
        },
      ],
});
