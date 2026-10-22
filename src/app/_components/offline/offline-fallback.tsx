'use client';

import { useEffect } from 'react';
import { TierBoard } from '@/app/_components/tierlist/tier-board';
import { markOffline } from '@/app/_services/offline-mode';

export const OfflineFallback = () => {
  useEffect(markOffline, []);

  return <TierBoard />;
};
