'use client';

import { useAtomValue } from 'jotai';
import { atom } from 'jotai/vanilla';
import { useEffect, useState } from 'react';
import { tierItemsAtom } from '@/app/_atoms/tierlist/items.atoms';
import { cacheTierlistPosters } from '@/app/_services/poster-cache';

const posterUrlsAtom = atom((get) =>
  JSON.stringify(
    [
      ...new Set(
        get(tierItemsAtom).flatMap((item) =>
          item.image ? [item.image.src] : [],
        ),
      ),
    ].sort(),
  ),
);

export const PosterOfflineCache = () => {
  const urls = useAtomValue(posterUrlsAtom);
  const [failure, setFailure] = useState<{ urls: string; attempt: number }>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const retry = () => setAttempt((value) => value + 1);
    window.addEventListener('online', retry);

    return () => window.removeEventListener('online', retry);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const images: string[] = JSON.parse(urls);
    let idle: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const save = async () => {
      try {
        if (!('caches' in window)) {
          throw new Error('Poster cache unavailable');
        }
        await cacheTierlistPosters(images, controller.signal, (value) => {
          if (value.failed) {
            setFailure({ urls, attempt });
          }
        });
      } catch {
        if (!controller.signal.aborted) {
          setFailure({ urls, attempt });
        }
      }
    };
    const schedule = () => {
      if ('requestIdleCallback' in window) {
        idle = window.requestIdleCallback(() => void save());
      } else {
        timer = globalThis.setTimeout(() => void save(), 0);
      }
    };
    if (document.readyState === 'complete') {
      schedule();
    } else {
      window.addEventListener('load', schedule, { once: true });
    }

    return () => {
      controller.abort();
      window.removeEventListener('load', schedule);
      if (idle !== undefined) {
        window.cancelIdleCallback(idle);
      }
      globalThis.clearTimeout(timer);
    };
  }, [urls, attempt]);

  if (failure?.attempt !== attempt || failure.urls !== urls || urls === '[]') {
    return null;
  }

  return (
    <p
      role="status"
      className="absolute bottom-2 left-0 z-40 max-w-full border border-divider bg-background/95 px-3 py-2 text-xs text-muted-foreground shadow-sm"
    >
      Some posters aren’t available offline.
      <button
        type="button"
        className="ml-2 cursor-pointer underline underline-offset-4"
        onClick={() => setAttempt((value) => value + 1)}
      >
        Retry
      </button>
    </p>
  );
};
