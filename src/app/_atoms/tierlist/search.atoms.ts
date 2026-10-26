import { QueryClient } from '@tanstack/react-query';
import { atom } from 'jotai';
import type {
  AnimeSearchSeed,
  CuratedAnimeImage,
} from '@/app/_types/anime-search.types';
import type { TierItemData, TierRank } from '@/app/_types/tierlist.types';
import { enabledTierRanksAtom, rankDetailsAtom } from './settings.atoms';

export const animeSearchClientAtom = atom(() => new QueryClient());
export const searchTargetRankAtom = atom<TierRank | null>(null);
export const searchDestinationAtom = atom((get) => {
  const ranks = get(enabledTierRanksAtom);
  const target = get(searchTargetRankAtom);
  const fallback = ranks.includes('Watching') ? 'Watching' : ranks[0];
  const rank = target && ranks.includes(target) ? target : fallback;

  return { rank, label: get(rankDetailsAtom)[rank]?.label ?? rank };
});

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
