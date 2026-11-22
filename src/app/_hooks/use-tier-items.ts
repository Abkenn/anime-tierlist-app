'use client';

import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';
import { useCallback, useEffectEvent, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  lockFeedbackAtom,
  positionsLockedAtom,
  tierDragRegionAtom,
} from '@/app/_atoms/tierlist/interaction.atoms';
import { availableRanksAtom, tierItemsAtom } from '@/app/_atoms/tierlist/items.atoms';
import { posterLayoutAtom } from '@/app/_atoms/tierlist/layout.atoms';
import {
  draggedSearchItemAtom,
  searchDragPointAtom,
  searchDropSlotAtom,
} from '@/app/_atoms/tierlist/search.atoms';
import { posterSizeAtom } from '@/app/_atoms/tierlist/settings.atoms';
import { getCrowdedPosterMinimum } from '@/app/_lib/poster-size';
import {
  type TierDropSlot as DropSlot,
  findTierDropSlot,
  getVisibleRank,
  isInDiscardZone,
  isOutsideTierBoard,
  measureTierRows,
  type TierRow as Row,
  type TierItemPosition,
} from '@/app/_lib/tier-board-geometry';
import { layoutTierItems, tierItemGap } from '@/app/_lib/tier-item-layout';

export type { TierItemPosition } from '@/app/_lib/tier-board-geometry';

import { projectTierItems } from '@/app/_lib/tier-item-projection';
import type {
  TierImageMode,
  TierItemData,
  TierKeyboardMove,
  TierRank,
} from '@/app/_types/tierlist.types';

type Item = TierItemData;

type TierItemsInput = {
  restoring?: boolean;
  ranks: TierRank[];
  initialItemCount?: number;
  wrapItems?: boolean;
  initialItems?: TierItemData[];
  imageMode?: TierImageMode;
};

