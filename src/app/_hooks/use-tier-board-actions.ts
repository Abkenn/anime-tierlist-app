'use client';

import { useSetAtom } from 'jotai';
import {
  clearEditingItemAtom,
  keyboardModeAtom,
  setEditingItemAtom,
} from '@/app/_atoms/tierlist/interaction.atoms';

export const useTierBoardActions = () => {
  const setKeyboardMode = useSetAtom(keyboardModeAtom);
  const setEditingItem = useSetAtom(setEditingItemAtom);
  const clearEditingItem = useSetAtom(clearEditingItemAtom);

  return { setKeyboardMode, setEditingItem, clearEditingItem };
};
