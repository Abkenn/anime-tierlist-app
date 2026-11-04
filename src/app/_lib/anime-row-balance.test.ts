import { describe, expect, it } from 'vitest';
import {
  balanceImportRows,
  findImportRowSplit,
  type ImportSeriesRow,
} from './anime-row-balance';
import {
  type MalSeries,
  malImportRanks,
  malScoreRank,
  malSeriesDocument,
} from './mal-import';
import { tierlistDocumentSchema } from './tierlist-sync';

const series = (id: number, score: number, episodes = 12): MalSeries => ({
  id,
  title: `Series ${String(id).padStart(3, '0')}`,
  score,
  episodes,
  seasons: 1,
  seasonIds: [id],
});
const row = (
  rank: ImportSeriesRow['rank'],
  scores: number[],
  offset: number,
): ImportSeriesRow => ({
  rank,
  series: scores.map((score, index) => series(offset + index, score)),
});
const counts = (rows: ImportSeriesRow[]) =>
  rows.map((entry) => entry.series.length);
const crowded = () => [
  row('S+', [10], 1),
  row('S', [9.9, 9.8, 9.7], 10),
  row('A+', [...Array<number>(19).fill(9), 8.79, 8.52, 8.5], 20),
  row('A', [8.35, ...Array<number>(20).fill(8)], 50),
  row('B+', [7.77, 7.55], 80),
  row('B', [7], 90),
  row('C', [], 100),
  row('D', [5.8], 110),
  row('F', [], 120),
];

describe('score-aware split selection', () => {
  it('retains the whole-row midpoint search and never isolates one entry', () => {
    expect(
      findImportRowSplit({
        scores: [
          ...Array<number>(4).fill(9),
          ...Array<number>(3).fill(8),
          ...Array<number>(5).fill(7),
        ],
      }),
    ).toBe(4);
    expect(
      findImportRowSplit({
        scores: [
          ...Array<number>(3).fill(9),
          ...Array<number>(4).fill(8),
          ...Array<number>(5).fill(7),
        ],
      }),
    ).toBe(7);
    expect(
      findImportRowSplit({
        scores: [...Array<number>(19).fill(9), 8.79, 8.52, 8.5],
      }),
    ).toBe(19);
    expect(
      findImportRowSplit({ scores: [10, ...Array<number>(8).fill(9)] }),
    ).toBeNull();
    expect(
      findImportRowSplit({ scores: [...Array<number>(8).fill(9), 8] }),
    ).toBeNull();
    expect(findImportRowSplit({ scores: [9, 8, 7] })).toBeNull();
  });

  it('chooses the closest score boundary to a soft target without splitting ties', () => {
    expect(
      findImportRowSplit({
        scores: [...Array<number>(12).fill(9), ...Array<number>(10).fill(8)],
        targetSize: 13,
      }),
    ).toBe(12);
    expect(
      findImportRowSplit({
        scores: [...Array<number>(19).fill(9), 8.79, 8.52, 8.5],
        targetSize: 13,
      }),
    ).toBe(19);
    expect(
      findImportRowSplit({ scores: Array<number>(9).fill(9), targetSize: 4 }),
    ).toBeNull();
  });

  it('keeps the left/right directional preference when equally good cuts exist', () => {
    const scores = [10, 9, 8, 7, 6, 5, 4, 3, 2];
    expect(findImportRowSplit({ scores })).toBe(4);
    expect(findImportRowSplit({ scores, preferLargerLeft: true })).toBe(5);
  });

  it('splits equal averages at episode-count boundaries while keeping identical score/episode groups intact', () => {
    const scores = Array<number>(12).fill(9);
    expect(
      findImportRowSplit({
        scores,
        episodes: [...Array<number>(6).fill(23), ...Array<number>(6).fill(13)],
      }),
    ).toBe(6);
    expect(
      findImportRowSplit({
        scores,
        episodes: [...Array<number>(5).fill(23), ...Array<number>(7).fill(13)],
        targetSize: 6,
      }),
    ).toBe(5);
    expect(
      findImportRowSplit({ scores, episodes: Array<number>(12).fill(13) }),
    ).toBeNull();
    expect(
      findImportRowSplit({
        scores,
        episodes: [24, ...Array<number>(11).fill(13)],
      }),
    ).toBeNull();
    expect(
      findImportRowSplit({ scores: [9, 9, 8, 8], episodes: [13, 13, 13, 13] }),
    ).toBe(2);
  });
});

