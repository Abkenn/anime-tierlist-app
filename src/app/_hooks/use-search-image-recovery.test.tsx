import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useSearchImageRecovery } from './use-search-image-recovery';

afterEach(() => vi.useRealTimers());

it('retries failed posters at ten-second intervals and stops after three attempts', () => {
  vi.useFakeTimers();
  const onRetry = vi.fn();
  const { result } = renderHook(() =>
    useSearchImageRecovery({ scope: 'oshi', failedIds: ['broken'], onRetry }),
  );

  act(() => vi.advanceTimersByTime(9_999));
  expect(onRetry).not.toHaveBeenCalled();

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    act(() => vi.advanceTimersByTime(attempt === 1 ? 1 : 10_000));
    expect(result.current['oshi:broken']).toBe(attempt);
  }

  act(() => vi.advanceTimersByTime(60_000));
  expect(onRetry).toHaveBeenCalledTimes(3);
  expect(onRetry).toHaveBeenLastCalledWith(['broken']);
});

it('cancels pending recovery when results are hidden or the search changes', () => {
  vi.useFakeTimers();
  const onRetry = vi.fn();
  const { rerender } = renderHook(
    ({ scope, failedIds }) =>
      useSearchImageRecovery({ scope, failedIds, onRetry }),
    { initialProps: { scope: 'old search', failedIds: ['broken'] } },
  );

  act(() => vi.advanceTimersByTime(5_000));
  rerender({ scope: 'new search', failedIds: [] });
  act(() => vi.advanceTimersByTime(60_000));

  expect(onRetry).not.toHaveBeenCalled();
});
