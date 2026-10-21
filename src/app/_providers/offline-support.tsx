'use client';

import { useEffect } from 'react';
import { markOffline } from '@/app/_services/offline-mode';

export const OfflineSupport = () => {
  useEffect(() => {
    if (!navigator.onLine) markOffline();
    window.addEventListener('offline', markOffline);
    return () => window.removeEventListener('offline', markOffline);
  }, []);
  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' ||
      !('serviceWorker' in navigator) ||
      !window.isSecureContext
    )
      return;
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch((error: unknown) => {
        console.warn('Offline homepage setup was unavailable.', error);
      });
  }, []);

  return null;
};
