import type { OfflineMode } from '@/app/_types/offline.types';

export const OFFLINE_RECONNECT_EVENT = 'tierlist:reconnect';
export const OFFLINE_POLL_INTERVAL_MS = 30_000;

export const getOfflineMode = (
  params: Pick<URLSearchParams, 'get' | 'has'>,
): OfflineMode => {
  if (!params.has('offline')) {
    return null;
  }

  const value = params.get('offline');

  if (value === 'dev' || value === 'dev-temporary') {
    return value;
  }

  return 'offline';
};

export const withOfflineMode = (url: URL, mode: OfflineMode) => {
  if (mode === null) {
    url.searchParams.delete('offline');
  } else {
    url.searchParams.set('offline', mode === 'offline' ? '' : mode);
  }

  const search = url.search.replace(/([?&])offline=(?=&|$)/, '$1offline');

  return url.pathname + search + url.hash;
};

export const markOffline = () => {
  const url = new URL(window.location.href);

  if (!url.searchParams.has('offline')) {
    window.history.replaceState(null, '', withOfflineMode(url, 'offline'));
  }
};
