import { describe, expect, it } from 'vitest';
import type { LocalTierlist } from './local-tierlist';
import {
  getSyncDecision,
  getTierlistDocument,
  type RemoteTierlist,
} from './tierlist-sync';

describe('tierlist sync decisions', () => {
  const local: LocalTierlist = {
    version: 1,
    seed: 'a'.repeat(64),
    revision: 4,
    items: [],
    ranks: ['S'],
    imageMode: 'natural',
    sync: { ownerId: 'owner', serverRevision: 2, syncedLocalRevision: 4 },
  };
  const remote: RemoteTierlist = {
    ownerId: 'owner',
    revision: 3,
    document: { ...getTierlistDocument(local), imageMode: 'cover' },
  };

  it('downloads new online data only when this device has no unsynced changes', () => {
    expect(getSyncDecision(local, remote)).toBe('download');
    expect(getSyncDecision({ ...local, revision: 5 }, remote)).toBe('conflict');
    expect(getSyncDecision({ ...local, sync: undefined }, remote)).toBe(
      'conflict',
    );
  });

  it('uploads against a known revision and recognizes equal documents without exposing the seed', () => {
    expect(
      getSyncDecision({ ...local, revision: 5 }, { ...remote, revision: 2 }),
    ).toBe('upload');
    expect(
      getSyncDecision(local, {
        ...remote,
        document: getTierlistDocument(local),
      }),
    ).toBe('equal');
    expect(getTierlistDocument(local)).not.toHaveProperty('seed');
    expect(getTierlistDocument(local)).not.toHaveProperty('sync');
  });
});
