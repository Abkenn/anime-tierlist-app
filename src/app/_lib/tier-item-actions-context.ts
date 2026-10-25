'use client';

import { createContext } from 'react';
import type { useTierItems } from '@/app/_hooks/use-tier-items';

export type TierItemActions = Pick<
  ReturnType<typeof useTierItems>,
  | 'boardRef'
  | 'updateItem'
  | 'start'
  | 'move'
  | 'drop'
  | 'cancel'
  | 'keyboardMove'
>;

export const TierItemActionsContext = createContext<TierItemActions | null>(
  null,
);
