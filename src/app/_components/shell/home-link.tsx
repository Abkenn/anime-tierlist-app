'use client';

import Link from 'next/link';
import { useOfflineMode } from '@/app/_hooks/use-offline-mode';
import { withOfflineMode } from '@/app/_services/offline-mode';

export const HomeLink = () => {
  const mode = useOfflineMode();

  return (
    <Link
      href="/"
      className="text-xl tracking-tight text-foreground transition-opacity hover:opacity-75"
      onClick={(event) => {
        if (
          !mode ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        ) {
          return;
        }

        event.preventDefault();

        const url = new URL(window.location.href);

        url.pathname = '/';
        window.history.replaceState(null, '', withOfflineMode(url, mode));
      }}
    >
      Anime Tierlist
    </Link>
  );
};
