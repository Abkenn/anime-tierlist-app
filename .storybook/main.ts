import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/nextjs-vite';
import tailwindcss from '@tailwindcss/vite';

const config: StorybookConfig = {
  stories: ['../src/app/_components/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-themes',
    '@storybook/addon-vitest',
  ],
  framework: '@storybook/nextjs-vite',
  features: { experimentalRSC: true },
  core: { disableTelemetry: true },
  async viteFinal(config) {
    const { mergeConfig } = await import('vite');
    return mergeConfig(config, {
      plugins: [
        tailwindcss(),
        {
          name: 'tierlist-sandbox-navigation',
          enforce: 'pre',
          transform(source: string, id: string) {
            if (!id.replaceAll('\\', '/').endsWith('/home-preview.tsx')) return;
            return source.replace(
              /(['"])next\/cache\1/g,
              JSON.stringify(
                fileURLToPath(
                  new URL('./mocks/next-cache.ts', import.meta.url),
                ).replaceAll('\\', '/'),
              ),
            );
          },
        },
      ],
    });
  },
};
export default config;
