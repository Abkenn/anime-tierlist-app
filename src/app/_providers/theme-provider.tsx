'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type PropsWithChildren, useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const client = useSyncExternalStore(
    subscribe,
    clientSnapshot,
    serverSnapshot,
  );

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
      // The bootstrap executes only in SSR HTML; client remounts use the provider effects.
      // https://github.com/pacocoursey/next-themes/issues/397
      scriptProps={{ type: client ? 'application/json' : undefined }}
    >
      {children}
    </NextThemesProvider>
  );
};
