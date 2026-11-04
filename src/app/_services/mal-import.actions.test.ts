import { runInNewContext } from 'node:vm';
import { beforeEach, expect, it, vi } from 'vitest';
import { loadMalAnimeBatch, loadMalListPage } from './mal-import.actions';

const provider = vi.hoisted(() => ({ list: vi.fn(), anime: vi.fn() }));
vi.mock('./mal-import', () => ({
  readMalListPage: provider.list,
  readMalAnime: provider.anime,
  readMalSeriesPoster: vi.fn(),
}));

beforeEach(() => provider.list.mockReset());

it('accepts page offsets beyond the former 5,000-entry cap', async () => {
  provider.list.mockResolvedValue([]);
  expect(await loadMalListPage({ username: 'Abkenn', offset: 5400 })).toEqual({
    ok: true,
    value: [],
  });
  expect(provider.list).toHaveBeenCalledWith('Abkenn', 5400);
});

it('recognizes real cross-realm errors with Error.isError while rejecting message-shaped objects', async () => {
  const error: unknown = runInNewContext(
    'new Error("MAL profile is private.")',
  );
  expect(error instanceof Error).toBe(false);
  provider.list.mockRejectedValueOnce(error);
  expect(
    await loadMalListPage({ username: 'Abkenn', offset: 0 }),
  ).toMatchObject({ ok: false, message: 'MAL profile is private.' });
  provider.list.mockRejectedValueOnce({
    message: 'MAL pretend error with private details',
  });
  expect(
    await loadMalListPage({ username: 'Abkenn', offset: 0 }),
  ).toMatchObject({
    ok: false,
    message:
      'Unable to load MAL data. The provider may be busy. Try again shortly.',
  });
});

it('batches season lookups with at most four simultaneous provider calls', async () => {
  let active = 0;
  let maximum = 0;
  provider.anime.mockImplementation(async (id: number) => {
    active += 1;
    maximum = Math.max(maximum, active);
    await Promise.resolve();
    active -= 1;
    return { id };
  });
  const result = await loadMalAnimeBatch([1, 2, 3, 4, 5, 6, 7, 8]);
  expect(result).toMatchObject({
    ok: true,
    value: Array.from({ length: 8 }, (_, index) => ({ id: index + 1 })),
  });
  expect(maximum).toBe(4);
  expect(
    await loadMalAnimeBatch(Array.from({ length: 9 }, (_, index) => index + 1)),
  ).toMatchObject({ ok: false });
});
