import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    // @storybook/addon-vitest selects its named project from the root config.
    // Keep ordinary CLI unit runs separate from the browser story suite.
    projects: process.env.STORYBOOK_CONFIG_DIR ? ['./vitest.storybook.config.ts'] : undefined,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
  },
});
