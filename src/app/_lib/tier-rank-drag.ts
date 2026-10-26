import { type MotionValue, motionValue } from 'motion/react';
import type { TierRank } from '@/app/_types/tierlist.types';

export type RankDragRow = { rank: TierRank; top: number; height: number };

export const getRankOffset = (
  offsets: Map<TierRank, MotionValue<number>>,
  rank: TierRank,
) => {
  let offset = offsets.get(rank);
  if (!offset) {
    offset = motionValue(0);
    offsets.set(rank, offset);
  }

  return offset;
};

export const projectRankDrag = (
  rows: RankDragRow[],
  rank: TierRank,
  delta: number,
) => {
  const source = rows.find((row) => row.rank === rank);
  if (!source) {
    return {
      order: rows.map((row) => row.rank),
      offsets: new Map<TierRank, number>(),
    };
  }

  const sourceIndex = rows.indexOf(source);
  const others = rows.filter((row) => row.rank !== rank);
  const down = rows
    .slice(sourceIndex + 1)
    .filter(
      (row) => source.top + source.height + delta > row.top + row.height / 2,
    ).length;
  const up = rows
    .slice(0, sourceIndex)
    .filter((row) => source.top + delta < row.top + row.height / 2).length;
  const index = sourceIndex + (delta >= 0 ? down : -up);
  const ordered = [...others];
  ordered.splice(index, 0, source);
  let top = rows[0]?.top ?? 0;
  const offsets = new Map(
    ordered.map((row) => {
      const offset = top - row.top;
      top += row.height;

      return [row.rank, offset] as const;
    }),
  );

  return { order: ordered.map((row) => row.rank), offsets };
};
