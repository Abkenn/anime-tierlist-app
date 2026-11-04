import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { MalListEntry } from '@/app/_lib/mal-import';
import {
  generateMalTierlist,
  type MalImportProgress,
} from './generate-mal-tierlist';

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
  const progress: MalImportProgress[] = [];
  const task = generateMalTierlist({
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
  const task = generateMalTierlist({
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
  const task = generateMalTierlist({
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
    generateMalTierlist({
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
  const first = await generateMalTierlist(input);
  api.anime.mockClear();
  api.poster.mockClear();
  configure([{ ...entry(1), score: 10 }]);
  const next = await generateMalTierlist({
    ...input,
    history: first.document.malImport,
  });
  expect(api.anime).not.toHaveBeenCalled();
  expect(api.poster).not.toHaveBeenCalled();
  expect(next.series).toHaveLength(1);
  expect(next.series[0].score).toBe(10);
  configure([entry(1), entry(3)]);
  await generateMalTierlist({ ...input, history: first.document.malImport });
  expect(api.anime).toHaveBeenCalledTimes(1);
  expect(api.anime).toHaveBeenCalledWith(3);
});

it('stops a provider that repeats a page instead of paginating forever', async () => {
  configure([entry(1)]);
  api.list.mockResolvedValue({ ok: true, value: [entry(1)] });
  const task = generateMalTierlist({
    username: 'Abkenn',
    signal: new AbortController().signal,
    onProgress: () => {},
  });
  const rejected = expect(task).rejects.toThrow('repeated list page');
  await vi.runAllTimersAsync();
  await rejected;
  expect(api.list).toHaveBeenCalledTimes(2);
});
