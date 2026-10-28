import { createStore } from 'jotai/vanilla';
import { expect, it } from 'vitest';
import type { TierRank } from '@/app/_types/tierlist.types';
import { tierItemsAtom } from './items.atoms';
import { moveRankAtom, removeRankAtom } from './ranks.atoms';
import { enabledTierRanksAtom } from './settings.atoms';

it('reorders ranks without changing their posters or edits', () => {
  const store = createStore();
  store.set(enabledTierRanksAtom, ['S', 'A', 'Watching']);
  const items = [
    {
      id: 'poster',
      label: 'Poster',
      rank: 'Watching' as const,
      crop: { x: 0.2, y: 0.7 },
    },
  ];
  store.set(tierItemsAtom, items);
  store.set(moveRankAtom, { rank: 'Watching', target: 'S' });
  expect(store.get(enabledTierRanksAtom)).toEqual(['Watching', 'S', 'A']);
  expect(store.get(tierItemsAtom)).toBe(items);
});

it('moves deleted tier posters to the beginning of the next tier and preserves a final tier', () => {
  const store = createStore();
  store.set(enabledTierRanksAtom, ['S', 'A', 'Watching']);
  store.set(tierItemsAtom, [
    { id: 'first', label: 'First', rank: 'S', crop: { x: 0.2, y: 0.7 } },
    { id: 'second', label: 'Second', rank: 'S' },
    { id: 'existing', label: 'Existing', rank: 'A' },
  ]);
  store.set(removeRankAtom, 'S');
  expect(store.get(tierItemsAtom).map((item) => item.id)).toEqual([
    'first',
    'second',
    'existing',
  ]);
  expect(store.get(tierItemsAtom)[0]).toMatchObject({
    rank: 'A',
    crop: { x: 0.2, y: 0.7 },
  });
  store.set(removeRankAtom, 'Watching');
  store.set(removeRankAtom, 'A');
  expect(store.get(enabledTierRanksAtom)).toEqual(['A']);
  expect(store.get(tierItemsAtom)).toHaveLength(3);
});

it('does not publish an atom change for a rank dropped in the same place', () => {
  const store = createStore();
  const ranks: TierRank[] = ['S', 'A', 'Watching'];
  store.set(enabledTierRanksAtom, ranks);
  let changes = 0;
  const unsubscribe = store.sub(enabledTierRanksAtom, () => {
    changes += 1;
  });
  store.set(moveRankAtom, { rank: 'A', target: 'A' });
  expect(store.get(enabledTierRanksAtom)).toBe(ranks);
  expect(changes).toBe(0);
  unsubscribe();
});
