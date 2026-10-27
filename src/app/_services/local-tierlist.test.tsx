import 'fake-indexeddb/auto';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  clear,
  createStore as createDatabaseStore,
  get,
  set,
} from 'idb-keyval';
import { Provider } from 'jotai';
import { createStore } from 'jotai/vanilla';
import { type PropsWithChildren, StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tierItemsAtom } from '@/app/_atoms/tierlist/items.atoms';
import { imageModeAtom } from '@/app/_atoms/tierlist/settings.atoms';
import { useLocalTierlist } from '@/app/_hooks/use-local-tierlist';
import { createUserSeed, type LocalTierlist } from '@/app/_lib/local-tierlist';
import * as tierlistPersistence from './local-tierlist';
import {
  activateAccountTierlist,
  activateDeviceTierlist,
  activateImportedTierlist,
  getDeviceTierlist,
  loadLocalTierlist,
  readLocalTierlist,
  replaceDeviceTierlist,
  saveLocalSyncMetadata,
  saveLocalTierlist,
  saveLocalTierlistEdit,
} from './local-tierlist';

const database = createDatabaseStore('anime-tierlist', 'drafts');
const initial: LocalTierlist = {
  version: 1,
  seed: createUserSeed(),
  revision: 0,
  items: [],
  ranks: ['S+', 'Watching'],
  imageMode: 'natural',
};

beforeEach(async () => {
  await clear(database);
});

