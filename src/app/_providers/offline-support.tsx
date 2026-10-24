'use client';

import { useEffect } from 'react';
import { markOffline } from '@/app/_services/offline-mode';

export const OfflineSupport = () => {
  useEffect(() => {
    if (!navigator.onLine) {
      markOffline();
    }

    window.addEventListener('offline', markOffline);

    return () => window.removeEventListener('offline', markOffline);
  }, []);

  useEffect(() => {
    if (
      process.env.NODE_ENV === 'development' &&
      'serviceWorker' in navigator
    ) {
      // A production worker on localhost can serve stale offline builds while
      // Next dev is compiling. Remove only this app's worker during development.
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(
            registrations
              .filter((registration) => {
                const worker =
                  registration.active ??
                  registration.waiting ??
                  registration.installing;

                return (
                  worker?.scriptURL ===
                  new URL('/sw.js', window.location.origin).href
                );
              })
              .map((registration) => registration.unregister()),
          ),
        )
        .catch(() => {});
      return;
    }

    if (
      process.env.NODE_ENV !== 'production' ||
      !('serviceWorker' in navigator) ||
      !window.isSecureContext
    ) {
      return;
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch((error: unknown) => {
        console.warn('Offline homepage setup was unavailable.', error);
      });
  }, []);

  return null;
};
