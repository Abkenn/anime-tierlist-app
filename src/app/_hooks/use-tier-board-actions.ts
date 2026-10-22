'use client';

import { use } from 'react';
import { TierBoardActionsContext } from '@/app/_providers/tier-board-context';

export const useTierBoardActions = () => {
  const dispatch = use(TierBoardActionsContext);

  if (!dispatch) {
    throw new Error(
      'Tier board actions require a TierBoardActionsContext provider.',
    );
  }

  return dispatch;
};
