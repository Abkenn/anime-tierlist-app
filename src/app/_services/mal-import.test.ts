import { expect, it, vi } from 'vitest';
import { readMalAnime, readMalListPage } from './mal-import';

const provider = vi.hoisted(() => ({ get: vi.fn(), list: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('./tenrai-api', () => ({ tenraiApi: { get: provider.get } }));
vi.mock('./mal-api', () => ({ malApi: { get: provider.list } }));
vi.mock('./anime-search', () => ({ searchAnimePage: vi.fn() }));

it('bounds catalog concurrency and releases slots after failure', async () => {
  vi.useFakeTimers();
  const finish: (() => void)[] = [];
  provider.get.mockImplementation(() => ({
    json: () => new Promise<void>((resolve) => finish.push(resolve)),
  }));
  // Invalid provider responses intentionally fail parsing, exercising slot cleanup too.
  const settled = Promise.allSettled(
    Array.from({ length: 8 }, (_, index) => readMalAnime(index + 1)),
  );
  expect(provider.get).toHaveBeenCalledTimes(4);
  finish.splice(0).forEach((resolve) => {
    resolve();
  });
  await vi.runAllTimersAsync();
  expect(provider.get).toHaveBeenCalledTimes(8);
  finish.splice(0).forEach((resolve) => {
    resolve();
  });
  expect((await settled).every((result) => result.status === 'rejected')).toBe(
    true,
  );
  const last = readMalAnime(9);
  const rejection = expect(last).rejects.toBeDefined();
  await vi.runAllTimersAsync();
  expect(provider.get).toHaveBeenCalledTimes(9);
  finish.splice(0).forEach((resolve) => {
    resolve();
  });
  await rejection;
  vi.useRealTimers();
});

it('distinguishes a rejected MAL profile from a provider outage or unreadable response', async () => {
  provider.list.mockResolvedValueOnce(new Response('{}', { status: 400 }));
  await expect(readMalListPage('Example', 0)).rejects.toThrow(
    'Check the exact profile username',
  );
  provider.list.mockResolvedValueOnce(new Response('{}', { status: 503 }));
  await expect(readMalListPage('Example', 0)).rejects.toThrow(
    'temporarily unavailable',
  );
  provider.list.mockResolvedValueOnce(new Response('<html>Challenge</html>'));
  await expect(readMalListPage('Example', 0)).rejects.toThrow(
    'readable public anime list',
  );
});
