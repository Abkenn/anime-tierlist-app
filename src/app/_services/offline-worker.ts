/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_PREFIX = 'tierlist-home-';
const CACHE_NAME = `${CACHE_PREFIX}__OFFLINE_BUILD__`;
const buildAsset = (
  value: string,
  base = self.location.origin,
): string | null => {
  const url = new URL(value, base);
  return url.origin === self.location.origin &&
    url.pathname.startsWith('/_next/static/')
    ? url.href
    : null;
};

const cacheOfflineHomepage = async () => {
  const cache = await caches.open(CACHE_NAME);
  const homepage = await fetch('/offline', {
    cache: 'reload',
    redirect: 'error',
  });
  if (
    !homepage.ok ||
    !homepage.headers.get('Content-Type')?.includes('text/html')
  )
    throw new Error('The public offline homepage could not be downloaded.');
  const html = await homepage.clone().text();
  const assets = new Set<string>();
  for (const match of html.matchAll(/(?:src|href)="([^"<>]+)"/g)) {
    const asset = buildAsset(match[1].replaceAll('&amp;', '&'));
    if (asset) assets.add(asset);
  }
  if (![...assets].some((asset) => new URL(asset).pathname.endsWith('.js')))
    throw new Error('Offline homepage JavaScript was not found.');
  await cache.addAll(
    [...assets].map((url) => new Request(url, { cache: 'reload' })),
  );
  const fonts = new Set<string>();
  for (const asset of assets) {
    if (!new URL(asset).pathname.endsWith('.css')) continue;
    const response = await cache.match(asset);
    if (!response) throw new Error('Offline stylesheet was not saved.');
    for (const match of (await response.text()).matchAll(
      /url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g,
    )) {
      const font = buildAsset(match[1], asset);
      if (font) fonts.add(font);
    }
  }
  await cache.addAll(
    ['/icon.svg', ...fonts].map((url) => new Request(url, { cache: 'reload' })),
  );
  await cache.put('/offline', homepage);
};

// Waiting for old tabs to close prevents mixing chunks from different builds.
self.addEventListener('install', (event) => {
  event.waitUntil(cacheOfflineHomepage());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(
            (name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME,
          )
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

const offlineNavigation = async (request: Request) => {
  const url = new URL(request.url);
  if (!url.searchParams.has('offline')) {
    url.searchParams.set('offline', '');
    return Response.redirect(
      url.href.replace(/([?&])offline=(?=&|#|$)/, '$1offline'),
      302,
    );
  }
  return savedHomepage();
};

const savedHomepage = async () => {
  const cache = await caches.open(CACHE_NAME);
  return (
    (await cache.match('/offline')) ??
    new Response(
      'The offline homepage is not saved on this device. Reconnect and reload.',
      { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
    )
  );
};

const homeNavigation = async (request: Request) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(request, { signal: controller.signal });
    if (response.status >= 500 || response.status === 408)
      return offlineNavigation(request);
    return response;
  } catch {
    return offlineNavigation(request);
  } finally {
    clearTimeout(timeout);
  }
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (
    request.mode === 'navigate' &&
    (url.pathname === '/' || url.pathname === '/offline')
  ) {
    event.respondWith(homeNavigation(request));
    return;
  }

  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname === '/icon.svg'
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        return (
          (await cache.match(request, { ignoreSearch: true })) ?? fetch(request)
        );
      })(),
    );
  }
});

export {};
