import { describe, expect, it } from 'vitest';
import type { LocalTierlist } from './local-tierlist';
import {
  getSyncDecision,
  getTierlistDocument,
  type RemoteTierlist,
  sameTierlistDocument,
} from './tierlist-sync';

describe('tierlist sync decisions', () => {
  it('ignores JSONB object-key ordering but preserves item ordering and actual edits', () => {
    const first = {
      version: 1 as const,
      items: [
        {
          id: 'one',
          label: 'One',
          rank: 'S' as const,
          crop: { x: 0.2, y: 0.8 },
        },
        { id: 'two', label: 'Two', rank: 'S' as const },
      ],
      ranks: ['S' as const],
      imageMode: 'natural' as const,
    };
    const second = {
      imageMode: first.imageMode,
      ranks: first.ranks,
      items: [
        {
          crop: { y: 0.8, x: 0.2 },
          rank: 'S' as const,
          label: 'One',
          id: 'one',
          title: undefined,
        },
        first.items[1],
      ],
      version: first.version,
    };

    expect(sameTierlistDocument(first, second)).toBe(true);
    expect(
      sameTierlistDocument(
        { ...first, updatedAt: 1000 },
        { ...second, updatedAt: 2000 },
      ),
    ).toBe(true);
    expect(
      sameTierlistDocument(first, {
        ...second,
        items: [...second.items].reverse(),
      }),
    ).toBe(false);
    expect(sameTierlistDocument(first, { ...second, imageMode: 'cover' })).toBe(
      false,
    );
  });

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
