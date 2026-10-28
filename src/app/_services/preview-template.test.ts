import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  adopt: vi.fn(),
  activate: vi.fn(),
  backup: vi.fn(),
  read: vi.fn(),
  save: vi.fn(),
  copy: vi.fn(),
  replace: vi.fn(),
  handoff: vi.fn(),
}));
vi.mock('./local-tierlist', () => ({
  adoptPublicTierlist: mocks.adopt,
  activateAccountTierlist: mocks.activate,
  backupLocalTierlist: mocks.backup,
  readLocalTierlist: mocks.read,
  saveLocalTierlist: mocks.save,
}));
vi.mock('./tierlist-share.actions', () => ({ copyShareSeed: mocks.copy }));
vi.mock('./tierlist.actions', () => ({
  replaceAccountFromSeed: mocks.replace,
}));
vi.mock('@/app/_lib/preview-handoff', () => ({
  savePreviewHandoff: mocks.handoff,
}));

import { adoptPreviewTemplate } from './preview-template';

const document = {
  version: 1 as const,
  ranks: ['S' as const],
  items: [],
  imageMode: 'natural' as const,
};
const local = { ...document, seed: 'a'.repeat(64), revision: 3 };
const account = {
  profileKey: 'b'.repeat(64),
  ownerId: 'owner',
  revision: 8,
  hasItems: true,
};
const active = {
  ...local,
  seed: account.profileKey,
  accountOwnerId: account.ownerId,
  sync: { ownerId: account.ownerId, serverRevision: 8, syncedLocalRevision: 3 },
};
beforeEach(() => vi.resetAllMocks());

it('adopts anonymous templates without changing an account', async () => {
  expect(await adoptPreviewTemplate({ id: 'share', document, local })).toBe(
    '/?profile=local',
  );
  expect(mocks.adopt).toHaveBeenCalledWith(document, local);
  expect(mocks.replace).not.toHaveBeenCalled();
});

it('protects unsaved account edits from template replacement', async () => {
  await expect(
    adoptPreviewTemplate({
      id: 'share',
      document,
      local,
      account,
      active: { ...active, revision: 4 },
    }),
  ).rejects.toThrow('Save your latest changes');
  expect(mocks.copy).not.toHaveBeenCalled();
  expect(mocks.replace).not.toHaveBeenCalled();
});

it('replaces the confirmed account copy while keeping its private identity and device list', async () => {
  mocks.copy.mockResolvedValue({ ok: true, value: 'copied-share-seed' });
  const remote = { ownerId: 'owner', revision: 9, document };
  mocks.replace.mockResolvedValue({ ok: true, value: remote });
  mocks.read.mockResolvedValue({ ...active, revision: 4 });
  expect(
    await adoptPreviewTemplate({
      id: 'share',
      document,
      local,
      account,
      active,
    }),
  ).toBe('/');
  expect(mocks.replace).toHaveBeenCalledWith({
    seed: 'copied-share-seed',
    ownerId: 'owner',
    revision: 8,
  });
  expect(mocks.save).toHaveBeenCalledWith(
    expect.objectContaining({
      seed: account.profileKey,
      revision: 4,
      sync: { ownerId: 'owner', serverRevision: 9, syncedLocalRevision: 4 },
    }),
    3,
  );
  expect(mocks.adopt).not.toHaveBeenCalled();
});
