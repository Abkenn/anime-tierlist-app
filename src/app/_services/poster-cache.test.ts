import { expect, it, vi } from 'vitest';
import { cacheTierlistPosters } from './poster-cache';

it('saves the entire poster list once and reuses saved responses on subsequent openings', async () => {
  const entries = new Map<string, Response>();
  vi.stubGlobal('caches', {
    open: async () => ({
      match: async (url: string) => entries.get(url),
      put: async (url: string, response: Response) => {
        entries.set(url, response);
      },
    }),
  });
  let active = 0;
  let peak = 0;
  const fetch = vi.fn(async () => {
    active += 1;
    peak = Math.max(peak, active);
    await Promise.resolve();
    active -= 1;
    return new Response('poster', {
      headers: { 'Content-Type': 'image/png' },
    });
  });
  vi.stubGlobal('fetch', fetch);
  const urls = Array.from(
    { length: 12 },
    (_, index) => `https://images.example/${index}.png`,
  );
  const progress = vi.fn();

  try {
    await cacheTierlistPosters(urls, new AbortController().signal, progress);
    await cacheTierlistPosters(urls, new AbortController().signal, progress);
    expect(fetch).toHaveBeenCalledTimes(12);
    expect(entries.size).toBe(12);
    expect(peak).toBe(1);
    expect(progress).toHaveBeenCalledTimes(2);
    expect(progress).toHaveBeenLastCalledWith({
      total: 12,
      saved: 12,
      failed: 0,
    });
  } finally {
    vi.unstubAllGlobals();
  }
});
