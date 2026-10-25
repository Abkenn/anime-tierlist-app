import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  principal: vi.fn(),
  identity: vi.fn(),
  owner: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('./google-session', () => ({ getGooglePrincipal: mocks.principal }));
vi.mock('@/app/_data/queries/google-account', () => ({
  findGoogleAccount: mocks.identity,
}));
vi.mock('@/app/_data/queries/tierlist', () => ({ findOwnerById: mocks.owner }));
vi.mock('./tierlist-identity', () => ({
  hashTierlistSecret: (value: string) => `hashed:${value}`,
}));

import { readAccountSnapshot } from './account-snapshot';

beforeEach(() => vi.resetAllMocks());

it('does not look up private tierlist data without a verified account', async () => {
  mocks.principal.mockResolvedValue(null);
  expect(await readAccountSnapshot()).toEqual({
    status: 'ready',
    userId: null,
    account: null,
  });
  expect(mocks.identity).not.toHaveBeenCalled();
  expect(mocks.owner).not.toHaveBeenCalled();
});

it('returns only the verified owner snapshot and defers new-account provisioning to an action', async () => {
  mocks.principal.mockResolvedValue({
    userId: 'user',
    subject: 'google-subject',
    displayName: 'Name',
  });
  mocks.identity.mockResolvedValue({ ownerId: 'owner' });
  const document = {
    version: 1,
    imageMode: 'natural',
    ranks: ['Watching'],
    items: [],
  };
  mocks.owner.mockResolvedValue({
    id: 'owner',
    revision: 2,
    document,
    seedHash: 'private',
  });
  expect(await readAccountSnapshot()).toEqual({
    status: 'ready',
    userId: 'user',
    account: {
      displayName: 'Name',
      profileKey: 'hashed:google-profile:owner',
      remote: { ownerId: 'owner', revision: 2, document },
    },
  });
  expect(mocks.identity).toHaveBeenCalledWith('google-subject');
  expect(mocks.owner).toHaveBeenCalledWith('owner');
  mocks.identity.mockResolvedValue(null);
  mocks.owner.mockClear();
  expect(await readAccountSnapshot()).toEqual({
    status: 'ready',
    userId: 'user',
    account: null,
  });
  expect(mocks.owner).not.toHaveBeenCalled();
});
