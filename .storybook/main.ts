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
  core: { disableTelemetry: true },
  async viteFinal(config) {
    const { mergeConfig } = await import('vite');

    return mergeConfig(config, {
      plugins: [tailwindcss()],
      optimizeDeps: {
        include: [
          'motion/react',
          '@base-ui/react/scroll-area',
          '@base-ui/react/context-menu',
          '@base-ui/react/popover',
          '@base-ui/react/slider',
        ],
      },
    });
  },
};

export default config;
