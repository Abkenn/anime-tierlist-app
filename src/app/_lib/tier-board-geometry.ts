import type { TierItemData, TierRank } from '@/app/_types/tierlist.types';
import type { layoutTierItems } from './tier-item-layout';
import { getTierDropIndex, tierItemGap } from './tier-item-layout';

export type TierItemPosition = {
  x: string;
  y: string;
  width: string;
  height: string;
};
export type TierRow = { rank: TierRank; x: number; y: number; size: number };
export type TierDropSlot = { id: string; rank: TierRank; index: number };
const itemGapRem = tierItemGap;

export const getVisibleRank = (item: TierItemData, ranks: TierRank[]) =>
  ranks.includes(item.rank) ? item.rank : ranks[0];

export const measureTierRows = (
  board: HTMLElement,
  wrapItems: boolean,
  rem: number,
): TierRow[] => {
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
            .height ?? rem * 4.125)
        : Math.max(0, (cells?.height ?? rect.height) - rem * itemGapRem * 2),
    };
  });
};

export const isOutsideTierBoard = (
  board: HTMLElement | null,
  x: number,
  y: number,
) => {
  const viewport = board?.closest<HTMLElement>('[data-tier-viewport]');
  const rectangles = [board, viewport].flatMap((element) =>
    element ? [element.getBoundingClientRect()] : [],
  );

  return rectangles.some(
    (rect) =>
      x < rect.left || x > rect.right || y < rect.top || y > rect.bottom,
  );
};

export const isInDiscardZone = (
  board: HTMLElement | null,
  x: number,
  y: number,
) => {
  const scope = board?.closest('main') ?? document;
  const zone = scope.querySelector<HTMLElement>('[data-tier-discard]');
  const bounds = zone?.getBoundingClientRect();

  return Boolean(
    bounds &&
      bounds.width > 0 &&
      bounds.height > 0 &&
      x >= bounds.left &&
      x <= bounds.right &&
      y >= bounds.top &&
      y <= bounds.bottom,
  );
};

type DropSlotInput = {
  id: string;
  clientX: number;
  clientY: number;
  board: HTMLElement | null;
  rows: TierRow[];
  rem: number;
  wrapItems: boolean;
  items: TierItemData[];
  boxesFor: (
    rank: TierRank,
    items: TierItemData[],
    rows: TierRow[],
  ) => ReturnType<typeof layoutTierItems>;
};

export const findTierDropSlot = ({
  id,
  clientX,
  clientY,
  board,
  rows,
  rem,
  wrapItems,
  items,
  boxesFor,
}: DropSlotInput): TierDropSlot | null => {
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
  const row = rows.find((value) => value.rank === rank);

  if (!row) {
    return null;
  }

  const x =
    clientX - board.getBoundingClientRect().left - row.x - rem * itemGapRem;
  const line = wrapItems
    ? Math.max(
        0,
        Math.min(
          1,
          Math.floor(
            (clientY - board.getBoundingClientRect().top - row.y) /
              (row.size + rem * itemGapRem),
          ),
        ),
      )
    : 0;
  const boxes = boxesFor(
    rank,
    items.filter((item) => item.id !== id),
    rows,
  );
  const index = getTierDropIndex(boxes, x / rem, line);

  return { id, rank, index };
};
