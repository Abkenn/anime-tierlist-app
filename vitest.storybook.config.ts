import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const temporaryDirectory = fileURLToPath(
  new URL('./.storybook-cache/tmp', import.meta.url),
);
mkdirSync(temporaryDirectory, { recursive: true });
process.env.TEMP = temporaryDirectory;
process.env.TMP = temporaryDirectory;
process.env.PLAYWRIGHT_BROWSERS_PATH ??= 'E:/CodexData/playwright';

export default defineConfig({
  plugins: [
    storybookTest({
      configDir: fileURLToPath(new URL('./.storybook', import.meta.url)),
    }),
  ],
  test: {
    name: 'storybook',
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
});
