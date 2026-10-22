'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { TierKeyboardMove, TierRank } from '@/app/_types/tierlist.types';

export type TierItemPosition = {
  x: string;
  y: string;
  width: string;
  height: string;
};
type Item = { id: string; label: string; rank: TierRank };
type Row = { rank: TierRank; x: number; y: number; size: number };
type DropSlot = { id: string; rank: TierRank; index: number };

const itemGapRem = 0.125;

const getVisibleRank = (item: Item, ranks: TierRank[]) =>
  ranks.includes(item.rank) ? item.rank : ranks[0];

const projectItems = (
  items: Item[],
  dropSlot: DropSlot,
  ranks: TierRank[],
): Item[] => {
  const item = items.find((value) => value.id === dropSlot.id);

  if (!item) {
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

export const useTierItems = (
  ranks: TierRank[],
  initialItemCount = 2,
  wrapItems = false,
) => {
  const viewportRef = useRef<HTMLElement>(null);
  const [viewportWidth, setViewportWidth] = useState(344);
  const boardRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<Item[]>(() =>
    Array.from({ length: initialItemCount }, (_, index) => ({
      id: `tier-item-${index + 1}`,
      label: String(index + 1),
      rank: 'S+',
    })),
  );
  const [rows, setRows] = useState<Row[]>([]);
  const [slot, setSlot] = useState<DropSlot | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const rem = useRef(16);

  const rankKey = ranks.join(',');
  const previewItems = slot ? projectItems(items, slot, ranks) : items;
  const previewItem = slot
    ? previewItems.find((item) => item.id === slot.id)
    : undefined;

  const largestRank = Math.max(
    0,
    ...ranks.map(
      (rank) =>
        previewItems.filter((item) => getVisibleRank(item, ranks) === rank)
          .length,
    ),
  );
  const visibleColumns = Math.max(
    1,
    Math.floor(
      (viewportWidth / rem.current - 4.5 - itemGapRem) / (3.75 + itemGapRem),
    ),
  );
  const columns = Math.max(visibleColumns, Math.ceil(largestRank / 2));

  const measure = useCallback((): Row[] => {
    const board = boardRef.current;

    if (!board) {
      return [];
    }

    rem.current = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize,
    );

    const bounds = board.getBoundingClientRect();

    return Array.from(
      board.querySelectorAll<HTMLElement>('[data-tier-rank]'),
    ).map((row) => {
      const cells = row.lastElementChild?.getBoundingClientRect();
      const rect = row.getBoundingClientRect();

      return {
        rank: row.dataset.tierRank as TierRank,
        x: (cells?.left ?? rect.left) - bounds.left,
        y: (cells?.top ?? rect.top) - bounds.top,
        size: wrapItems
          ? rem.current * 3.75
          : Math.max(
              0,
              (cells?.height ?? rect.height) - rem.current * itemGapRem * 2,
            ),
      };
    });
  }, [wrapItems]);

  const visibleRank = (item: Item) => getVisibleRank(item, ranks);

  const positionFor = (
    item: Item,
    currentItems: Item[],
    currentRows: Row[],
  ): TierItemPosition | null => {
    const rank = visibleRank(item);
    const row = currentRows.find((value) => value.rank === rank);

    if (!row) {
      return null;
    }

    const index = currentItems.findIndex((value) => value.id === item.id);
    const column = currentItems
      .slice(0, index)
      .filter((other) => visibleRank(other) === rank).length;

    const columnIndex = wrapItems ? column % columns : column;
    const lineIndex = wrapItems ? Math.floor(column / columns) : 0;

    return {
      x: `${String(row.x / rem.current + itemGapRem + columnIndex * (row.size / rem.current + itemGapRem))}rem`,
      y: `${String(row.y / rem.current + itemGapRem + lineIndex * (row.size / rem.current + itemGapRem))}rem`,
      width: `${String(row.size / rem.current)}rem`,
      height: `${String(row.size / rem.current)}rem`,
    };
  };

  const slotAt = (
    id: string,
    clientX: number,
    clientY: number,
  ): DropSlot | null => {
    const board = boardRef.current;
    const candidates = Array.from(
      board?.querySelectorAll<HTMLElement>('[data-tier-rank]') ?? [],
    );
    const first = candidates[0];
    const last = candidates.at(-1);

    if (!board || !first || !last) {
      return null;
    }

    const hit =
      candidates.find((row) => {
        const rect = row.getBoundingClientRect();

        return clientY >= rect.top && clientY < rect.bottom;
      }) ?? (clientY < first.getBoundingClientRect().top ? first : last);
    const rank = hit.dataset.tierRank as TierRank;
    const row = measure().find((value) => value.rank === rank);

    if (!row) {
      return null;
    }

    const count = items.filter(
      (item) => item.id !== id && visibleRank(item) === rank,
    ).length;
    const x =
      clientX -
      board.getBoundingClientRect().left -
      row.x -
      rem.current * itemGapRem;
    const line = wrapItems
      ? Math.max(
          0,
          Math.min(
            1,
            Math.floor(
              (clientY - board.getBoundingClientRect().top - row.y) /
                (row.size + rem.current * itemGapRem),
            ),
          ),
        )
      : 0;
    const index = Math.max(
      0,
      Math.min(
        count,
        line * columns +
          Math.floor(
            (x + (rem.current * itemGapRem) / 2) /
              (row.size + rem.current * itemGapRem) +
              0.5,
          ),
      ),
    );

    return { id, rank, index };
  };

  const hover = (id: string, clientX: number, clientY: number) => {
    const next = slotAt(id, clientX, clientY);

    setSlot((current) =>
      current?.id === next?.id &&
      current?.rank === next?.rank &&
      current?.index === next?.index
        ? current
        : next,
    );
  };

  const commit = (next: DropSlot) => {
    const nextItems = projectItems(items, next, ranks);
    const item = nextItems.find((value) => value.id === next.id);

    setItems(nextItems);
    setSlot(null);

    if (item) {
      setAnnouncement(
        `Item ${item.label} moved to ${next.rank}, position ${next.index + 1}`,
      );
    }

    return item ? positionFor(item, nextItems, measure()) : null;
  };

  const keyboardMove = (id: string, { axis, direction }: TierKeyboardMove) => {
    const item = items.find((value) => value.id === id);

    if (!item || !ranks.length) {
      return;
    }

    const rank = visibleRank(item);

    if (axis === 'column') {
      const siblings = items.filter((value) => visibleRank(value) === rank);
      const current = siblings.findIndex((value) => value.id === id);
      const index = Math.max(
        0,
        Math.min(siblings.length - 1, current + direction),
      );

      if (index !== current) {
        commit({ id, rank, index });
      }

      return;
    }

    const next =
      ranks[
        Math.max(0, Math.min(ranks.length - 1, ranks.indexOf(rank) + direction))
      ];

    if (next && next !== rank) {
      commit({
        id,
        rank: next,
        index: items.filter(
          (value) => value.id !== id && visibleRank(value) === next,
        ).length,
      });
    }
  };

  useLayoutEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport || !wrapItems) {
      return;
    }

    const update = () => setViewportWidth(viewport.clientWidth);
    const observer = new ResizeObserver(update);

    update();
    observer.observe(viewport);

    return () => observer.disconnect();
  }, [wrapItems]);

  useLayoutEffect(() => {
    const board = boardRef.current;

    if (!board || !rankKey) {
      setRows([]);

      return;
    }

    const update = () => setRows(measure());

    update();

    const observer = new ResizeObserver(update);

    observer.observe(board);
    board.querySelectorAll('[data-tier-rank]').forEach((row) => {
      observer.observe(row);
    });

    return () => observer.disconnect();
  }, [rankKey, measure]);

  return {
    boardRef,
    viewportRef,
    columns,
    lines: (rank: TierRank) =>
      wrapItems
        ? Math.min(
            2,
            Math.max(
              1,
              Math.ceil(
                previewItems.filter(
                  (item) => getVisibleRank(item, ranks) === rank,
                ).length / columns,
              ),
            ),
          )
        : 1,
    items,
    announcement,
    visibleRank,
    targetRank: slot?.rank ?? null,
    dropPosition: previewItem
      ? positionFor(previewItem, previewItems, rows)
      : null,
    position: (item: Item) =>
      positionFor(item, item.id === slot?.id ? items : previewItems, rows),
    start: hover,
    move: hover,
    drop: (id: string, clientX: number, clientY: number) => {
      const next = slotAt(id, clientX, clientY);

      if (!next) {
        setSlot(null);

        return null;
      }

      return commit(next);
    },
    cancel: () => setSlot(null),
    keyboardMove,
  };
};
