export const posterCacheName = 'tierlist-posters-v1';
export type PosterCacheProgress = {
  total: number;
  saved: number;
  failed: number;
};

export const cacheTierlistPosters = async (
  urls: string[],
  signal: AbortSignal,
  publish: (progress: PosterCacheProgress) => void,
) => {
  const run = async () => {
    const cache = await caches.open(posterCacheName);
    const progress = { total: urls.length, saved: 0, failed: 0 };
    let index = 0;
    let lastPublished = 0;
    const worker = async () => {
      while (!signal.aborted && index < urls.length) {
        const source = urls[index++];
        try {
          const url = new URL(source, window.location.origin);
          if (!['http:', 'https:'].includes(url.protocol)) {
            throw new Error('Unsupported poster URL');
          }
          if (!(await cache.match(url.href, { ignoreVary: true }))) {
            let response: Response;
            try {
              response = await fetch(url, {
                mode: 'cors',
                credentials: 'omit',
                priority: 'low',
                signal,
              });
            } catch (error) {
              if (signal.aborted) {
                throw error;
              }
              response = await fetch(url, {
                mode: 'no-cors',
                credentials: 'omit',
                priority: 'low',
                signal,
              });
            }
            if (!response.ok && response.type !== 'opaque') {
              throw new Error('Poster unavailable');
            }
            await cache.put(url.href, response);
          }
          progress.saved += 1;
        } catch {
          if (signal.aborted) {
            return;
          }
          progress.failed += 1;
        }
        const now = performance.now();
        if (
          !signal.aborted &&
          (progress.saved + progress.failed === progress.total ||
            now - lastPublished >= 100)
        ) {
          lastPublished = now;
          publish({ ...progress });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, urls.length) }, worker));
  };

  if (navigator.locks) {
    await navigator.locks.request('tierlist-poster-cache', { signal }, run);
  } else {
    await run();
  }
};
