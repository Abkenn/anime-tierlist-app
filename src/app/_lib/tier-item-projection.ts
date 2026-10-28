import type {
  TierItemData as Item,
  TierRank,
} from '@/app/_types/tierlist.types';
export type TierDropSlot = { id: string; rank: TierRank; index: number };
type DropSlot = TierDropSlot;

const getVisibleRank = (item: Item, ranks: TierRank[]) =>
  ranks.includes(item.rank) ? item.rank : ranks[0];

export const projectTierItems = (
  items: Item[],
  dropSlot: DropSlot,
  ranks: TierRank[],
): Item[] => {
  const item = items.find((value) => value.id === dropSlot.id);

  if (!item) {
    return items;
  }

  const siblingsBefore = items.filter(
    (value) => getVisibleRank(value, ranks) === dropSlot.rank,
  );
  const currentIndex = siblingsBefore.findIndex(
    (value) => value.id === item.id,
  );
  if (
    item.rank === dropSlot.rank &&
    currentIndex === Math.min(dropSlot.index, siblingsBefore.length - 1)
  ) {
    return items;
  }

  const remaining = items.filter((value) => value.id !== item.id);
  const siblings = remaining.filter(
    (value) => getVisibleRank(value, ranks) === dropSlot.rank,
  );
  const next = siblings[dropSlot.index];
  const previous = siblings.at(-1);
  let insertion = remaining.length;

  if (previous) {
    insertion = remaining.indexOf(previous) + 1;
  }

  if (next) {
    insertion = remaining.indexOf(next);
  }

  return [
    ...remaining.slice(0, insertion),
    { ...item, rank: dropSlot.rank },
    ...remaining.slice(insertion),
  ];
};
