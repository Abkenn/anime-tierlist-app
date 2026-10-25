'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import type { TierItemActions } from '@/app/_lib/tier-item-actions-context';
import { useTierBoardActions } from './use-tier-board-actions';

// Stable commands avoid broadcasting pointer updates through context.
export const useTierItemActions = (
  actions: TierItemActions,
): TierItemActions => {
  const latest = useRef(actions);
  const { clearEditingItem } = useTierBoardActions();
  const [commands] = useState<TierItemActions>(() => ({
    boardRef: actions.boardRef,
    updateItem: (...args) => latest.current.updateItem(...args),
    start: (...args) => {
      clearEditingItem();
      latest.current.start(...args);
    },
    move: (...args) => latest.current.move(...args),
    drop: (...args) => latest.current.drop(...args),
    cancel: () => latest.current.cancel(),
    keyboardMove: (...args) => latest.current.keyboardMove(...args),
  }));

  useLayoutEffect(() => {
    latest.current = actions;
  }, [actions]);

  return commands;
};
