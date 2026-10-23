'use client';

import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';
import {
  useCallback,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { tierDragRegionAtom } from '@/app/_atoms/tierlist/interaction.atoms';
import {
  availableRanksAtom,
  tierItemsAtom,
} from '@/app/_atoms/tierlist/items.atoms';
import {
  draggedSearchItemAtom,
  searchDragPointAtom,
  searchDropSlotAtom,
} from '@/app/_atoms/tierlist/search.atoms';
import {
  getTierDropIndex,
  getTwoLineCapacity,
  layoutTierItems,
  tierItemGap,
} from '@/app/_lib/tier-item-layout';
import { projectTierItems } from '@/app/_lib/tier-item-projection';
import type {
  TierImageMode,
  TierItemData,
  TierKeyboardMove,
  TierRank,
} from '@/app/_types/tierlist.types';

export type TierItemPosition = {
  x: string;
  y: string;
  width: string;
  height: string;
};
type Item = TierItemData;
type Row = { rank: TierRank; x: number; y: number; size: number };
type DropSlot = { id: string; rank: TierRank; index: number };

const itemGapRem = tierItemGap;

const getVisibleRank = (item: Item, ranks: TierRank[]) =>
  ranks.includes(item.rank) ? item.rank : ranks[0];

type TierItemsInput = {
  ranks: TierRank[];
  initialItemCount?: number;
  wrapItems?: boolean;
  initialItems?: TierItemData[];
  imageMode?: TierImageMode;
};

export const useTierItems = ({
  ranks,
  initialItemCount = 2,
  wrapItems = false,
  initialItems,
  imageMode = 'natural',
}: TierItemsInput) => {
  const externalItem = useAtomValue(draggedSearchItemAtom);
  const externalPoint = useAtomValue(searchDragPointAtom);
  const [externalSlot, setExternalSlot] = useAtom(searchDropSlotAtom);
  const setDragRegion = useSetAtom(tierDragRegionAtom);
  const [viewportElement, setViewportElement] = useState<HTMLElement | null>(
    null,
  );
  const [viewportWidth, setViewportWidth] = useState(344);
  const boardRef = useRef<HTMLDivElement>(null);
  useHydrateAtoms([
    [
      tierItemsAtom,
      initialItems?.map((item) => ({ ...item })) ??
        Array.from(
          { length: initialItemCount },
          (_, index): Item => ({
            id: `tier-item-${index + 1}`,
            label: String(index + 1),
            rank: 'S+',
          }),
        ),
    ],
  ]);
  const [items, setItems] = useAtom(tierItemsAtom);
  const setAvailableRanks = useSetAtom(availableRanksAtom);
  const [rows, setRows] = useState<Row[]>([]);
  const [slot, setSlot] = useState<DropSlot | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const rem = useRef(16);

  const rankKey = ranks.join(',');
  const activeSlot = slot ?? (externalItem ? externalSlot : null);
  const layoutItems =
    externalItem && externalSlot ? [...items, externalItem] : items;
  const previewItems = activeSlot
    ? projectTierItems(layoutItems, activeSlot, ranks)
    : items;
  const previewItem = activeSlot
    ? previewItems.find((item) => item.id === activeSlot.id)
    : undefined;

  const labelWidth = rows[0] ? rows[0].x / rem.current : 4.5625;
  const availableWidth = Math.max(
    0,
    viewportWidth / rem.current - labelWidth - itemGapRem * 2 - 1 / rem.current,
  );
  const capacity = Math.max(
    availableWidth,
    ...ranks.map((rank) =>
      getTwoLineCapacity({
        items: previewItems.filter(
          (item) => getVisibleRank(item, ranks) === rank,
        ),
        size: 3.75,
        mode: imageMode,
      }),
    ),
  );
  const viewportRef = useCallback(
    (element: HTMLElement | null) => setViewportElement(element),
    [],
  );

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
          ? (row.lastElementChild?.firstElementChild?.getBoundingClientRect()
              .height ?? rem.current * 4.125)
          : Math.max(
              0,
              (cells?.height ?? rect.height) - rem.current * itemGapRem * 2,
            ),
      };
    });
  }, [wrapItems]);

  const visibleRank = (item: Item) => getVisibleRank(item, ranks);

  const boxesFor = (
    rank: TierRank,
    currentItems: Item[],
    currentRows = rows,
  ) => {
    const row = currentRows.find((value) => value.rank === rank);

    return layoutTierItems({
      items: currentItems.filter((item) => visibleRank(item) === rank),
      size: row ? row.size / rem.current : 3.75,
      mode: imageMode,
      capacity,
      wrap: wrapItems,
    });
  };

  const positionFor = (
    item: Item,
    currentItems: Item[],
    currentRows: Row[],
  ): TierItemPosition | null => {
    const rank = visibleRank(item);
    const row = currentRows.find((value) => value.rank === rank);
    const box = rank
      ? boxesFor(rank, currentItems, currentRows).find(
          (value) => value.id === item.id,
        )
      : undefined;

    if (!row || !box) {
      return null;
    }

    return {
      x: `${row.x / rem.current + itemGapRem + box.x}rem`,
      y: `${row.y / rem.current + itemGapRem + box.line * (row.size / rem.current + itemGapRem)}rem`,
      width: `${box.width}rem`,
      height: `${row.size / rem.current}rem`,
    };
  };

  const getCanvasWidth = () =>
    Math.max(
      viewportWidth / rem.current,
      ...rows.map((row) => {
        const boxes = boxesFor(row.rank, previewItems);
        const right = Math.max(0, ...boxes.map((box) => box.x + box.width));

        return (
          row.x / rem.current +
          Math.max(right, wrapItems ? capacity : 0) +
          itemGapRem * 2 +
          1 / rem.current
        );
      }),
    );

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
    const boxes = boxesFor(
      rank,
      items.filter((item) => item.id !== id),
      measure(),
    );
    const index = getTierDropIndex(boxes, x / rem.current, line);

    return { id, rank, index };
  };

  const outsideBoard = (x: number, y: number) => {
    const board = boardRef.current;
    const viewport = board?.closest<HTMLElement>('[data-tier-viewport]');
    const rectangles = [board, viewport].flatMap((element) =>
      element ? [element.getBoundingClientRect()] : [],
    );

    return rectangles.some(
      (rect) =>
        x < rect.left || x > rect.right || y < rect.top || y > rect.bottom,
    );
  };

  const hover = (id: string, clientX: number, clientY: number) => {
    const outside = outsideBoard(clientX, clientY);
    setDragRegion(outside ? 'discard' : 'board');
    const next = outside ? null : slotAt(id, clientX, clientY);

    setSlot((current) =>
      current?.id === next?.id &&
      current?.rank === next?.rank &&
      current?.index === next?.index
        ? current
        : next,
    );
  };

  const commit = (next: DropSlot) => {
    const nextItems = projectTierItems(items, next, ranks);
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

  const updateExternalSlot = useEffectEvent(
    (
      candidate: TierItemData | null,
      point: { x: number; y: number } | null,
    ) => {
      const next =
        candidate && point && !outsideBoard(point.x, point.y)
          ? slotAt(candidate.id, point.x, point.y)
          : null;
      setExternalSlot((current) =>
        current?.id === next?.id &&
        current?.rank === next?.rank &&
        current?.index === next?.index
          ? current
          : next,
      );
    },
  );

  useLayoutEffect(() => {
    updateExternalSlot(externalItem, externalPoint);
  }, [externalItem, externalPoint]);

  useLayoutEffect(() => {
    setAvailableRanks(ranks);
  }, [ranks, setAvailableRanks]);

  useLayoutEffect(() => {
    const viewport = viewportElement;

    if (!viewport) {
      return;
    }

    const update = () => setViewportWidth(viewport.clientWidth);
    const observer = new ResizeObserver(update);

    update();
    observer.observe(viewport);

    return () => observer.disconnect();
  }, [viewportElement]);

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
    canvasWidth: `${getCanvasWidth()}rem`,
    lines: (rank: TierRank) =>
      (boxesFor(rank, previewItems).at(-1)?.line ?? 0) + 1,
    updateItem: (
      id: string,
      changes: Partial<
        Pick<Item, 'crop' | 'trim' | 'rowHeightExpansion' | 'title'>
      >,
    ) =>
      setItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, ...changes } : item,
        ),
      ),
    addItem: (item: Item) =>
      setItems((current) =>
        current.some((existing) => existing.id === item.id)
          ? current
          : [...current, item],
      ),
    items,
    announcement,
    visibleRank,
    targetRank: activeSlot?.rank ?? null,
    dropPosition: previewItem
      ? positionFor(previewItem, previewItems, rows)
      : null,
    position: (item: Item) =>
      positionFor(item, item.id === slot?.id ? items : previewItems, rows),
    start: hover,
    move: hover,
    drop: (id: string, clientX: number, clientY: number) => {
      setDragRegion(null);
      if (outsideBoard(clientX, clientY)) {
        setItems((current) => current.filter((item) => item.id !== id));
        setSlot(null);
        setAnnouncement(
          `Item ${items.find((item) => item.id === id)?.label ?? id} discarded`,
        );

        return null;
      }

      const next = slotAt(id, clientX, clientY);

      if (!next) {
        setSlot(null);

        return null;
      }

      return commit(next);
    },
    cancel: () => {
      setDragRegion(null);
      setSlot(null);
    },
    keyboardMove,
  };
};
