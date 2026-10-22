'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { TierColor } from '@/app/_components/tierlist/tier-row';

export type TierItemPosition = {
  x: string;
  y: string;
  width: string;
  height: string;
};
type Item = { id: string; label: string; rank: TierColor };
type Row = { rank: TierColor; x: number; y: number; size: number };
type DropSlot = { id: string; rank: TierColor; index: number };
const initialItems: Item[] = [
  { id: 'tier-item-1', label: '1', rank: 'S+' },
  { id: 'tier-item-2', label: '2', rank: 'S+' },
];

export const useTierItems = (ranks: TierColor[]) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState(initialItems);
  const [rows, setRows] = useState<Row[]>([]);
  const [slot, setSlot] = useState<DropSlot | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const rem = useRef(16);
  const rankKey = ranks.join(',');
  const measure = useCallback((): Row[] => {
    const board = boardRef.current;
    if (!board) return [];
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
        rank: row.dataset.tierRank as TierColor,
        x: (cells?.left ?? rect.left) - bounds.left,
        y: rect.top - bounds.top,
        size: Math.min(rect.height - rem.current * 0.5, rem.current * 4),
      };
    });
  }, []);
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
  const visibleRank = (item: Item) =>
    ranks.includes(item.rank) ? item.rank : ranks[0];
  const positionFor = (
    item: Item,
    currentItems: Item[],
    currentRows: Row[],
  ): TierItemPosition | null => {
    const rank = visibleRank(item);
    const row = currentRows.find((value) => value.rank === rank);
    if (!row) return null;
    const index = currentItems.findIndex((value) => value.id === item.id);
    const column = currentItems
      .slice(0, index)
      .filter((other) => visibleRank(other) === rank).length;
    return {
      x: `${String(row.x / rem.current + 0.25 + column * (row.size / rem.current + 0.125))}rem`,
      y: `${String(row.y / rem.current + 0.25)}rem`,
      width: `${String(row.size / rem.current)}rem`,
      height: `${String(row.size / rem.current)}rem`,
    };
  };
  const project = (dropSlot: DropSlot): Item[] => {
    const item = items.find((value) => value.id === dropSlot.id);
    if (!item) return items;
    const remaining = items.filter((value) => value.id !== item.id);
    const siblings = remaining.filter(
      (value) => visibleRank(value) === dropSlot.rank,
    );
    const next = siblings[dropSlot.index];
    const previous = siblings.at(-1);
    let insertion = remaining.length;
    if (previous) insertion = remaining.indexOf(previous) + 1;
    if (next) insertion = remaining.indexOf(next);
    return [
      ...remaining.slice(0, insertion),
      { ...item, rank: dropSlot.rank },
      ...remaining.slice(insertion),
    ];
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
    if (!board || !first || !last) return null;
    const hit =
      candidates.find((row) => {
        const rect = row.getBoundingClientRect();
        return clientY >= rect.top && clientY < rect.bottom;
      }) ?? (clientY < first.getBoundingClientRect().top ? first : last);
    const rank = hit.dataset.tierRank as TierColor;
    const row = measure().find((value) => value.rank === rank);
    if (!row) return null;
    const count = items.filter(
      (item) => item.id !== id && visibleRank(item) === rank,
    ).length;
    const x =
      clientX - board.getBoundingClientRect().left - row.x - rem.current * 0.25;
    const index = Math.max(
      0,
      Math.min(
        count,
        Math.floor(
          (x + rem.current * 0.0625) / (row.size + rem.current * 0.125) + 0.5,
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
  const previewItems = slot ? project(slot) : items;
  const previewItem = slot
    ? previewItems.find((item) => item.id === slot.id)
    : undefined;
  const commit = (next: DropSlot) => {
    const nextItems = project(next);
    const item = nextItems.find((value) => value.id === next.id);
    setItems(nextItems);
    setSlot(null);
    if (item)
      setAnnouncement(
        `Item ${item.label} moved to ${next.rank}, position ${next.index + 1}`,
      );
    return item ? positionFor(item, nextItems, measure()) : null;
  };
  return {
    boardRef,
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
    keyboardMove: (id: string, direction: number) => {
      const item = items.find((value) => value.id === id);
      if (!item || !ranks.length) return;
      const next =
        ranks[
          Math.max(
            0,
            Math.min(
              ranks.length - 1,
              ranks.indexOf(visibleRank(item)) + direction,
            ),
          )
        ];
      if (next)
        commit({
          id,
          rank: next,
          index: items.filter(
            (value) => value.id !== id && visibleRank(value) === next,
          ).length,
        });
    },
  };
};
