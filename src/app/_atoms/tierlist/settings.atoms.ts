import { atom } from 'jotai/vanilla';
import { defaultTierRanks } from '@/app/_lib/tier-ranks';
import type {
  PosterSize,
  RankDetails,
  TierImageMode,
} from '@/app/_types/tierlist.types';
import { clearEditingItemAtom } from './interaction.atoms';

export const rankDetailsAtom = atom<RankDetails>({});
export const posterSizeAtom = atom<PosterSize>('dynamic');
export const imageModeAtom = atom<TierImageMode>('natural');
export const enabledTierRanksAtom = atom(defaultTierRanks);

export const changeImageModeAtom = atom(
  null,
  (_get, set, mode: TierImageMode) => {
    set(clearEditingItemAtom);
    set(imageModeAtom, mode);
  },
);
