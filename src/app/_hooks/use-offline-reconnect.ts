'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useOfflineMode } from '@/app/_hooks/use-offline-mode';
import {
  OFFLINE_POLL_INTERVAL_MS,
  OFFLINE_RECONNECT_EVENT,
  OFFLINE_RECOVERED_EVENT,
  withOfflineMode,
} from '@/app/_services/offline-mode';

export const useOfflineReconnect = () => {
  const router = useRouter();
  const mode = useOfflineMode();
  const [checking, setChecking] = useState(false);
  const [retryAt, setRetryAt] = useState<number>();
  const [transitioning, startTransition] = useTransition();
  const controller = useRef<AbortController | null>(null);
  const refreshAfterNavigation = useRef(false);

  const reconnect = useCallback(async () => {
    if (controller.current) {
      return;
    }

    setChecking(true);
    setRetryAt(undefined);

    const request = new AbortController();

    controller.current = request;

    const timeout = window.setTimeout(() => request.abort(), 5000);
    let recovered = false;

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
      recovered = true;

      const href = withOfflineMode(new URL(window.location.href), null);

      startTransition(() =>
        router.replace(href, { scroll: false, transitionTypes: ['reconnect'] }),
      );
    } catch {
    } finally {
      window.clearTimeout(timeout);

      const currentRequest = controller.current === request;

      if (currentRequest) {
        controller.current = null;
        setChecking(false);
      }

      if (currentRequest && !recovered && mode !== 'dev') {
        setRetryAt(Date.now() + OFFLINE_POLL_INTERVAL_MS);
      }
    }
  }, [router, mode]);

  useEffect(() => {
    if (mode === null && refreshAfterNavigation.current) {
      refreshAfterNavigation.current = false;
      startTransition(() => router.refresh());
      window.dispatchEvent(new Event(OFFLINE_RECOVERED_EVENT));
    }
  }, [mode, router]);

  useEffect(() => {
    if (mode === null) {
      setRetryAt(undefined);

      return;
    }

    const retry = () => {
      void reconnect();
    };

    window.addEventListener(OFFLINE_RECONNECT_EVENT, retry);

    if (mode !== 'dev') {
      window.addEventListener('online', retry);

      if (mode === 'dev-temporary') {
        setRetryAt(Date.now() + OFFLINE_POLL_INTERVAL_MS);
      } else {
        retry();
      }
    }

    return () => {
      window.removeEventListener('online', retry);
      window.removeEventListener(OFFLINE_RECONNECT_EVENT, retry);
      const request = controller.current;
      controller.current = null;
      request?.abort();
    };
  }, [mode, reconnect]);

  useEffect(() => {
    if (!retryAt || mode === null || mode === 'dev') {
      return;
    }

    const timer = window.setTimeout(
      () => void reconnect(),
      Math.max(0, retryAt - Date.now()),
    );

    return () => window.clearTimeout(timer);
  }, [retryAt, mode, reconnect]);

  return { mode, checking: checking || transitioning, reconnect, retryAt };
};
