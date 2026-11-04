import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { MalListEntry } from '@/app/_lib/mal-import';
import {
  type AnimeImportProgress,
  generateAnimeTierlist,
} from './generate-anime-tierlist';

const anilist = vi.hoisted(() => ({ page: vi.fn(), anime: vi.fn() }));
const api = vi.hoisted(() => ({
  list: vi.fn(),
  anime: vi.fn(),
  poster: vi.fn(),
}));
vi.mock('./mal-import.actions', () => ({
  loadMalListPage: api.list,
  loadMalAnimeBatch: async (ids: number[]) => ({
    ok: true,
    value: await Promise.all(
      ids.map(async (id) => (await api.anime(id)).value),
    ),
  }),
  loadMalPosterBatch: async (titles: string[]) => ({
    ok: true,
    value: await Promise.all(
      titles.map(async (title) => (await api.poster(title)).value),
    ),
  }),
}));

const entry = (id: number, type = 'TV'): MalListEntry => ({
  anime_id: id,
  anime_title: `Anime ${id}`,
  anime_media_type_string: type,
  anime_num_episodes: 12,
  num_watched_episodes: 12,
  score: 8,
  status: 2,
});
const configure = (entries: MalListEntry[], starts: number[] = []) => {
  api.list.mockImplementation(async ({ offset }: { offset: number }) => {
    starts.push(Date.now());

    return { ok: true, value: entries.slice(offset, offset + 300) };
  });
  api.anime.mockImplementation(async (id: number) => {
    starts.push(Date.now());

    return {
      ok: true,
      value: {
        id,
        title: `Anime ${id}`,
        type: 'TV',
        episodes: 12,
        prequels: [],
      },
    };
  });
  api.poster.mockImplementation(async () => {
    starts.push(Date.now());

    return { ok: true, value: null };
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  api.list.mockReset();
  api.anime.mockReset();
  api.poster.mockReset();
});

afterEach(() => vi.useRealTimers());

it('imports more than 600 entries with batched requests, monotonic phase percentages and Auto/custom sizing', async () => {
  const starts: number[] = [];
  configure(
    Array.from({ length: 601 }, (_, index) => entry(index + 1)),
    starts,
  );
  const progress: AnimeImportProgress[] = [];
  const task = generateAnimeTierlist({
    username: 'Abkenn',
    signal: new AbortController().signal,
    onProgress: (value) => progress.push(value),
  });
  await vi.runAllTimersAsync();
  const result = await task;
  expect(result.series).toHaveLength(601);
  expect(result.document).toMatchObject({
    imageMode: 'natural',
    posterSize: 'dynamic',
  });
  expect(api.anime).toHaveBeenCalledTimes(601);
  expect(
    starts.slice(1).every((start, index) => start - starts[index] === 0),
  ).toBe(true);
  expect(progress[0]).toEqual({ phase: 'Reading list', percent: null });
  for (const phase of [
    'Checking seasons',
    'Finding posters',
    'Loading posters',
  ]) {
    const values = progress
      .filter((value) => value.phase === phase)
      .map((value) => value.percent);
    expect(values[0]).toBe(0);
    expect(values.at(-1)).toBe(100);
    expect(
      values.every(
        (value, index) => value !== null && value >= (values[index - 1] ?? 0),
      ),
    ).toBe(true);
  }
});

it('continues paginating beyond 5,000 entries rather than rejecting the profile', async () => {
  configure([
    entry(1),
    ...Array.from({ length: 5400 }, (_, index) => entry(index + 2, 'Movie')),
  ]);
  const task = generateAnimeTierlist({
    username: 'Abkenn',
    signal: new AbortController().signal,
    onProgress: () => {},
  });
  await vi.runAllTimersAsync();
  expect((await task).completed).toBe(5401);
  expect(api.list).toHaveBeenCalledWith({ username: 'Abkenn', offset: 5400 });
  expect(api.anime).toHaveBeenCalledTimes(1);
});

it('deduplicates cyclic season relationships and repeated entries without artificial size limits', async () => {
  configure([entry(1), entry(2)]);
  api.anime.mockImplementation(async (id: number) => ({
    ok: true,
    value: {
      id,
      title: `Anime ${id}`,
      type: 'TV',
      episodes: 12,
      prequels: [id === 1 ? 2 : 1],
    },
  }));
  const task = generateAnimeTierlist({
    username: 'Abkenn',
    signal: new AbortController().signal,
    onProgress: () => {},
  });
  await vi.runAllTimersAsync();
  expect((await task).series).toHaveLength(1);
  expect(api.anime).toHaveBeenCalledTimes(2);
});

it('cancels before issuing any server request', async () => {
  configure([entry(1)]);
  const controller = new AbortController();
  controller.abort();
  await expect(
    generateAnimeTierlist({
      username: 'Abkenn',
      signal: controller.signal,
      onProgress: () => {},
    }),
  ).rejects.toMatchObject({ name: 'AbortError' });
  expect(api.list).not.toHaveBeenCalled();
});

it('reuses saved relationships and poster lookups while honoring changed scores and removed entries', async () => {
  configure([entry(1), entry(2)]);
  const input = {
    username: 'Abkenn',
    signal: new AbortController().signal,
    onProgress: () => {},
  };
  const first = await generateAnimeTierlist(input);
  api.anime.mockClear();
  api.poster.mockClear();
  configure([{ ...entry(1), score: 10 }]);
  const next = await generateAnimeTierlist({
    ...input,
    history: first.document.malImport,
  });
  expect(api.anime).not.toHaveBeenCalled();
  expect(api.poster).not.toHaveBeenCalled();
  expect(next.series).toHaveLength(1);
  expect(next.series[0].score).toBe(10);
  configure([entry(1), entry(3)]);
  await generateAnimeTierlist({ ...input, history: first.document.malImport });
  expect(api.anime).toHaveBeenCalledTimes(1);
  expect(api.anime).toHaveBeenCalledWith(3);
});

it('stops a provider that repeats a page instead of paginating forever', async () => {
  configure([entry(1)]);
  api.list.mockResolvedValue({ ok: true, value: [entry(1)] });
  const task = generateAnimeTierlist({
    username: 'Abkenn',
    signal: new AbortController().signal,
    onProgress: () => {},
  });
  const rejected = expect(task).rejects.toThrow('repeated list page');
  await vi.runAllTimersAsync();
  await rejected;
  expect(api.list).toHaveBeenCalledTimes(2);
});

vi.mock('./anilist-import.actions', () => ({
  loadAnilistPage: anilist.page,
  loadAnilistAnimeBatch: anilist.anime,
}));

it('selects AniList, reuses list metadata, follows missing prequels and separates colliding provider IDs', async () => {
  configure([entry(1)]);
  const input = {
    username: 'Example',
    signal: new AbortController().signal,
    onProgress: () => {},
  };
  const mal = await generateAnimeTierlist(input);
  const catalog = [
    {
      id: 1,
      malId: 101,
      title: 'Earlier',
      type: 'TV',
      episodes: 10,
      prequels: [],
    },
    {
      id: 2,
      malId: 102,
      title: 'Later',
      type: 'TV',
      episodes: 31,
      prequels: [3],
    },
    { id: 3, title: 'Movie bridge', type: 'MOVIE', episodes: 1, prequels: [1] },
  ];
  const entries = [
    {
      id: 1,
      title: 'Earlier',
      format: 'TV',
      episodes: 10,
      watchedEpisodes: 10,
      completed: true,
      score: 10,
    },
    {
      id: 2,
      title: 'Later',
      format: 'TV',
      episodes: 31,
      watchedEpisodes: 31,
      completed: true,
      score: 8.5,
    },
  ];
  anilist.page.mockResolvedValue({
    ok: true,
    value: { entries, catalog: catalog.slice(0, 2), hasNext: false },
  });
  anilist.anime.mockResolvedValue({ ok: true, value: [catalog[2]] });
  const result = await generateAnimeTierlist({
    ...input,
    provider: 'anilist',
    histories: mal.document.animeImports,
  });
  expect(anilist.anime).toHaveBeenCalledWith([3]);
  expect(result.series).toHaveLength(1);
  expect(result.series[0]).toMatchObject({
    episodes: 41,
    score: (100 + 31 * 8.5) / 41,
  });
  expect(result.document.items[0]).toMatchObject({
    id: 'anilist-1',
    malId: 101,
  });
  expect(result.document.animeImports?.mal).toEqual(
    mal.document.animeImports?.mal,
  );
  anilist.anime.mockClear();
  await generateAnimeTierlist({
    ...input,
    provider: 'anilist',
    histories: result.document.animeImports,
  });
  expect(anilist.anime).not.toHaveBeenCalled();
});

it('resumes failed generation without repeating completed pages or metadata batches', async () => {
  configure(Array.from({ length: 12 }, (_, index) => entry(index + 1)));
  const original = api.anime.getMockImplementation();
  api.anime.mockImplementation(async (id: number) => {
    if (id === 9) {
      throw new Error('Catalog request timed out.');
    }
    return original?.(id);
  });
  let checkpoint:
    | import('@/app/_lib/anime-import-checkpoint').AnimeImportCheckpoint
    | undefined;
  const input = {
    username: 'Abkenn',
    signal: new AbortController().signal,
    onProgress: () => {},
    onCheckpoint: async (
      value: import('@/app/_lib/anime-import-checkpoint').AnimeImportCheckpoint,
    ) => {
      checkpoint = value;
    },
  };
  await expect(generateAnimeTierlist(input)).rejects.toThrow('timed out');
  expect(checkpoint?.catalog).toHaveLength(8);
  expect(checkpoint?.listComplete).toBe(true);
  api.list.mockClear();
  api.anime.mockClear();
  api.anime.mockImplementation(original ?? (() => {}));
  const result = await generateAnimeTierlist({ ...input, checkpoint });
  expect(result.series).toHaveLength(12);
  expect(api.list).not.toHaveBeenCalled();
  expect(api.anime).toHaveBeenCalledTimes(4);
  expect(api.anime.mock.calls.map(([id]) => id)).toEqual([9, 10, 11, 12]);
});
