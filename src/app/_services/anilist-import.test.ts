import { stringifyDocument } from '@urql/core';
import { beforeEach, expect, it, vi } from 'vitest';
import { readAnilistAnime, readAnilistPage } from './anilist-import';

const api = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('./anilist-api', () => ({ queryAnilist: api.query }));
beforeEach(() => api.query.mockReset());

const media = {
  id: 7,
  idMal: 42,
  type: 'ANIME',
  format: 'ONA',
  episodes: 12,
  title: { romaji: 'Series' },
  coverImage: { large: 'https://example.com/poster.jpg' },
  relations: { edges: [] },
};
it('paginates public completed lists and requests normalized decimal scores without caching user ratings', async () => {
  api.query.mockResolvedValue({
    data: {
      Page: {
        pageInfo: { hasNextPage: true },
        mediaList: [{ status: 'COMPLETED', score: 8.6, progress: 12, media }],
      },
    },
  });
  expect(await readAnilistPage('Example', 2)).toMatchObject({
    hasNext: true,
    entries: [{ id: 7, score: 8.6, completed: true }],
    catalog: [{ id: 7, malId: 42 }],
  });
  expect(stringifyDocument(api.query.mock.calls[0][0])).toContain(
    'score(format: POINT_10_DECIMAL)',
  );
  expect(api.query.mock.calls[0][1]).toEqual({ username: 'Example', page: 2 });
});
it('rejects partial GraphQL failures and missing relationship metadata', async () => {
  api.query.mockResolvedValueOnce({
    data: { Page: { pageInfo: { hasNextPage: false }, mediaList: [] } },
    errors: [{ message: 'Private User' }],
  });
  await expect(readAnilistPage('Private', 1)).rejects.toThrow(
    'AniList profile',
  );
  api.query.mockResolvedValueOnce({ data: { Page: { media: [media] } } });
  await expect(readAnilistAnime([7, 8])).rejects.toThrow(
    'metadata is unavailable',
  );
});
