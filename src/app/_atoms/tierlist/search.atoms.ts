import { atom } from 'jotai';
import type {
  AnimeSearchSeed,
  CuratedAnimeImage,
} from '@/app/_types/anime-search.types';
import type { TierItemData } from '@/app/_types/tierlist.types';

export const draggedSearchItemAtom = atom<TierItemData | null>(null);
export const searchDragPointAtom = atom<{ x: number; y: number } | null>(null);
export const searchDropSlotAtom = atom<
  import('@/app/_lib/tier-item-projection').TierDropSlot | null
>(null);

export type AnimeSearchConfig = AnimeSearchSeed & {
  curatedImages: CuratedAnimeImage[];
  catalogSearchEnabled?: boolean;
};

export const animeSearchConfigAtom = atom<AnimeSearchConfig>({
  curatedImages: [],
});
