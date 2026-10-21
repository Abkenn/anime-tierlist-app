'use client';

import { useEffect } from 'react';
import { OfflinePreview } from '@/app/_components/offline/offline-preview';
import { markOffline } from '@/app/_services/offline-mode';

export const OfflineFallback = () => {
  useEffect(markOffline, []);
  return <OfflinePreview />;
};
