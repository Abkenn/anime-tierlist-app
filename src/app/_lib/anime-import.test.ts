import { describe, expect, it } from 'vitest';
import { type ImportSeries, importSeriesDocument } from './anime-import';

const series = (id: number, score: number): ImportSeries => ({
  id,
  title: `Series ${id}`,
  score,
  episodes: 13,
  seasons: 1,
  seasonIds: [id],
});

describe('large import ranks', () => {
  it('adds minus rows only above 1000 total series and subdivides lower letter ranges', () => {
    const scores = [8.25, 8, 7.25, 7, 6.25, 6, 5.25, 5];
    const entries = scores.map((score, id) => series(id, score));
    entries.push(...Array.from({ length: 992 }, (_, id) => series(id + 8, 10)));
    expect(importSeriesDocument(entries, 'mal').ranks).not.toContain('A−');
    entries.push({ ...series(1000, 0), status: 'watching' });
    const document = importSeriesDocument(entries, 'mal');
    expect(document.ranks).toEqual([
      'S+',
      'S',
      'A+',
      'A',
      'A−',
      'B+',
      'B',
      'B−',
      'C+',
      'C',
      'C−',
      'D+',
      'D',
      'D−',
      'F',
      'Dropped',
      'Watching',
    ]);
    expect(
      scores.map(
        (_, id) => document.items.find((item) => item.id === `mal-${id}`)?.rank,
      ),
    ).toEqual(['A', 'A−', 'B', 'B−', 'C', 'C−', 'D', 'D−']);
    expect(document.items).toHaveLength(1001);
  });

  it('expands only above 100 unique series, including Watching and Dropped', () => {
    const rated = Array.from({ length: 99 }, (_, id) => series(id, 6.5));
    const dropped: ImportSeries = { ...series(100, 0), status: 'dropped' };
    const watching: ImportSeries = { ...series(101, 0), status: 'watching' };
    const small = importSeriesDocument([...rated, dropped], 'mal');
    expect(small.ranks).not.toContain('C+');
    expect(small.ranks).not.toContain('D+');
    expect(small.items[0].rank).toBe('C');
    const large = importSeriesDocument([...rated, dropped, watching], 'mal');
    expect(large.ranks).toEqual([
      'S+',
      'S',
      'A+',
      'A',
      'B+',
      'B',
      'C+',
      'C',
      'D+',
      'D',
      'F',
      'Dropped',
      'Watching',
    ]);
    expect(large.items.filter((item) => item.rank === 'C+')).toHaveLength(99);
    expect(large.items.find((item) => item.id === 'mal-100')?.rank).toBe(
      'Dropped',
    );
    expect(large.items.find((item) => item.id === 'mal-101')?.rank).toBe(
      'Watching',
    );
  });

  it('splits lower score ranges without rounding or losing items for either provider', () => {
    for (const provider of ['mal', 'anilist'] as const) {
      const scores = [7, 6.999, 6.5, 6.499, 6, 5.999, 5.5, 5.499, 5, 4.999];
      const entries = scores.map((score, id) => series(id, score));
      entries.push(
        ...Array.from({ length: 91 }, (_, id) => series(id + 10, 10)),
      );
      const document = importSeriesDocument(entries, provider);
      expect(document.items).toHaveLength(101);
      expect(new Set(document.items.map((item) => item.id)).size).toBe(101);
      expect(
        scores.map(
          (_, id) =>
            document.items.find((item) => item.id === `${provider}-${id}`)
              ?.rank,
        ),
      ).toEqual(['B', 'C+', 'C+', 'C', 'C', 'D+', 'D+', 'D', 'D', 'F']);
    }
  });
});
