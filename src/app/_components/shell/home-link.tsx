'use client';

import Link from 'next/link';
import { useOfflineMode } from '@/app/_hooks/use-offline-mode';
import { withOfflineMode } from '@/app/_services/offline-mode';

export const HomeLink = () => {
  const mode = useOfflineMode();
  return (
    <Link
      href="/"
      className="text-xs tracking-wide text-muted-foreground transition-colors hover:text-foreground"
      onClick={(event) => {
        if (
          !mode ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        )
          return;
        event.preventDefault();
        const url = new URL(window.location.href);
        url.pathname = '/';
        window.history.replaceState(null, '', withOfflineMode(url, mode));
      }}
    >
      tierlist / home
    </Link>
  );
};
