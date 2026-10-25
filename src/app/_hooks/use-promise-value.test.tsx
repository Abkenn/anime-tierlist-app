import { act, renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { usePromiseValue } from './use-promise-value';

it('waits without suspending and ignores an older promise after replacement', async () => {
  const first = Promise.withResolvers<number>();
  const second = Promise.withResolvers<number>();
  const { result, rerender } = renderHook(
    ({ source }) => usePromiseValue(source, -1),
    { initialProps: { source: first.promise } },
  );

  expect(result.current).toBeNull();
  rerender({ source: second.promise });
  await act(async () => {
    first.resolve(1);
  });
  expect(result.current).toBeNull();
  await act(async () => {
    second.resolve(2);
  });
  expect(result.current).toBe(2);
});

it('uses the rejection fallback and accepts a missing promise', async () => {
  const source = Promise.withResolvers<string>();
  const { result } = renderHook(() =>
    usePromiseValue(source.promise, 'unavailable'),
  );

  await act(async () => {
    source.reject(new Error('Disconnected'));
  });
  expect(result.current).toBe('unavailable');
  const absent = renderHook(() => usePromiseValue(undefined, 'unavailable'));

  expect(absent.result.current).toBeNull();
});
