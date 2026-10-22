import type { Preview } from '@storybook/nextjs-vite';
import { ThemeProvider, useTheme } from 'next-themes';
import { type PropsWithChildren, useEffect, useRef } from 'react';
import { mocked, sb } from 'storybook/test';
import { themes } from 'storybook/theming';
import { useOfflineReconnect } from '../src/app/_hooks/use-offline-reconnect';
import '../src/app/_styles/globals.css';
import './sandbox.css';

sb.mock('../src/app/_hooks/use-offline-reconnect.ts');
sb.mock('../src/app/_services/offline-mode.ts', { spy: true });

type SandboxThemeProps = PropsWithChildren<{ theme: string }>;
const SandboxTheme = ({ theme, children }: SandboxThemeProps) => {
  const { setTheme } = useTheme();
  const appliedTheme = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (appliedTheme.current === theme) return;
    appliedTheme.current = theme;
    setTheme(theme);
  }, [theme, setTheme]);
  return children;
};

const preview: Preview = {
  tags: ['autodocs'],
  initialGlobals: { theme: 'dark' },
  globalTypes: {
    theme: {
      description: 'Color theme',
      toolbar: {
        icon: 'circlehollow',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    layout: 'padded',
    docs: { theme: themes.dark },
    nextjs: { appDirectory: true, navigation: { pathname: '/', query: {} } },
    controls: { expanded: true },
    a11y: { test: 'error' },
  },
  decorators: [
    (Story, context) => (
      <ThemeProvider
        attribute="class"
        defaultTheme={context.globals.theme ?? 'dark'}
        storageKey="tierlist-storybook-theme"
        disableTransitionOnChange
      >
        <SandboxTheme theme={context.globals.theme ?? 'dark'}>
          <div className="min-h-full bg-background font-mono text-foreground">
            <Story />
          </div>
        </SandboxTheme>
      </ThemeProvider>
    ),
  ],
  beforeEach() {
    mocked(useOfflineReconnect).mockReturnValue({
      mode: 'dev',
      checking: false,
      reconnect: async () => {},
    });
  },
};
export default preview;
