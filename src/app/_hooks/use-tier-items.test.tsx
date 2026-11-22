import { act, renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import type { PropsWithChildren } from 'react';
import { expect, it } from 'vitest';
import {
  lockFeedbackAtom,
  positionsLockedAtom,
  tierDragRegionAtom,
} from '@/app/_atoms/tierlist/interaction.atoms';
import { tierItemsAtom } from '@/app/_atoms/tierlist/items.atoms';
import { useTierItems } from './use-tier-items';

it('keeps the restoring shell stable while no row geometry is available', () => {
  const store = createStore();
  const { result, rerender } = renderHook(
    () => useTierItems({ restoring: true, ranks: ['A'], initialItemCount: 0 }),
    {
      wrapper: ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>,
    },
  );
  rerender();
  expect(result.current.items).toEqual([]);
  expect(result.current.lines('A')).toBe(1);
});

it('blocks keyboard movement, drag start and discard while locked, then unlocks', () => {
  const store = createStore();
  store.set(positionsLockedAtom, true);
  const { result } = renderHook(
    () =>
      useTierItems({
        ranks: ['A', 'B'],
        initialItems: [{ id: 'poster', label: 'Anime', rank: 'A' }],
      }),
    { wrapper: ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider> },
  );
  act(() => result.current.keyboardMove('poster', { axis: 'row', direction: 1 }));
  expect(store.get(tierItemsAtom)[0].rank).toBe('A');
  expect(store.get(lockFeedbackAtom)).toBe(1);
  act(() => result.current.start('poster', 0, 0));
  expect(result.current.draggingId).toBeNull();
  act(() => result.current.drop('poster', 0, 0));
  expect(store.get(tierItemsAtom)).toHaveLength(1);
  act(() => store.set(positionsLockedAtom, false));
  act(() => result.current.keyboardMove('poster', { axis: 'row', direction: 1 }));
  expect(store.get(tierItemsAtom)[0].rank).toBe('B');
});

it('cancels drops above the board and discards only inside the marked zone', () => {
  const store = createStore();
  const { result, unmount } = renderHook(
    () =>
      useTierItems({
        ranks: ['Watching'],
        initialItems: [{ id: 'poster', label: 'Anime', rank: 'Watching' }],
      }),
    {
      wrapper: ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>,
    },
  );
  const board = document.createElement('div');
  board.getBoundingClientRect = () => new DOMRect(300, 150, 700, 600);
  result.current.boardRef.current = board;
  const zone = document.createElement('div');
  zone.dataset.tierDiscard = '';
  zone.getBoundingClientRect = () => new DOMRect(0, 150, 260, 600);
  document.body.append(zone);

  try {
    act(() => result.current.move('poster', 500, 100));
    expect(store.get(tierDragRegionAtom)).toBe('board');
    act(() => result.current.drop('poster', 500, 100));
    expect(store.get(tierItemsAtom).map((item) => item.id)).toEqual(['poster']);

    act(() => result.current.move('poster', 100, 300));
    expect(store.get(tierDragRegionAtom)).toBe('discard');
    act(() => result.current.drop('poster', 100, 300));
    expect(store.get(tierItemsAtom)).toEqual([]);
  } finally {
    zone.remove();
    unmount();
  }
});
