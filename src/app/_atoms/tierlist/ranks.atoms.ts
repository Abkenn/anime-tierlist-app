import { atom } from 'jotai/vanilla';
import type { TierRank } from '@/app/_types/tierlist.types';
import { tierItemsAtom } from './items.atoms';
import { enabledTierRanksAtom, rankDetailsAtom } from './settings.atoms';

export const moveRankAtom = atom(
  null,
  (get, set, { rank, target }: { rank: TierRank; target: TierRank }) => {
    const ranks = [...get(enabledTierRanksAtom)];
    const from = ranks.indexOf(rank);
    const to = ranks.indexOf(target);
    if (from < 0 || to < 0 || from === to) {
      return;
    }

    ranks.splice(from, 1);
    ranks.splice(to, 0, rank);
    set(enabledTierRanksAtom, ranks);
  },
);

export const addRankAtom = atom(null, (get, set, before?: TierRank) => {
  const ranks = [...get(enabledTierRanksAtom)];
  const id: TierRank = `custom-${crypto.randomUUID()}`;
  const index = before ? ranks.indexOf(before) : ranks.length;
  ranks.splice(index < 0 ? ranks.length : index, 0, id);
  set(rankDetailsAtom, {
    ...get(rankDetailsAtom),
    [id]: { label: 'New tier', color: '#aaaaaa' },
  });
  set(enabledTierRanksAtom, ranks);
});

export const removeRankAtom = atom(null, (get, set, rank: TierRank) => {
  const ranks = get(enabledTierRanksAtom);
  const index = ranks.indexOf(rank);
  if (index < 0 || ranks.length === 1) {
    return;
  }

  const destination = ranks[index + 1] ?? ranks[index - 1];
  const items = get(tierItemsAtom);
  const moving = items
    .filter((item) => item.rank === rank)
    .map((item) => ({ ...item, rank: destination }));
  const remaining = items.filter((item) => item.rank !== rank);
  const first = remaining.findIndex((item) => item.rank === destination);
  remaining.splice(first < 0 ? remaining.length : first, 0, ...moving);
  set(tierItemsAtom, remaining);
  set(
    enabledTierRanksAtom,
    ranks.filter((id) => id !== rank),
  );
});