describe('local tierlist durability', () => {
  it('adopts an imported copy as the default without adopting its identity or changing its source', async () => {
    const device = {
      ...initial,
      sync: { ownerId: 'device', serverRevision: 2, syncedLocalRevision: 0 },
    };
    await loadLocalTierlist(device);
    const sourceSeed = createUserSeed();
    const document: LocalTierlist = {
      ...initial,
      seed: sourceSeed,
      posterSize: 'large',
      imageMode: 'cover',
      rankDetails: { 'S+': { label: 'Favorites', color: '#ff4455' } },
      items: [
        {
          id: 'poster',
          label: 'Shared title',
          rank: 'S+',
          image: { src: '/poster.jpg', width: 200, height: 300, alt: 'Poster' },
          crop: { x: 0.2, y: 0.7 },
          trim: { left: 0.1, top: 0, right: 0.8, bottom: 1 },
          rowHeightExpansion: 0.6,
          title: {
            text: 'My title',
            color: '#ffffff',
            wrap: true,
            position: 'bottom',
          },
        },
      ],
    };
    await activateImportedTierlist(sourceSeed, {
      ownerId: 'source',
      revision: 7,
      document,
    });
    const source = await readLocalTierlist(sourceSeed);
    const copied = await replaceDeviceTierlist({
      seed: sourceSeed,
      revision: source.revision,
    });

    expect(copied).toMatchObject({
      seed: device.seed,
      revision: 1,
      sync: device.sync,
      items: document.items,
      ranks: document.ranks,
      rankDetails: document.rankDetails,
      posterSize: 'large',
      imageMode: 'cover',
    });
    expect(await loadLocalTierlist(initial)).toEqual(copied);
    expect(await readLocalTierlist(sourceSeed)).toEqual(source);
    expect(await get(`before-replace:${device.seed}`, database)).toEqual(
      device,
    );
  });

  it('leaves both profiles unchanged if the imported copy changed before confirmation', async () => {
    await loadLocalTierlist(initial);
    const seed = createUserSeed();
    await activateImportedTierlist(seed, {
      ownerId: 'source',
      revision: 1,
      document: initial,
    });
    const source = await readLocalTierlist(seed);

    await expect(
      replaceDeviceTierlist({ seed, revision: source.revision + 1 }),
    ).rejects.toBeInstanceOf(tierlistPersistence.LocalTierlistChangedError);
    expect(await getDeviceTierlist()).toEqual(initial);
    expect(await loadLocalTierlist(initial)).toEqual(source);
  });

  it('rebases simultaneous tab edits without dropping another tab’s fields or new posters', async () => {
    const base: LocalTierlist = {
      ...initial,
      items: [{ id: 'one', label: 'Original', rank: 'S+' }],
    };
    await loadLocalTierlist(base);
    await Promise.all([
      saveLocalTierlistEdit(base.seed, base, {
        ...base,
        items: [
          { ...base.items[0], label: 'Renamed' },
          { id: 'two', label: 'Added', rank: 'Watching' },
        ],
      }),
      saveLocalTierlistEdit(base.seed, base, {
        ...base,
        items: [{ ...base.items[0], crop: { x: 0.3, y: 0.7 } }],
        imageMode: 'cover',
      }),
    ]);
    const saved = await getDeviceTierlist();
    expect(saved.revision).toBe(2);
    expect(saved.items).toEqual([
      { id: 'one', label: 'Renamed', rank: 'S+', crop: { x: 0.3, y: 0.7 } },
      { id: 'two', label: 'Added', rank: 'Watching' },
    ]);
    expect(saved.imageMode).toBe('cover');
  });

  it('updates three open stores through notifications without echo writes, including sync metadata', async () => {
    await loadLocalTierlist(initial);
    const tabs = Array.from({ length: 3 }, () => {
      const store = createStore();
      const hook = renderHook(useLocalTierlist, {
        wrapper: ({ children }: PropsWithChildren) => (
          <Provider store={store}>{children}</Provider>
        ),
      });

      return { store, hook };
    });

    try {
      await waitFor(() =>
        tabs.forEach(({ hook }) => {
          expect(hook.result.current.status).toBe('saved');
        }),
      );
      act(() =>
        tabs[0].store.set(tierItemsAtom, [
          { id: 'shared', label: 'Shared', rank: 'S+' },
        ]),
      );
      await waitFor(() =>
        tabs.forEach(({ store }) => {
          expect(store.get(tierItemsAtom)[0]?.label).toBe('Shared');
        }),
      );
      act(() => tabs[1].store.set(imageModeAtom, 'cover'));
      await waitFor(() =>
        tabs.forEach(({ store }) => {
          expect(store.get(imageModeAtom)).toBe('cover');
        }),
      );
      const saved = await getDeviceTierlist();
      await saveLocalSyncMetadata(
        initial.seed,
        { ownerId: 'owner', revision: 4, document: saved },
        saved.revision,
      );
      await waitFor(() =>
        tabs.forEach(({ hook }) => {
          expect(hook.result.current.snapshot?.sync?.serverRevision).toBe(4);
        }),
      );
      expect((await getDeviceTierlist()).revision).toBe(2);
    } finally {
      tabs.forEach(({ hook }) => {
        hook.unmount();
      });
    }
  });

  it('migrates an account draft to a non-credential profile key without losing unsynced edits or the device list', async () => {
    await loadLocalTierlist(initial);
    const accountSeed = createUserSeed();
    const profileKey = createUserSeed();
    const remote = {
      ownerId: '17a123b1-0b05-4702-a749-965faee5a5d4',
      revision: 2,
      document: {
        version: 1 as const,
        imageMode: 'natural' as const,
        items: [],
        ranks: initial.ranks,
      },
    };
    await activateImportedTierlist(accountSeed, remote);
    const previous = await loadLocalTierlist(initial);
    await saveLocalTierlist(
      {
        ...previous,
        revision: 1,
        items: [
          { id: 'draft', label: 'Unsynced account edit', rank: 'Watching' },
        ],
      },
      0,
    );
    await activateAccountTierlist(profileKey, remote);
    const account = await loadLocalTierlist(initial);
    expect(account.seed).toBe(profileKey);
    expect(account.accountOwnerId).toBe(remote.ownerId);
    expect(account.items[0]?.label).toBe('Unsynced account edit');
    expect(account.sync?.syncedLocalRevision).toBe(0);
    await activateDeviceTierlist();
    expect(await loadLocalTierlist(initial)).toEqual(initial);
  });

  it('keeps the machine seed and draft while switching between imported identities', async () => {
    await loadLocalTierlist(initial);
    const machine = {
      ...initial,
      revision: 1,
      items: [{ id: 'device', label: 'Device list', rank: 'S+' as const }],
    };
    await saveLocalTierlist(machine, 0);
    const seed = createUserSeed();
    const remote = {
      ownerId: 'remote',
      revision: 2,
      document: {
        version: 1 as const,
        items: [],
        ranks: initial.ranks,
        imageMode: 'cover' as const,
      },
    };
    await activateImportedTierlist(seed, remote);
    const imported = await loadLocalTierlist(initial);
    await saveLocalTierlist(
      { ...imported, revision: 1, imageMode: 'contain' },
      0,
    );
    expect(await getDeviceTierlist()).toEqual(machine);
    await activateDeviceTierlist();
    expect(await loadLocalTierlist(initial)).toEqual(machine);
    await activateImportedTierlist(seed, remote);
    expect((await loadLocalTierlist(initial)).imageMode).toBe('contain');
  });

  it('creates one seed and restores the complete saved draft instead of new defaults', async () => {
    await loadLocalTierlist(initial);
    const saved: LocalTierlist = {
      ...initial,
      revision: 1,
      imageMode: 'cover',
      items: [
        {
          id: 'poster',
          label: 'My anime',
          rank: 'Watching',
          image: {
            src: 'https://example.com/poster.jpg',
            width: 900,
            height: 1600,
            alt: 'Poster',
          },
          crop: { x: 0.2, y: 0.7 },
          trim: { left: 0.1, top: 0, right: 0.9, bottom: 1 },
          rowHeightExpansion: 0.6,
          title: {
            text: 'My\ntitle',
            wrap: true,
            position: 'bottom',
            color: '#fff',
          },
        },
      ],
    };
    await saveLocalTierlist(saved, 0);

    expect(
      await loadLocalTierlist({ ...initial, seed: createUserSeed() }),
    ).toEqual(saved);
  });

  it('rejects a stale tab write without overwriting the newer draft', async () => {
    await loadLocalTierlist(initial);
    await saveLocalTierlist({ ...initial, revision: 1, imageMode: 'cover' }, 0);
    await expect(
      saveLocalTierlist({ ...initial, revision: 1 }, 0),
    ).rejects.toThrow('another tab');
    expect((await loadLocalTierlist(initial)).imageMode).toBe('cover');
  });

  it('preserves unreadable data instead of resetting it', async () => {
    await set(
      'personal-tierlist',
      { version: 99, important: 'keep' },
      database,
    );
    await expect(loadLocalTierlist(initial)).rejects.toThrow();
    expect(await get<unknown>('personal-tierlist', database)).toEqual({
      version: 99,
      important: 'keep',
    });
  });

  it('restores before subscribing and persists atom edits under Strict Mode', async () => {
    await loadLocalTierlist({ ...initial, imageMode: 'cover' });
    const store = createStore();

    const wrapper = ({ children }: PropsWithChildren) => (
      <StrictMode>
        <Provider store={store}>{children}</Provider>
      </StrictMode>
    );

    const hook = renderHook(useLocalTierlist, { wrapper });
    await waitFor(() => expect(hook.result.current.status).toBe('saved'));
    expect(store.get(imageModeAtom)).toBe('cover');
    act(() => {
      store.set(tierItemsAtom, [{ id: 'new', label: 'New', rank: 'S+' }]);
    });
    await waitFor(async () =>
      expect((await loadLocalTierlist(initial)).items).toHaveLength(1),
    );
    hook.unmount();
    expect((await loadLocalTierlist(initial)).seed).toBe(initial.seed);
  });

  it('pauses queued writes after a storage failure without clearing the current edits', async () => {
    await loadLocalTierlist(initial);
    const store = createStore();
    const hook = renderHook(useLocalTierlist, {
      wrapper: ({ children }: PropsWithChildren) => (
        <Provider store={store}>{children}</Provider>
      ),
    });
    await waitFor(() => expect(hook.result.current.status).toBe('saved'));
    const save = vi
      .spyOn(tierlistPersistence, 'saveLocalTierlistEdit')
      .mockRejectedValueOnce(new Error('Storage is full.'));

    try {
      act(() => {
        store.set(imageModeAtom, 'cover');
        store.set(imageModeAtom, 'contain');
      });
      await waitFor(() => expect(hook.result.current.status).toBe('error'));
      await expect(hook.result.current.flush()).rejects.toThrow('paused');
      expect(save).toHaveBeenCalledTimes(1);
      expect(hook.result.current.error).toBe('Storage is full.');
      expect(store.get(imageModeAtom)).toBe('contain');
      expect((await loadLocalTierlist(initial)).imageMode).toBe(
        initial.imageMode,
      );
    } finally {
      save.mockRestore();
      hook.unmount();
    }
  });
});
