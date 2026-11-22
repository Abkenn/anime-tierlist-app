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
  const urls = Array.from({ length: 12 }, (_, index) => `https://images.example/${index}.png`);
  urls.push('/curated/86.jpg');
  const progress = vi.fn();

  try {
    await cacheTierlistPosters(urls, new AbortController().signal, progress);
    await cacheTierlistPosters(urls, new AbortController().signal, progress);
    expect(fetch).toHaveBeenCalledTimes(15);
    expect(entries.size).toBe(15);
    expect(entries.has(new URL('/curated/86.jpg', window.location.origin).href)).toBe(true);
    expect([...entries.keys()].some((url) => url.includes('/_next/image?'))).toBe(true);
    expect(peak).toBe(1);
    expect(progress).toHaveBeenCalledTimes(2);
    expect(progress).toHaveBeenLastCalledWith({
      total: 15,
      saved: 15,
      failed: 0,
    });
  } finally {
    vi.unstubAllGlobals();
  }
});

it('downloads display thumbnails before full-resolution originals', async () => {
  vi.stubGlobal('caches', {
    open: async () => ({ match: async () => undefined, put: async () => {} }),
  });
  const urls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: URL) => {
      urls.push(url.pathname);
      return new Response('poster');
    }),
  );
  try {
    await cacheTierlistPosters(
      ['/curated/a.jpg', '/curated/b.jpg'],
      new AbortController().signal,
      vi.fn(),
    );
    expect(urls).toEqual([
      '/_next/image',
      '/_next/image',
      '/_next/image',
      '/_next/image',
      '/curated/a.jpg',
      '/curated/b.jpg',
    ]);
  } finally {
    vi.unstubAllGlobals();
  }
});