describe('soft bell balancing', () => {
  it('leaves small libraries and already healthy bell-like rows unchanged', () => {
    const small = [
      row('S', [10, 9.8], 1),
      row('A+', [9, 8.9, 8.8, 8.7, 8.6], 10),
      row('A', [8.4, 8.3], 30),
      row('B+', [7.8], 40),
      row('B', [7], 50),
    ];
    expect(balanceImportRows(small)).toEqual(small);
    const healthy = [
      row('S', [10, 9.8, 9.7], 1),
      row('A+', Array<number>(9).fill(9), 10),
      row('A', Array<number>(11).fill(8), 30),
      row('B+', Array<number>(9).fill(7.8), 50),
      row('B', [7.4, 7.3, 7.2], 70),
    ];
    expect(balanceImportRows(healthy)).toEqual(healthy);
  });

  it('spreads oversized rows into an A-centered shape while preserving S+, small S and C/D/F', () => {
    const before = crowded();
    before[2].series = before[2].series.map((entry, index) => ({
      ...entry,
      score: 9.49 - index * 0.04,
    }));
    before[3].series = before[3].series.map((entry, index) => ({
      ...entry,
      score: 8.49 - index * 0.02,
    }));
    const snapshot = structuredClone(before);
    const after = balanceImportRows(before);
    expect(counts(after)).toEqual([1, 3, 13, 17, 13, 3, 0, 1, 0]);
    expect(after.slice(0, 2)).toEqual(before.slice(0, 2));
    expect(after.slice(6)).toEqual(before.slice(6));
    expect(before).toEqual(snapshot);
    const flatten = (rows: ImportSeriesRow[]) =>
      rows.flatMap((entry) => entry.series).sort((a, b) => a.id - b.id);
    expect(flatten(after)).toEqual(flatten(before));
    expect(balanceImportRows(after)).toEqual(after);
  });

  it('preserves groups with identical score and episode count even when this prevents a smooth curve', () => {
    expect(counts(balanceImportRows(crowded()))).toEqual([
      1, 3, 19, 24, 2, 1, 0, 1, 0,
    ]);
    const tied = [
      row('S', [10, 9.8, 9.7], 1),
      row('A+', Array<number>(9).fill(9), 10),
      row('A', [8.4], 30),
      row('B', [7], 50),
    ];
    expect(balanceImportRows(tied)).toEqual(tied);
  });

  it('uses exact averages then episode totals for ties and never promotes a lower-ranked entry', () => {
    const before = crowded();
    before[2].series = before[2].series.map((entry, index) => ({
      ...entry,
      episodes: 100 - index,
    }));
    const after = balanceImportRows(before);
    expect(after[2].series.map((entry) => entry.id)).toEqual(
      Array.from({ length: 13 }, (_, index) => 20 + index),
    );
    after.forEach((entry, rankIndex) => {
      entry.series.forEach((anime) => {
        expect(
          before.findIndex((original) =>
            original.series.some((candidate) => candidate.id === anime.id),
          ),
        ).toBeLessThanOrEqual(rankIndex);
      });
    });
  });

  it('never redistributes B or protected lower rows even when they are very long', () => {
    const before = [
      row('S+', Array<number>(20).fill(10), 1),
      row('S', [10], 30),
      row('A+', [9], 40),
      row('A', [8], 50),
      row('B+', [7.9], 60),
      row('B', Array<number>(40).fill(7), 70),
      row('C', Array<number>(30).fill(6), 120),
      row('D', [5], 160),
      row('F', [1], 170),
    ];
    expect(balanceImportRows(before)).toEqual(before);
  });

  it('integrates soft targets into generated documents without changing ratings, images or identities', () => {
    const source = [
      series(1, 10),
      series(2, 9.8),
      series(3, 9.7),
      ...Array.from({ length: 9 }, (_, index) => ({
        ...series(10 + index, 9.4 - index / 10),
        imageUrl: '/poster.jpg',
      })),
      series(30, 8.4),
      series(31, 8.3),
      series(32, 8.2),
      series(40, 7.9),
      series(41, 7.8),
      series(50, 7.1),
    ];
    const document = malSeriesDocument(source);
    expect(document.ranks).toEqual(malImportRanks);
    expect(document.items.filter((entry) => entry.rank === 'A+')).toHaveLength(
      4,
    );
    expect(document.items.find((entry) => entry.malId === 14)).toMatchObject({
      id: 'mal-14',
      rank: 'A',
      label: 'Series 014 (9.00/10)',
      image: { src: '/poster.jpg' },
    });
    expect(malScoreRank(9, 1)).toBe('A+');
    expect(tierlistDocumentSchema.safeParse(document).success).toBe(true);
  });
});
