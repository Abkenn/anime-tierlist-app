import { afterEach, beforeEach, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(0);
});
afterEach(() => vi.useRealTimers());
it('retries a provider 429 after Retry-After instead of aborting the import', async () => {
  const { tenraiApi } = await import('./tenrai-api');
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      new Response('{}', { status: 429, headers: { 'retry-after': '1' } }),
    )
    .mockResolvedValueOnce(
      new Response('{"data":[]}', {
        headers: { 'content-type': 'application/json' },
      }),
    );
  const result = tenraiApi.get('anime/1/full', { fetch: request }).json();
  const resolved = expect(result).resolves.toEqual({ data: [] });
  await vi.runAllTimersAsync();
  await resolved;
  expect(request).toHaveBeenCalledTimes(2);
});
it('preserves a useful catalog error before cached function boundaries serialize it', async () => {
  const { tenraiApi } = await import('./tenrai-api');
  const result = tenraiApi
    .get('anime/1/full', {
      fetch: vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response('{}', { status: 503 })),
    })
    .json();
  const rejected = expect(result).rejects.toThrow(
    'Catalog request failed (503)',
  );
  await vi.runAllTimersAsync();
  await rejected;
});
