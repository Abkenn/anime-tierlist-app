import { afterEach, expect, it, vi } from 'vitest';
import { createTenraiPacer } from './tenrai-rate-limit';

afterEach(() => vi.useRealTimers());
it('keeps short bursts fast while respecting both rolling-second and minute budgets', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  const pacer = createTenraiPacer();
  const starts: number[] = [];
  const tasks = Array.from({ length: 230 }, async () => {
    await pacer.wait();
    starts.push(Date.now());
  });
  await vi.runAllTimersAsync();
  await Promise.all(tasks);
  expect(starts[1]).toBe(300);
  expect(starts[109]).toBe(32_700);
  expect(starts[110]).toBe(60_000);
  for (const start of starts) {
    expect(
      starts.filter((value) => value >= start && value < start + 1000).length,
    ).toBeLessThanOrEqual(4);
    expect(
      starts.filter((value) => value >= start && value < start + 60_000).length,
    ).toBeLessThanOrEqual(110);
  }
});
it('honors provider Retry-After cooldowns', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  const pacer = createTenraiPacer();
  pacer.defer('13');
  let finished = false;
  const task = pacer.wait().then(() => {
    finished = true;
  });
  await vi.advanceTimersByTimeAsync(12_999);
  expect(finished).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  await task;
  expect(finished).toBe(true);
});
