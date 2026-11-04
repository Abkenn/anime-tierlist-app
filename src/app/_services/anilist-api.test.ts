import { gql } from '@urql/core';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const request = vi.hoisted(() => vi.fn());
vi.mock('server-only', () => ({}));
vi.mock('ky', async (original) => ({
  ...(await original<typeof import('ky')>()),
  default: { create: () => request },
}));
beforeEach(() => {
  vi.resetModules();
  request.mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(0);
});
afterEach(() => vi.useRealTimers());

const query = gql<
  { User: { id: number } },
  { name: string }
>`query ($name: String!) { User(name: $name) { id } }`;
it('runs urql over ky with POST variables and no cross-request document cache', async () => {
  const { queryAnilist } = await import('./anilist-api');
  request.mockImplementation(
    async () =>
      new Response('{"data":{"User":{"id":7}}}', {
        headers: { 'content-type': 'application/json' },
      }),
  );
  expect(await queryAnilist(query, { name: 'Example' })).toEqual({
    data: { User: { id: 7 } },
    errors: undefined,
  });
  const options = request.mock.calls[0][1];
  expect(options.method).toBe('POST');
  expect(JSON.parse(options.body).variables).toEqual({ name: 'Example' });
  const second = queryAnilist(query, { name: 'Example' });
  await vi.runAllTimersAsync();
  await second;
  expect(request).toHaveBeenCalledTimes(2);
});
it('preserves GraphQL errors and reports rate limits clearly', async () => {
  const { queryAnilist } = await import('./anilist-api');
  request.mockResolvedValueOnce(
    new Response('{"data":null,"errors":[{"message":"Private User"}]}', {
      headers: { 'content-type': 'application/json' },
    }),
  );
  expect(await queryAnilist(query, { name: 'Private' })).toMatchObject({
    errors: [{ message: 'Private User' }],
  });
  request.mockResolvedValueOnce(
    new Response('{"errors":[{"message":"Too Many Requests"}]}', {
      status: 429,
      headers: { 'retry-after': '30', 'content-type': 'application/json' },
    }),
  );
  const task = queryAnilist(query, { name: 'Example' });
  const rejected = expect(task).rejects.toThrow('AniList rate limit reached');
  await vi.runAllTimersAsync();
  await rejected;
});