export const useTierItems = ({
  restoring = false,
  ranks,
  initialItemCount = 2,
  wrapItems = false,
  initialItems,
  imageMode = 'natural',
}: TierItemsInput) => {
  const locked = useAtomValue(positionsLockedAtom);
  const posterSize = useAtomValue(posterSizeAtom);
  const feedback = useSetAtom(lockFeedbackAtom);
  const externalItem = useAtomValue(draggedSearchItemAtom);
  const externalPoint = useAtomValue(searchDragPointAtom);
  const [externalSlot, setExternalSlot] = useAtom(searchDropSlotAtom);
  const setDragRegion = useSetAtom(tierDragRegionAtom);
  const [viewportElement, setViewportElement] = useState<HTMLElement | null>(null);
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
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const setPosterLayout = useSetAtom(posterLayoutAtom);
  const setAvailableRanks = useSetAtom(availableRanksAtom);
  const [rows, setRows] = useState<Row[]>([]);
  const [slot, setSlot] = useState<DropSlot | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const rem = useRef(16);
  const itemGapRem = rows[0]?.gap ?? tierItemGap;
  const actionSpaceRem = rows[0]?.actionSpace ?? 2.25;

  const rankKey = ranks.join(',');
  const activeSlot = locked ? null : (slot ?? (externalItem ? externalSlot : null));
  const layoutItems = externalItem && externalSlot ? [...items, externalItem] : items;
  const previewItems = activeSlot ? projectTierItems(layoutItems, activeSlot, ranks) : items;
  const previewItem = activeSlot
    ? previewItems.find((item) => item.id === activeSlot.id)
    : undefined;

  const labelWidth = rows[0] ? rows[0].x / rem.current : 4.5625;
  const availableWidth = Math.max(
    0,
    viewportWidth / rem.current - labelWidth - itemGapRem * 2 - actionSpaceRem - 1 / rem.current,
  );
  const capacity = availableWidth;
  const compactAuto = viewportWidth / rem.current < 40 && posterSize === 'dynamic';
  const crowdedMinimum = useMemo(
    () =>
      getCrowdedPosterMinimum({
        imageMode,
        items,
        capacity: Math.max(1, availableWidth),
        ranks,
        gap: itemGapRem,
        compact: viewportWidth / rem.current < 40,
      }),
    [imageMode, items, viewportWidth, ranks, itemGapRem, availableWidth],
  );
  const viewportRef = useCallback((element: HTMLElement | null) => setViewportElement(element), []);

  const measure = useCallback((): Row[] => {
    const board = boardRef.current;

    if (!board) {
      return [];
    }

    rem.current = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);

    return measureTierRows(board, wrapItems, rem.current);
  }, [wrapItems]);

  const visibleRank = (item: Item) => getVisibleRank(item, ranks);

  const boxesFor = (rank: TierRank, currentItems: Item[], currentRows = rows) => {
    const row = currentRows.find((value) => value.rank === rank);

    return layoutTierItems({
      items: currentItems.filter((item) => visibleRank(item) === rank),
      size: row ? row.size / rem.current : 3.75,
      mode: imageMode,
      capacity,
      wrap: wrapItems,
      gap: itemGapRem,
    });
  };

  const previewBoxes = useMemo(() => {
    const grouped = new Map<TierRank, Item[]>();
    previewItems.forEach((item) => {
      const rank = getVisibleRank(item, ranks);
      const group = grouped.get(rank) ?? [];
      group.push(item);
      grouped.set(rank, group);
    });

    return new Map(
      rows.map((row) => [
        row.rank,
        layoutTierItems({
          items: grouped.get(row.rank) ?? [],
          size: row.size / rem.current,
          mode: imageMode,
          capacity,
          wrap: wrapItems,
          gap: itemGapRem,
        }),
      ]),
    );
  }, [previewItems, ranks, rows, imageMode, capacity, wrapItems, itemGapRem]);
  const previewBoxById = useMemo(
    () => new Map([...previewBoxes.values()].flat().map((box) => [box.id, box])),
    [previewBoxes],
  );

  const positionFor = (
    item: Item,
    currentItems: Item[],
    currentRows: Row[],
  ): TierItemPosition | null => {
    const rank = visibleRank(item);
    const row = currentRows.find((value) => value.rank === rank);
    let box = previewBoxById.get(item.id);
    if (currentItems !== previewItems || currentRows !== rows) {
      box = boxesFor(rank, currentItems, currentRows).find((value) => value.id === item.id);
    }

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

  const posterLayout = useMemo(
    () =>
      previewItems.flatMap((item) => {
        const row = rows.find((row) => row.rank === getVisibleRank(item, ranks));
        const box = previewBoxById.get(item.id);

        return row && box
          ? [
              {
                id: item.id,
                x: row.x + (itemGapRem + box.x) * rem.current,
                y:
                  row.y +
                  itemGapRem * rem.current +
                  box.line * (row.size + itemGapRem * rem.current),
                width: box.width * rem.current,
                height: row.size,
              },
            ]
          : [];
      }),
    [previewItems, rows, ranks, previewBoxById, itemGapRem],
  );

  useLayoutEffect(() => {
    setPosterLayout(posterLayout);
  }, [posterLayout, setPosterLayout]);

  const getCanvasWidth = () =>
    wrapItems
      ? viewportWidth / rem.current
      : Math.max(
          viewportWidth / rem.current,
          ...rows.map((row) => {
            const boxes = previewBoxes.get(row.rank) ?? [];
            const right = Math.max(0, ...boxes.map((box) => box.x + box.width));

            return (
              row.x / rem.current +
              Math.max(right, wrapItems ? capacity : 0) +
              itemGapRem * 2 +
              actionSpaceRem +
              1 / rem.current
            );
          }),
        );

  const slotAt = (id: string, clientX: number, clientY: number): DropSlot | null => {
    return findTierDropSlot({
      id,
      clientX,
      clientY,
      board: boardRef.current,
      rows: measure(),
      rem: rem.current,
      wrapItems,
      items,
      boxesFor,
    });
  };

  const outsideBoard = (x: number, y: number) => isOutsideTierBoard(boardRef.current, x, y);
  const inDiscardZone = (x: number, y: number) => isInDiscardZone(boardRef.current, x, y);

  const hover = (id: string, clientX: number, clientY: number) => {
    const outside = outsideBoard(clientX, clientY);
    setDragRegion(inDiscardZone(clientX, clientY) ? 'discard' : 'board');
    const next = outside ? null : slotAt(id, clientX, clientY);

    setSlot((current) =>
      current?.id === next?.id && current?.rank === next?.rank && current?.index === next?.index
        ? current
        : next,
    );
  };

  const commit = (next: DropSlot) => {
    if (locked) {
      feedback((current) => current + 1);
      return null;
    }
    const nextItems = projectTierItems(items, next, ranks);
    const item = nextItems.find((value) => value.id === next.id);

    setItems(nextItems);
    setSlot(null);

    if (item) {
      setAnnouncement(`Item ${item.label} moved to ${next.rank}, position ${next.index + 1}`);
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
      const index = Math.max(0, Math.min(siblings.length - 1, current + direction));

      if (index !== current) {
        commit({ id, rank, index });
      }

      return;
    }

    const next = ranks[Math.max(0, Math.min(ranks.length - 1, ranks.indexOf(rank) + direction))];

    if (next && next !== rank) {
      commit({
        id,
        rank: next,
        index: items.filter((value) => value.id !== id && visibleRank(value) === next).length,
      });
    }
  };

  const updateExternalSlot = useEffectEvent(
    (candidate: TierItemData | null, point: { x: number; y: number } | null) => {
      const next =
        !locked && candidate && point && !outsideBoard(point.x, point.y)
          ? slotAt(candidate.id, point.x, point.y)
          : null;
      setExternalSlot((current) =>
        current?.id === next?.id && current?.rank === next?.rank && current?.index === next?.index
          ? current
          : next,
      );
    },
  );

  useLayoutEffect(() => {
    updateExternalSlot(locked ? null : externalItem, externalPoint);
  }, [externalItem, externalPoint, locked]);

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

  const updateRows = useCallback(() => {
    const next = measure();
    setRows((current) =>
      current.length === next.length &&
      current.every((row, index) => {
        const candidate = next[index];
        return (
          row.rank === candidate.rank &&
          row.x === candidate.x &&
          row.y === candidate.y &&
          row.gap === candidate.gap &&
          row.actionSpace === candidate.actionSpace &&
          row.size === candidate.size
        );
      })
        ? current
        : next,
    );
  }, [measure]);

  useLayoutEffect(() => {
    if (!restoring && previewBoxes.size) {
      updateRows();
    }
  }, [previewBoxes, restoring, updateRows]);

  useLayoutEffect(() => {
    const board = boardRef.current;

    if (!board || !rankKey || restoring) {
      setRows((current) => (current.length ? [] : current));

      return;
    }

    updateRows();
    const observer = new ResizeObserver(updateRows);
    observer.observe(board);
    board.querySelectorAll('[data-tier-rank]').forEach((row) => {
      observer.observe(row);
    });

    return () => observer.disconnect();
  }, [rankKey, updateRows, restoring]);

  return {
    boardRef,
    viewportRef,
    canvasWidth: `${getCanvasWidth()}rem`,
    crowdedMinimum,
    compactAuto,
    crowdedMaximum:
      viewportWidth / rem.current < 40 ? Math.max(1, Math.min(3, availableWidth / 8)) : undefined,
    lines: (rank: TierRank) => (previewBoxes.get(rank)?.at(-1)?.line ?? 0) + 1,
    updateItem: (
      id: string,
      changes: Partial<Pick<Item, 'crop' | 'trim' | 'rowHeightExpansion' | 'title' | 'label'>>,
    ) =>
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, ...changes } : item)),
      ),
    addItem: (item: Item) =>
      setItems((current) =>
        current.some((existing) => existing.id === item.id) ? current : [...current, item],
      ),
    items,
    posterLayout,
    searchPosition: (rank: TierRank) => {
      const row = rows.find((row) => row.rank === rank);
      const last = previewBoxes.get(rank)?.at(-1);

      return {
        left: `${itemGapRem + (last ? last.x + last.width : 0) + 0.25}rem`,
        top: row
          ? `${itemGapRem + (last?.line ?? 0) * (row.size / rem.current + itemGapRem) + row.size / rem.current / 2}rem`
          : '50%',
      };
    },
    draggingId,
    announcement,
    visibleRank,
    targetRank: activeSlot?.rank ?? null,
    dropPosition: previewItem ? positionFor(previewItem, previewItems, rows) : null,
    position: (item: Item) => positionFor(item, item.id === slot?.id ? items : previewItems, rows),
    start: (id: string, x: number, y: number) => {
      if (locked) {
        return;
      }
      setDraggingId(id);
      hover(id, x, y);
    },
    move: hover,
    drop: (id: string, clientX: number, clientY: number) => {
      if (locked) {
        return null;
      }
      setDraggingId(null);
      setDragRegion(null);
      if (inDiscardZone(clientX, clientY)) {
        setItems((current) => current.filter((item) => item.id !== id));
        setSlot(null);
        setAnnouncement(`Item ${items.find((item) => item.id === id)?.label ?? id} discarded`);

        return null;
      }

      if (outsideBoard(clientX, clientY)) {
        setSlot(null);

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
      setDraggingId(null);
      setDragRegion(null);
      setSlot(null);
    },
    keyboardMove,
  };
};
