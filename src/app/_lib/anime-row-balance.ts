import type { TierRank } from '@/app/_types/tierlist.types';
import type { ImportSeries } from './anime-import';

export type ImportSeriesRow = { rank: TierRank; series: ImportSeries[] };

export const compareImportSeries = (
  first: ImportSeries,
  second: ImportSeries,
) =>
  second.score - first.score ||
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
    return rows;
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
    return rows;
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
    const row = rows[index];
    const targetSize = targets[index];
    if (row.series.length < 6 || row.series.length < targetSize + 2) {
      continue;
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
      continue;
    }

    const target = rows[index + 1];
    target.series = [...row.series.splice(cut), ...target.series].sort(
      compareImportSeries,
    );
  }

  return rows;
};
