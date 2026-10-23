'use client';

import { useAtomValue } from 'jotai';
import { useLayoutEffect, useRef, useState } from 'react';
import {
  draggedSearchItemAtom,
  searchDragPointAtom,
} from '@/app/_atoms/tierlist/search.atoms';
import type { AnimeSearchResult } from '@/app/_types/anime-search.types';

type Slot = { id: string; page: string; rect: DOMRect };

export const useSearchDisplacement = (results: AnimeSearchResult[]) => {
  const dragged = useAtomValue(draggedSearchItemAtom);
  const point = useAtomValue(searchDragPointAtom);
  const gridRef = useRef<HTMLDivElement>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const bounds = gridRef.current?.getBoundingClientRect();
  const source = slots.find((slot) => slot.id === dragged?.id);
  const inside =
    point &&
    bounds &&
    point.x >= bounds.left &&
    point.x <= bounds.right &&
    point.y >= bounds.top &&
    point.y <= bounds.bottom;
  const candidates = slots;
  const target =
    inside && point
      ? candidates.reduce<Slot | undefined>((closest, slot) => {
          const distance = (entry: Slot) =>
            Math.hypot(
              point.x -
                (bounds?.left ?? 0) -
                entry.rect.left -
                entry.rect.width / 2,
              point.y -
                (bounds?.top ?? 0) -
                entry.rect.top -
                entry.rect.height / 2,
            );

          return !closest || distance(slot) < distance(closest)
            ? slot
            : closest;
        }, undefined)
      : undefined;
  const order =
    dragged && slots.length
      ? slots.map((slot) => slot.id)
      : results.map((result) => result.id);
  const from = order.indexOf(dragged?.id ?? '');
  const to =
    target?.page === source?.page ? order.indexOf(target?.id ?? '') : -1;
  const displaced = [...order];

  if (from >= 0 && to >= 0 && from !== to) {
    displaced.splice(from, 1);
    displaced.splice(to, 0, order[from]);
  }

  const visible = displaced.flatMap((id) => {
    const result = results.find((entry) => entry.id === id);

    return result ? [result] : [];
  });

  useLayoutEffect(() => {
    if (!dragged?.id) {
      setSlots([]);
      return;
    }
    const nodes = gridRef.current?.querySelectorAll<HTMLElement>(
      '[data-search-result]',
    );
    setSlots(
      [...(nodes ?? [])].map((node) => ({
        id: node.dataset.searchResult ?? '',
        page: node.dataset.searchPage ?? '',
        rect: new DOMRect(
          node.getBoundingClientRect().left -
            (gridRef.current?.getBoundingClientRect().left ?? 0),
          node.getBoundingClientRect().top -
            (gridRef.current?.getBoundingClientRect().top ?? 0),
          node.offsetWidth,
          node.offsetHeight,
        ),
      })),
    );
  }, [dragged?.id]);

  return { gridRef, results: visible, draggedId: dragged?.id };
};
