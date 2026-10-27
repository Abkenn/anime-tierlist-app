import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireOwner: vi.fn(),
  owner: vi.fn(),
  account: vi.fn(),
  create: vi.fn(),
  publish: vi.fn(),
  share: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('./tierlist-identity', () => ({
  requireTierlistOwner: mocks.requireOwner,
  limitSeedAccess: vi.fn(),
  hashTierlistSecret: (seed: string) => `hash:${seed}`,
  TierlistAccessError: class extends Error {
    constructor(
      public code: string,
      message: string,
    ) {
      super(message);
    }
  },
}));
vi.mock('@/app/_data/queries/tierlist', () => ({ findOwnerById: mocks.owner }));
vi.mock('@/app/_data/queries/google-account', () => ({
  findGoogleAccountByOwner: mocks.account,
}));
vi.mock('@/app/_data/queries/tierlist-share', () => ({
  findTierlistShare: mocks.share,
}));
vi.mock('@/app/_data/mutations/tierlist', () => ({
  createTierlistOwner: mocks.create,
}));
vi.mock('@/app/_data/mutations/tierlist-share', () => ({
  publishTierlistSnapshot: mocks.publish,
}));

import {
  copyPublicTierlistSeed,
  prepareTierlistShare,
  publishTierlist,
  readPublicTierlist,
} from './tierlist-share';

const document = {
  version: 1,
  items: [],
  ranks: ['Watching'],
  imageMode: 'natural',
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.owner.mockResolvedValue({
    id: 'owner',
    seedHash: `hash:${'a'.repeat(64)}`,
    revision: 4,
    document,
  });
  mocks.publish.mockImplementation(async (input) => input);
});

it('requires ownership and rejects stale publishing without creating a public snapshot', async () => {
  mocks.requireOwner.mockRejectedValueOnce(new Error('Unauthorized'));
  await expect(
    publishTierlist({ ownerId: 'owner', revision: 4 }),
  ).rejects.toThrow('Unauthorized');
  await expect(
    publishTierlist({ ownerId: 'owner', revision: 3 }),
  ).rejects.toThrow('changed');
  expect(mocks.publish).not.toHaveBeenCalled();
});

it('creates public snapshots with independent IDs and strips every secret from public reads', async () => {
  const id = await publishTierlist({ ownerId: 'owner', revision: 4 });
  expect(id).toMatch(/^[A-Za-z0-9_-]{16}$/u);
  mocks.share.mockResolvedValue({
    id,
    ownerId: 'private-owner',
    seed: 'private-seed',
    document,
  });
  expect(await readPublicTierlist(id)).toEqual({ id, document });
  expect(await readPublicTierlist('bad')).toBeNull();
});

it('uses the existing anonymous seed but creates a separate recoverable copy for Google sharing', async () => {
  expect(
    (
      await prepareTierlistShare({
        ownerId: 'owner',
        revision: 4,
        seed: 'a'.repeat(64),
      })
    ).seed,
  ).toBe('a'.repeat(64));
  expect(mocks.create).not.toHaveBeenCalled();
  mocks.account.mockResolvedValue({ ownerId: 'owner' });
  const share = await prepareTierlistShare({ ownerId: 'owner', revision: 4 });
  expect(share.seed).toMatch(/^[a-f0-9]{64}$/u);
  expect(mocks.create).toHaveBeenCalledWith(
    expect.objectContaining({
      id: expect.not.stringMatching(/^owner$/u),
      document,
    }),
  );
});

it('saves a project from a public link as an independent copy, never the source editing seed', async () => {
  mocks.share.mockResolvedValue({
    id: 'a'.repeat(16),
    ownerId: 'owner',
    document,
  });
  const seed = await copyPublicTierlistSeed('a'.repeat(16));
  expect(seed).toMatch(/^[a-f0-9]{64}$/u);
  expect(mocks.create).toHaveBeenCalledWith(
    expect.objectContaining({ document, seedHash: `hash:${seed}` }),
  );
  expect(mocks.requireOwner).not.toHaveBeenCalled();
});
