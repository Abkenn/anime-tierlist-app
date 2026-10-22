import { atom } from 'jotai/vanilla';
import type { TierImageMode } from '@/app/_types/tierlist.types';
import { clearEditingItemAtom } from './interaction.atoms';

export const imageModeAtom = atom<TierImageMode>('contain');

export const changeImageModeAtom = atom(
  null,
  (_get, set, mode: TierImageMode) => {
    set(clearEditingItemAtom);
    set(imageModeAtom, mode);
  },
);
