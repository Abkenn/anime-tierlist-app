vi.mock('@/env', () => ({
  env: {
    get BLOB_READ_WRITE_TOKEN() {
      return process.env.BLOB_READ_WRITE_TOKEN;
    },
  },
}));

import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireOwner: vi.fn(),
  owner: vi.fn(),
  account: vi.fn(),
  create: vi.fn(),
  publish: vi.fn(),
  share: vi.fn(),
  png: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('./tierlist-png-cache', () => ({ getTierlistPng: mocks.png }));
vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
}));
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
  const { id, version } = await publishTierlist({
    ownerId: 'owner',
    revision: 4,
  });
  expect(version).toBe('v4.4');
  expect(id).toMatch(/^[A-Za-z0-9_-]{16}$/u);
  mocks.share.mockResolvedValue({
    id,
    fingerprint: 'b'.repeat(64),
    ownerId: 'private-owner',
    seed: 'private-seed',
    document,
  });
  expect(await readPublicTierlist(id)).toEqual({
    id,
    version: 'b'.repeat(16),
    document,
  });
  expect(await readPublicTierlist(`${id}.v4.4`)).not.toBeNull();
  expect(await readPublicTierlist(`${id}.${'b'.repeat(16)}`)).not.toBeNull();
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
    fingerprint: 'c'.repeat(64),
    document,
  });
  const seed = await copyPublicTierlistSeed('a'.repeat(16));
  expect(seed).toMatch(/^[a-f0-9]{64}$/u);
  expect(mocks.create).toHaveBeenCalledWith(
    expect.objectContaining({ document, seedHash: `hash:${seed}` }),
  );
  expect(mocks.requireOwner).not.toHaveBeenCalled();
});

it('prepares the stored PNG before returning a shareable URL', async () => {
  vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'test-token');
  mocks.png.mockResolvedValue({
    status: 'ready',
    url: 'https://example.com/ready.png',
  });
  try {
    const published = await publishTierlist({ ownerId: 'owner', revision: 4 });
    expect(mocks.png).toHaveBeenCalledWith(published.id);
  } finally {
    vi.unstubAllEnvs();
  }
});
