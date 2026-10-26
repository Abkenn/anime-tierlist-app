'use client';

import { useAtomValue } from 'jotai';
import { atom } from 'jotai/vanilla';
import { useEffect, useState } from 'react';
import { tierItemsAtom } from '@/app/_atoms/tierlist/items.atoms';
import {
  cacheTierlistPosters,
  type PosterCacheProgress,
} from '@/app/_services/poster-cache';

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
  const [progress, setProgress] = useState<
    PosterCacheProgress & { attempt: number }
  >();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const retry = () => setAttempt((value) => value + 1);
    window.addEventListener('online', retry);

    return () => window.removeEventListener('online', retry);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const images: string[] = JSON.parse(urls);
    setProgress({ total: images.length, saved: 0, failed: 0, attempt });
    const save = async () => {
      try {
        if (!('caches' in window)) {
          throw new Error('Poster cache unavailable');
        }
        await cacheTierlistPosters(images, controller.signal, (value) =>
          setProgress({ ...value, attempt }),
        );
      } catch {
        if (!controller.signal.aborted) {
          setProgress({
            total: images.length,
            saved: 0,
            failed: images.length,
            attempt,
          });
        }
      }
    };
    void save();

    return () => controller.abort();
  }, [urls, attempt]);

  if (
    progress?.attempt !== attempt ||
    !progress.total ||
    progress.saved === progress.total
  ) {
    return null;
  }

  return (
    <p
      role="status"
      className="absolute bottom-2 left-0 z-40 max-w-full border border-divider bg-background/95 px-3 py-2 text-xs text-muted-foreground shadow-sm"
    >
      {progress.saved + progress.failed < progress.total
        ? `Saving posters offline… ${progress.saved}/${progress.total}`
        : `${progress.failed} posters unavailable offline.`}
      {progress.failed > 0 && (
        <button
          type="button"
          className="ml-2 cursor-pointer underline underline-offset-4"
          onClick={() => setAttempt((value) => value + 1)}
        >
          Retry
        </button>
      )}
    </p>
  );
};
