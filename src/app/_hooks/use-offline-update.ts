'use client';

import { useEffect, useState } from 'react';

export const useOfflineUpdate = () => {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    let active = true;
    let registration: ServiceWorkerRegistration | undefined;
    let installing: ServiceWorker | null = null;
    const check = () => {
      if (active) {
        setWaiting(registration?.waiting ?? null);
      }
    };
    const watch = () => {
      installing?.removeEventListener('statechange', check);
      installing = registration?.installing ?? null;
      installing?.addEventListener('statechange', check);
      check();
    };
    const connect = async () => {
      registration = await navigator.serviceWorker.ready;
      if (!active) {
        return;
      }

      registration.addEventListener('updatefound', watch);
      watch();
    };
    void connect();
    navigator.serviceWorker.addEventListener('controllerchange', check);

    return () => {
      active = false;
      registration?.removeEventListener('updatefound', watch);
      installing?.removeEventListener('statechange', check);
      navigator.serviceWorker.removeEventListener('controllerchange', check);
    };
  }, []);

  const activate = async () => {
    if (!waiting) {
      return;
    }

    const changed = Promise.withResolvers<void>();
    const complete = () => changed.resolve();
    const timeout = setTimeout(
      () =>
        changed.reject(new Error('The update could not finish. Try again.')),
      10_000,
    );
    navigator.serviceWorker.addEventListener('controllerchange', complete);

    try {
      waiting.postMessage('ACTIVATE_UPDATE');
      await changed.promise;
    } finally {
      clearTimeout(timeout);
      navigator.serviceWorker.removeEventListener('controllerchange', complete);
    }
  };

  return { available: waiting !== null, activate };
};
