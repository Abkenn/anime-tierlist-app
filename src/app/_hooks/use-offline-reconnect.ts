'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useOfflineMode } from '@/app/_hooks/use-offline-mode';
import {
  OFFLINE_POLL_INTERVAL_MS,
  OFFLINE_RECONNECT_EVENT,
  withOfflineMode,
} from '@/app/_services/offline-mode';

export const useOfflineReconnect = () => {
  const router = useRouter();
  const mode = useOfflineMode();
  const [checking, setChecking] = useState(false);
  const [transitioning, startTransition] = useTransition();
  const inFlight = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const refreshAfterNavigation = useRef(false);

  const reconnect = useCallback(async () => {
    if (inFlight.current) {
      return;
    }

    inFlight.current = true;
    setChecking(true);

    const request = new AbortController();

    controller.current = request;

    const timeout = window.setTimeout(() => request.abort(), 5000);

    try {
      const response = await fetch('/api/connection', {
        cache: 'no-store',
        redirect: 'error',
        signal: request.signal,
      });

      if (
        request.signal.aborted ||
        response.status !== 200 ||
        response.headers.get('X-Tierlist-Connection') !== 'online'
      ) {
        return;
      }

      refreshAfterNavigation.current = true;

      const href = withOfflineMode(new URL(window.location.href), null);

      startTransition(() =>
        router.replace(href, { scroll: false, transitionTypes: ['reconnect'] }),
      );
    } catch {
    } finally {
      window.clearTimeout(timeout);

      if (controller.current === request) {
        controller.current = null;
      }

      inFlight.current = false;
      setChecking(false);
    }
  }, [router]);

  useEffect(() => {
    if (mode === null && refreshAfterNavigation.current) {
      refreshAfterNavigation.current = false;
      startTransition(() => router.refresh());
    }
  }, [mode, router]);

  useEffect(() => {
    if (mode === null) {
      return;
    }

    const retry = () => {
      void reconnect();
    };

    window.addEventListener(OFFLINE_RECONNECT_EVENT, retry);

    const interval =
      mode === 'dev'
        ? undefined
        : window.setInterval(retry, OFFLINE_POLL_INTERVAL_MS);

    if (mode !== 'dev') {
      window.addEventListener('online', retry);
    }

    return () => {
      if (interval !== undefined) {
        window.clearInterval(interval);
      }

      window.removeEventListener('online', retry);
      window.removeEventListener(OFFLINE_RECONNECT_EVENT, retry);
      controller.current?.abort();
    };
  }, [mode, reconnect]);

  return { mode, checking: checking || transitioning, reconnect };
};
