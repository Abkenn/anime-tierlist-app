import type { TierRank } from '@/app/_types/tierlist.types';
import type { ImportSeries } from './anime-import';

export type ImportSeriesRow = { rank: TierRank; series: ImportSeries[] };

export const compareImportSeries = (
  first: ImportSeries,
  second: ImportSeries,
) =>
  second.score - first.score ||
  (first.score === 10 && second.score === 10
    ? Number(second.seasons > 1) - Number(first.seasons > 1)
    : 0) ||
  second.episodes - first.episodes ||
  first.title.localeCompare(second.title) ||
  first.id - second.id;

type ImportRowSplitInput = {
  scores: number[];
  episodes?: number[];
  preferLargerLeft?: boolean;
  targetSize?: number;
};

export const findImportRowSplit = ({
  scores,
  episodes,
  preferLargerLeft = false,
  targetSize,
}: ImportRowSplitInput) => {
  const middle =
    targetSize ??
    (preferLargerLeft
      ? Math.ceil(scores.length / 2)
      : Math.floor(scores.length / 2));
  const direction = preferLargerLeft ? 1 : -1;
  const candidates = [
    middle,
    ...Array.from({ length: scores.length }, (_, index) => {
      const distance = index + 1;

      return [
        middle + direction * distance,
        ...(distance >= 2 ? [middle - direction * (distance - 1)] : []),
      ];
    }).flat(),
  ];

  const valid = candidates.filter(
    (cut) =>
      cut >= 2 &&
      cut <= scores.length - 2 &&
      (scores[cut - 1] > scores[cut] ||
        (scores[cut - 1] === scores[cut] &&
          episodes !== undefined &&
          episodes[cut - 1] > episodes[cut])),
  );
  if (targetSize !== undefined) {
    valid.sort(
      (first, second) =>
        Math.abs(first - targetSize) - Math.abs(second - targetSize),
    );
  }

  return valid[0] ?? null;
};

const bellWeights: Partial<Record<TierRank, number>> = {
  S: 1,
  'A+': 3,
  A: 4,
  'B+': 3,
  B: 1,
};

const splitRowDown = (
  rows: ImportSeriesRow[],
  index: number,
  targetSize: number,
) => {
  const row = rows[index];
  if (row.series.length < 6 || row.series.length < targetSize + 2) {
    return;
  }
  const cut = findImportRowSplit({
    scores: row.series.map((series) => series.score),
    episodes: row.series.map((series) => series.episodes),
    preferLargerLeft: row.rank === 'B+',
    targetSize,
  });
  if (
    cut === null ||
    Math.abs(cut - targetSize) >= row.series.length - targetSize
  ) {
    return;
  }
  const target = rows[index + 1];
  target.series = [...row.series.splice(cut), ...target.series].sort(
    compareImportSeries,
  );
};

const repairSparseTopRow = (rows: ImportSeriesRow[]) => {
  const top = rows.find((row) => row.rank === 'S');
  const next = rows.find((row) => row.rank === 'A+');
  if (
    !top ||
    !next ||
    next.series.length < Math.max(12, top.series.length * 6)
  ) {
    return rows;
  }
  // Promote only the exceptional prefix above the common 9/10 plateau.
  // Keep equal scores together, and leave at least twice as many entries in A+.
  const target = Math.floor((top.series.length + next.series.length) / 4);
  const limit = Math.min(
    target - top.series.length,
    Math.floor(next.series.length / 3),
  );
  const cut = next.series.findIndex((entry) => entry.score <= 9);
  if (cut > 0 && cut <= limit) {
    top.series = [...top.series, ...next.series.splice(0, cut)].sort(
      compareImportSeries,
    );
  }
  return rows;
};

export const balanceImportRows = (
  input: ImportSeriesRow[],
): ImportSeriesRow[] => {
  const floor = input.findIndex((row) => row.rank === 'B');
  const rows = input.map((row, index) => ({
    rank: row.rank,
    series:
      floor >= 0 && index <= floor
        ? [...row.series].sort(compareImportSeries)
        : [...row.series],
  }));
  if (floor < 0) {
    return repairSparseTopRow(rows);
  }
  const center = rows.findIndex((row) => row.rank === 'B+');
  const upper = rows[center - 1];
  const middle = rows[center];
  const lower = rows[center + 1];
  const hasDent =
    upper &&
    middle &&
    lower &&
    upper.series.length >= Math.max(6, middle.series.length * 3) &&
    lower.series.length >= Math.max(6, middle.series.length * 3);

  if (hasDent) {
    // Half-point score buckets can be sparse between large integer-score rows.
    // Move lower-scored entries down from the upper rows; never promote B.
    const start = rows.findIndex(
      (row, index) =>
        row.rank !== 'S+' &&
        index < center &&
        row.series.length >= Math.max(6, middle.series.length * 3),
    );
    if (start >= 0) {
      const affected = rows.slice(start, center + 1);
      const total = affected.reduce((sum, row) => sum + row.series.length, 0);
      const upperWeight = affected
        .slice(0, -1)
        .reduce((sum, row) => sum + (bellWeights[row.rank] ?? 0), 0);
      const peak = Math.min(
        total - (affected.length - 1) * 2,
        Math.max(
          Math.ceil(lower.series.length * 1.05),
          Math.round((total * 5) / (upperWeight + 5)),
        ),
      );
      for (let index = start; index < center; index += 1) {
        const targetSize = Math.max(
          2,
          Math.round(
            ((total - peak) * (bellWeights[rows[index].rank] ?? 0)) /
              upperWeight,
          ),
        );
        splitRowDown(rows, index, targetSize);
      }
    }
    return repairSparseTopRow(rows);
  }
  // A healthy B+-centered result should not be reshaped back toward fixed A targets.
  if (
    middle &&
    upper &&
    lower &&
    middle.series.length >= upper.series.length &&
    middle.series.length >= lower.series.length &&
    rows.every(
      (row, index) =>
        index >= center ||
        row.rank === 'S+' ||
        row.series.length <= rows[index + 1].series.length,
    )
  ) {
    return repairSparseTopRow(rows);
  }

  const first = rows.findIndex((row, index) => {
    if (index >= floor || !bellWeights[row.rank] || row.series.length < 6) {
      return false;
    }
    const neighbors = [rows[index - 1], rows[index + 1]].filter(
      (neighbor) => neighbor !== undefined,
    );

    return neighbors.some(
      (neighbor) =>
        row.series.length >= Math.max(1, neighbor.series.length) * 3,
    );
  });
  if (first < 0) {
    return repairSparseTopRow(rows);
  }
  const affected = rows.slice(first, floor + 1);
  const total = affected.reduce((sum, row) => sum + row.series.length, 0);
  const weight = affected.reduce(
    (sum, row) => sum + (bellWeights[row.rank] ?? 0),
    0,
  );
  const targets = rows.map((row) =>
    Math.max(2, Math.round((total * (bellWeights[row.rank] ?? 0)) / weight)),
  );

  for (let index = first; index < floor; index += 1) {
    splitRowDown(rows, index, targets[index]);
  }

  return repairSparseTopRow(rows);
};
