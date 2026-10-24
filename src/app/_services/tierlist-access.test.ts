import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  googleOwner: vi.fn(),
  identity: vi.fn(),
  ownerBySeed: vi.fn(),
  ownerById: vi.fn(),
  session: vi.fn(),
  createOwner: vi.fn(),
  saveOwner: vi.fn(),
  createSession: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: 'token' }), set: vi.fn() }),
  headers: async () => new Headers(),
}));
vi.mock('@/app/_data/queries/google-account', () => ({
  findGoogleAccountByOwner: mocks.googleOwner,
}));
vi.mock('./google-session', () => ({ getGoogleIdentity: mocks.identity }));
vi.mock('@/app/_data/queries/tierlist', () => ({
  findOwnerBySeedHash: mocks.ownerBySeed,
  findOwnerById: mocks.ownerById,
  findTierlistSession: mocks.session,
}));
vi.mock('@/app/_data/mutations/tierlist', () => ({
  createTierlistOwner: mocks.createOwner,
  saveTierlistOwner: mocks.saveOwner,
  createTierlistSession: mocks.createSession,
  consumeTierlistRateLimit: async () => true,
  pruneTierlistAccessRecords: vi.fn(),
}));

import {
  connectSeedTierlist,
  replaceAccountTierlist,
  saveSeedTierlist,
  shareAccountTierlist,
} from './tierlist';

const document = {
  version: 1 as const,
  imageMode: 'natural' as const,
  items: [],
  ranks: ['Watching' as const],
};
const owner = { id: 'account-owner', revision: 3, document };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.ownerById.mockResolvedValue(owner);
  mocks.ownerBySeed.mockResolvedValue(owner);
  mocks.googleOwner.mockResolvedValue({ ownerId: owner.id });
  mocks.session.mockResolvedValue({
    ownerId: owner.id,
    tokenHash: 'token',
    expiresAt: BigInt(Date.now() + 172800000),
  });
});

describe('Google tierlist access separation', () => {
  it('rejects a leaked seed and a previously issued anonymous write session', async () => {
    mocks.identity.mockResolvedValue(null);
    await expect(connectSeedTierlist('a'.repeat(64))).rejects.toMatchObject({
      code: 'unauthorized',
    });
    await expect(
      saveSeedTierlist({ ownerId: owner.id, revision: 3, document }),
    ).rejects.toMatchObject({ code: 'unauthorized' });
    expect(mocks.saveOwner).not.toHaveBeenCalled();
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it('shares a distinct owner without changing the signed-in owner or its session', async () => {
    mocks.identity.mockResolvedValue({ ownerId: owner.id });
    const seed = await shareAccountTierlist();
    expect(seed).toMatch(/^[a-f0-9]{64}$/u);
    expect(mocks.createOwner).toHaveBeenCalledWith({
      id: expect.not.stringMatching(/^account-owner$/u),
      seedHash: expect.any(String),
      document,
    });
    expect(mocks.saveOwner).not.toHaveBeenCalled();
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it('copies imports only into the authenticated account and rejects stale replacements', async () => {
    mocks.identity.mockResolvedValue({ ownerId: owner.id });
    const sourceDocument = { ...document, imageMode: 'cover' as const };
    mocks.ownerBySeed.mockResolvedValue({
      id: 'anonymous-source',
      document: sourceDocument,
      revision: 0,
    });
    mocks.googleOwner.mockImplementation(async (id) =>
      id === owner.id ? { ownerId: id } : null,
    );
    mocks.saveOwner.mockResolvedValue({
      ...owner,
      document: sourceDocument,
      revision: 4,
    });
    await replaceAccountTierlist({
      seed: 'b'.repeat(64),
      ownerId: owner.id,
      revision: 3,
    });
    expect(mocks.saveOwner).toHaveBeenCalledExactlyOnceWith({
      id: owner.id,
      revision: 3,
      document: sourceDocument,
    });
    mocks.saveOwner.mockResolvedValue(null);
    await expect(
      replaceAccountTierlist({
        seed: 'b'.repeat(64),
        ownerId: owner.id,
        revision: 3,
      }),
    ).rejects.toMatchObject({ code: 'invalid' });
  });
});
