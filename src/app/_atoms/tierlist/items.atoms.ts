import { atom } from 'jotai';
import { projectTierItems } from '@/app/_lib/tier-item-projection';
import type { TierItemData, TierRank } from '@/app/_types/tierlist.types';
import { draggedSearchItemAtom, searchDropSlotAtom } from './search.atoms';

export const tierItemsAtom = atom<TierItemData[]>([]);
export const availableRanksAtom = atom<TierRank[]>([]);
export const importedItemIdsAtom = atom(
  (get) => new Set(get(tierItemsAtom).map((item) => item.id)),
);
export const addTierItemAtom = atom(null, (get, set, item: TierItemData) => {
  const ranks = get(availableRanksAtom);
  const rank = ranks.includes(item.rank) ? item.rank : ranks[0];

  if (rank && !get(tierItemsAtom).some((existing) => existing.id === item.id)) {
    const added = { ...item, rank };
    set(tierItemsAtom, [...get(tierItemsAtom), added]);

    return added;
  }

  return null;
});

export const dropSearchItemAtom = atom(null, (get, set) => {
  const item = get(draggedSearchItemAtom);
  const slot = get(searchDropSlotAtom);
  const items = get(tierItemsAtom);

  if (
    item &&
    slot &&
    slot.id === item.id &&
    !items.some((existing) => existing.id === item.id)
  ) {
    set(
      tierItemsAtom,
      projectTierItems([...items, item], slot, get(availableRanksAtom)),
    );
  }
});

export const removeTierItemAtom = atom(null, (_get, set, id: string) => {
  set(tierItemsAtom, (items) => items.filter((item) => item.id !== id));
});
