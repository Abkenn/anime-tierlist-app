import { expect, it, vi } from 'vitest';
import { readMalAnime } from './mal-import';

const provider = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('./tenrai-api', () => ({ tenraiApi: { get: provider.get } }));
vi.mock('./mal-api', () => ({ malApi: {} }));
vi.mock('./anime-search', () => ({ searchAnimePage: vi.fn() }));

it('paces uncached requests within the provider limit and releases concurrency slots after failure', async () => {
  vi.useFakeTimers();
  const finish: (() => void)[] = [];
  provider.get.mockImplementation(() => ({
    json: () => new Promise<void>((resolve) => finish.push(resolve)),
  }));
  // Invalid provider responses intentionally fail parsing, exercising slot cleanup too.
  const settled = Promise.allSettled(
    Array.from({ length: 8 }, (_, index) => readMalAnime(index + 1)),
  );
  expect(provider.get).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(900);
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
