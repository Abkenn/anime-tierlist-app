import { describe, expect, it } from 'vitest';
import {
  eligibleMalEntry,
  groupMalSeries,
  type MalAnime,
  type MalListEntry,
  malScoreRank,
  malSeriesDocument,
} from './mal-import';
import { tierlistDocumentSchema } from './tierlist-sync';

const entry = (
  id: number,
  score = 9,
  episodes = 13,
  extra: Partial<MalListEntry> = {},
): MalListEntry => ({
  anime_id: id,
  anime_title: `Series ${id}`,
  anime_media_type_string: 'TV',
  anime_num_episodes: episodes,
  num_watched_episodes: episodes,
  status: 2,
  score,
  ...extra,
});
const anime = (
  id: number,
  episodes = 13,
  prequels: number[] = [],
  extra: Partial<MalAnime> = {},
): MalAnime => ({
  id,
  title: `Series ${id}`,
  type: 'TV',
  episodes,
  prequels,
  ...extra,
});

describe('MAL series generation', () => {
  it('includes completed scored TV and episodic ONA, excluding movies, OVAs, single-episode ONAs and unscored/incomplete entries', () => {
    expect(eligibleMalEntry(entry(1))).toBe(true);
    expect(
      eligibleMalEntry(entry(1, 9, 8, { anime_media_type_string: 'ONA' })),
    ).toBe(true);
    for (const type of ['Movie', 'OVA', 'Special', 'TV Special', 'Music']) {
      expect(
        eligibleMalEntry(entry(1, 9, 12, { anime_media_type_string: type })),
      ).toBe(false);
    }
    expect(
      eligibleMalEntry(entry(1, 9, 1, { anime_media_type_string: 'ONA' })),
    ).toBe(false);
    expect(eligibleMalEntry(entry(1, 0))).toBe(false);
    expect(eligibleMalEntry(entry(1, 9, 13, { status: 1 }))).toBe(false);
  });

  it('weights each scored completed season by episodes without rounding before ranking', () => {
    const result = groupMalSeries(
      [entry(1, 10, 10), entry(2, 8, 30), entry(3, 0, 99)],
      [anime(1, 10), anime(2, 30, [1]), anime(3, 99, [2])],
    );
    expect(result).toMatchObject([
      { id: 1, score: 8.5, episodes: 40, seasons: 2 },
    ]);
    expect(malSeriesDocument(result).items[0].rank).toBe('A+');
    const below = groupMalSeries(
      [entry(1, 10, 10), entry(2, 8, 31)],
      [anime(1, 10), anime(2, 31, [1])],
    );
    expect(below[0].score).toBeCloseTo(8.487804878);
    expect(malSeriesDocument(below).items[0].rank).toBe('A');
  });

  it('groups renamed seasons across movie bridges and missing seasons without counting those entries', () => {
    const catalog = [
      anime(4, 12, [3], { title: 'A different title' }),
      anime(1, 13),
      anime(2, 1, [1], { type: 'Movie' }),
      anime(3, 12, [2]),
    ];
    const result = groupMalSeries(
      [
        entry(1, 10),
        entry(2, 1, 1, { anime_media_type_string: 'Movie' }),
        entry(4, 8, 12),
      ],
      catalog,
    );
    expect(result).toMatchObject([
      { id: 1, episodes: 25, seasons: 2, score: 9.04 },
    ]);
    expect(result[0].seasonIds).toEqual([1, 4]);
  });

  it('uses exact score, then total episodes, then title for stable left-to-right order', () => {
    const result = groupMalSeries(
      [
        entry(1, 9, 13),
        entry(2, 9, 23),
        entry(3, 9, 12),
        entry(4, 9, 12),
        entry(5, 10, 1),
      ],
      [
        anime(1, 13),
        anime(2, 23),
        anime(3, 12),
        anime(4, 12, [3]),
        anime(5, 1),
      ],
    );
    expect(result.map((series) => series.id)).toEqual([5, 3, 2, 1]);
    expect(result.map((series) => series.episodes)).toEqual([1, 24, 23, 13]);
    expect(
      tierlistDocumentSchema.safeParse(malSeriesDocument(result)).success,
    ).toBe(true);
  });

  it('does not double-count duplicate list entries and fails closed on missing metadata/counts', () => {
    expect(groupMalSeries([entry(1), entry(1)], [anime(1)])[0].seasons).toBe(1);
    expect(() => groupMalSeries([entry(1)], [])).toThrow('metadata');
    expect(() => groupMalSeries([entry(1, 9, 0)], [anime(1, 0)])).toThrow(
      'episode count',
    );
    expect(groupMalSeries([entry(1, 9, 12)], [anime(1, 0)])[0].episodes).toBe(
      12,
    );
  });

  it.each([
    [10, 2, 'S+'],
    [10, 1, 'S'],
    [9.5, 2, 'S'],
    [9.4999, 2, 'A+'],
    [8.5, 1, 'A+'],
    [8.4999, 1, 'A'],
    [8, 1, 'A'],
    [7.9999, 1, 'B+'],
    [7.5, 1, 'B+'],
    [7.4999, 1, 'B'],
    [7, 1, 'B'],
    [6.9999, 1, 'C'],
    [6, 1, 'C'],
    [5.9999, 1, 'D'],
    [5, 1, 'D'],
    [4.9999, 1, 'F'],
  ])('maps %s over %s seasons to %s', (score, seasons, rank) => {
    expect(malScoreRank(Number(score), Number(seasons))).toBe(rank);
  });
});
