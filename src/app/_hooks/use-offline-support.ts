'use client';

import { useEffect } from 'react';
import { markOffline } from '@/app/_services/offline-mode';

const setupOfflineWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    if (process.env.NODE_ENV === 'development') {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const scriptURL = new URL('/sw.js', window.location.origin).href;
      const appRegistrations = registrations.filter((registration) => {
        const worker =
          registration.active ??
          registration.waiting ??
          registration.installing;

        return worker?.scriptURL === scriptURL;
      });

      await Promise.allSettled(
        appRegistrations.map((registration) => registration.unregister()),
      );

      return;
    }

    if (process.env.NODE_ENV === 'production' && window.isSecureContext) {
      await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('Offline homepage setup was unavailable.', error);
    }
  }
};

export const useOfflineSupport = () => {
  useEffect(() => {
    if (!navigator.onLine) {
      markOffline();
    }

    window.addEventListener('offline', markOffline);

    return () => window.removeEventListener('offline', markOffline);
  }, []);

  useEffect(() => {
    void setupOfflineWorker();
  }, []);
};
