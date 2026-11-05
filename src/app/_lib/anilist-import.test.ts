import { expect, it } from 'vitest';
import {
  anilistListEntrySchema,
  normalizeAnilistAnime,
  normalizeAnilistEntry,
} from './anilist-import';
import { groupImportSeries, importSeriesDocument } from './anime-import';

const media = (id: number, episodes: number, format = 'TV') => ({
  id,
  idMal: id + 100,
  type: 'ANIME',
  format,
  episodes,
  title: { romaji: `Anime ${id}`, english: null, native: null },
  coverImage: { extraLarge: null, large: null },
  relations: { edges: [] },
});
it('normalizes decimal scores, short TV, ONA, nullable MAL IDs and anime-only prequels', () => {
  const source = {
    ...media(7, 12, 'TV_SHORT'),
    idMal: null,
    relations: {
      edges: [
        { relationType: 'PREQUEL', node: { id: 1, type: 'ANIME' } },
        { relationType: 'PREQUEL', node: { id: 2, type: 'MANGA' } },
        { relationType: 'SIDE_STORY', node: { id: 3, type: 'ANIME' } },
      ],
    },
  };
  const normalized = normalizeAnilistAnime(source);
  expect(normalized).toMatchObject({
    id: 7,
    title: 'Anime 7',
    type: 'TV',
    prequels: [1],
  });
  expect(normalized).not.toHaveProperty('malId');
  const entry = normalizeAnilistEntry(
    anilistListEntrySchema.parse({
      status: 'COMPLETED',
      score: 8.7,
      progress: 12,
      media: source,
    }),
  );
  expect(entry).toMatchObject({ completed: true, score: 8.7, episodes: 12 });
});
it('shares weighted scores and filtering without confusing AniList IDs with MAL IDs', () => {
  const a = media(1, 10);
  const b = {
    ...media(2, 31),
    relations: {
      edges: [{ relationType: 'PREQUEL', node: { id: 1, type: 'ANIME' } }],
    },
  };
  const sources = [
    a,
    b,
    media(3, 1, 'ONA'),
    media(4, 12, 'OVA'),
    media(5, 12, 'ONA'),
  ];
  const entries = sources.map((source, index) =>
    normalizeAnilistEntry({
      status: 'COMPLETED',
      score: index === 0 ? 10 : 8,
      progress: source.episodes,
      media: source,
    }),
  );
  const series = groupImportSeries(entries, sources.map(normalizeAnilistAnime));
  expect(series).toHaveLength(2);
  expect(series.find((entry) => entry.id === 1)).toMatchObject({
    score: 348 / 41,
    episodes: 41,
    seasons: 2,
  });
  const document = importSeriesDocument(series, 'anilist');
  expect(document.items.find((entry) => entry.id === 'anilist-1')?.malId).toBe(
    101,
  );
  const missing = importSeriesDocument(
    [
      {
        id: 9,
        title: 'Unmapped',
        score: 8,
        episodes: 12,
        seasons: 1,
        seasonIds: [9],
      },
    ],
    'anilist',
  );
  expect(missing.items[0]).not.toHaveProperty('malId');
});

it('maps AniList current and repeating to Watching, Dropped separately, and skips paused/planning', () => {
  const statuses = ['CURRENT', 'REPEATING', 'DROPPED', 'PAUSED', 'PLANNING'];
  const sources = statuses.map((status, index) => ({
    status,
    score: 0,
    progress: 3,
    media: media(index + 1, 12),
  }));
  const series = groupImportSeries(
    sources.map(normalizeAnilistEntry),
    sources.map((entry) => normalizeAnilistAnime(entry.media)),
  );
  const document = importSeriesDocument(series, 'anilist');
  expect(
    document.items.filter((item) => item.rank === 'Watching'),
  ).toHaveLength(2);
  expect(document.items.filter((item) => item.rank === 'Dropped')).toHaveLength(
    1,
  );
  expect(document.items).toHaveLength(3);
  expect(document.items.every((item) => !item.label.includes('/10'))).toBe(
    true,
  );
});
