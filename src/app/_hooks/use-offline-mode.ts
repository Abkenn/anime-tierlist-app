'use client';

import { useSearchParams } from 'next/navigation';
import { getOfflineMode } from '@/app/_services/offline-mode';

export const useOfflineMode = () => getOfflineMode(useSearchParams());
