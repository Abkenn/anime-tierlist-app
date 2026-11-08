import { beforeEach, expect, it, vi } from 'vitest';
import { pollAnimeImportQueue } from './anime-import-queue.actions';

const mocks = vi.hoisted(() => ({
  queue: vi.fn(),
  metric: vi.fn(),
  limit: vi.fn(),
  identity: vi.fn(),
}));

vi.mock('@/app/_data/mutations/anime-import-queue', () => ({
  updateAnimeImportQueue: mocks.queue,
}));
vi.mock('@/app/_data/mutations/anime-import-metrics', () => ({
  recordAnimeImportMetric: mocks.metric,
}));
vi.mock('@/app/_data/mutations/tierlist', () => ({
  consumeTierlistRateLimit: mocks.limit,
}));
vi.mock('./google-session', () => ({ getGoogleIdentity: mocks.identity }));
vi.mock('./tierlist-identity', () => ({
  hashTierlistSecret: (value: string) => `hashed:${value}`,
}));

const input = {
  seed: 'a'.repeat(64),
  ticket: '9d3ff389-a00a-4bbc-b9d0-44853fa712c3',
  provider: 'mal',
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.identity.mockResolvedValue(null);
  mocks.limit.mockResolvedValue(true);
  mocks.queue.mockResolvedValue({
    position: 2,
    depth: 3,
    joined: true,
    observedAt: 1000n,
  });
  mocks.metric.mockResolvedValue(undefined);
});

it('preserves queue behavior if metrics storage is unavailable', async () => {
  mocks.metric.mockRejectedValue(new Error('table unavailable'));
  await expect(pollAnimeImportQueue(input)).resolves.toEqual({
    ok: true,
    value: { position: 2 },
  });
});

it('records Apply with the server-derived account identity without rejoining', async () => {
  mocks.identity.mockResolvedValue({ ownerId: 'account-owner' });
  await pollAnimeImportQueue({
    ...input,
    event: 'applied',
    ownerKey: 'forged',
  });
  expect(mocks.queue).not.toHaveBeenCalled();
  expect(mocks.metric).toHaveBeenCalledWith(
    expect.objectContaining({
      ownerKey: 'hashed:account:account-owner',
      event: 'applied',
      id: input.ticket,
    }),
  );
});

it('rejects invalid or rate-limited metric requests before writing', async () => {
  await pollAnimeImportQueue({ ...input, ticket: 'invalid', event: 'applied' });
  expect(mocks.metric).not.toHaveBeenCalled();
  mocks.limit.mockResolvedValue(false);
  const result = await pollAnimeImportQueue({ ...input, event: 'applied' });
  expect(result.ok).toBe(false);
  expect(mocks.metric).not.toHaveBeenCalled();
  expect(mocks.queue).not.toHaveBeenCalled();
});
