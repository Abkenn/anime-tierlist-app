import { mkdirSync } from 'node:fs';
import { defineConfig } from '@playwright/test';
import { config } from 'dotenv';

config({ path: ['.env.development.local', '.env.local', '.env'], quiet: true });

const temporaryDirectory = `${process.cwd()}/.storybook-cache/tmp`;
mkdirSync(temporaryDirectory, { recursive: true });
process.env.TEMP = temporaryDirectory;
process.env.TMP = temporaryDirectory;
process.env.PLAYWRIGHT_BROWSERS_PATH ??= 'E:/CodexData/playwright';

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:3046',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm start --port 3046',
    url: 'http://localhost:3046',
    reuseExistingServer: false,
    env: { EXPOSE_TESTING_API: '1' },
    timeout: 30_000,
  },
});
