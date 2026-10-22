'use client';

import { createContext, type Dispatch } from 'react';
import type { TierBoardAction } from '@/app/_lib/tier-board-state';
import type { TierImageMode } from '@/app/_types/tierlist.types';

export const TierBoardSettingsContext = createContext<TierImageMode>('contain');
export const TierBoardActionsContext =
  createContext<Dispatch<TierBoardAction> | null>(null);
