vi.mock('@/env', () => ({
  env: {
    get BLOB_READ_WRITE_TOKEN() {
      return process.env.BLOB_READ_WRITE_TOKEN;
    },
  },
}));

import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  claim: vi.fn(),
  release: vi.fn(),
  store: vi.fn(),
  share: vi.fn(),
  render: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/app/_data/mutations/tierlist-png', () => ({
  claimTierlistPng: mocks.claim,
  releaseTierlistPng: mocks.release,
  storeTierlistPng: mocks.store,
}));
vi.mock('@/app/_data/queries/tierlist-share', () => ({
  findTierlistShare: mocks.share,
}));
vi.mock('@/app/_data/mutations/tierlist', () => ({
  consumeTierlistRateLimit: vi.fn(async () => true),
}));
vi.mock('./tierlist-png', () => ({ renderTierlistPng: mocks.render }));

import { getTierlistPng } from './tierlist-png-cache';

const id = 'a'.repeat(16);
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'test-token');
  mocks.share.mockResolvedValue({
    id,
    fingerprint: 'version',
    document: { version: 1, imageMode: 'natural', ranks: ['S'], items: [] },
  });
});
it('reuses an unchanged PNG without fetching posters or uploading again', async () => {
  mocks.claim.mockResolvedValue({
    status: 'ready',
    url: 'https://example.com/cached.png',
  });
  expect(await getTierlistPng(id)).toEqual({
    status: 'ready',
    url: 'https://example.com/cached.png',
    fingerprint: 'version',
  });
  expect(mocks.render).not.toHaveBeenCalled();
  expect(mocks.store).not.toHaveBeenCalled();
});
it('rebuilds an evicted PNG and releases the generation lease even if storage fails', async () => {
  mocks.claim.mockResolvedValue({ status: 'claimed' });
  mocks.render.mockResolvedValue(Buffer.from('png'));
  mocks.store.mockRejectedValue(new Error('Storage unavailable'));
  await expect(getTierlistPng(id)).rejects.toThrow('Storage unavailable');
  expect(mocks.render).toHaveBeenCalledOnce();
  expect(mocks.release).toHaveBeenCalledOnce();
});
