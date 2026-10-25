import 'fake-indexeddb/auto';
import { act, renderHook, waitFor } from '@testing-library/react';
import { clear, createStore as createDatabaseStore } from 'idb-keyval';
import { Provider } from 'jotai';
import { createStore } from 'jotai/vanilla';
import type { PropsWithChildren } from 'react';
import { expect, it, vi } from 'vitest';
import { z } from 'zod';
import { tierItemsAtom } from '@/app/_atoms/tierlist/items.atoms';
import { imageModeAtom } from '@/app/_atoms/tierlist/settings.atoms';
import { createUserSeed } from '@/app/_lib/local-tierlist';
import {
  type RemoteTierlist,
  tierlistDocumentSchema,
} from '@/app/_lib/tierlist-sync';
import { loadLocalTierlist } from '@/app/_services/local-tierlist';
import {
  connectTierlist,
  syncTierlist,
} from '@/app/_services/tierlist.actions';
import { useLocalTierlist } from './use-local-tierlist';
import { useTierlistSync } from './use-tierlist-sync';

vi.mock('@/app/_services/tierlist.actions', () => ({
  connectTierlist: vi.fn(),
  syncTierlist: vi.fn(),
}));

it('serializes online saves and reads the newest shared draft before another tab uploads', async () => {
  await clear(createDatabaseStore('anime-tierlist', 'drafts'));
  let queue = Promise.resolve();
  const request = vi.fn(
    async (_name: string, operation: () => Promise<void>) => {
      const previous = queue;
      const { promise, resolve } = Promise.withResolvers<void>();
      queue = promise;
      await previous;

      try {
        await operation();
      } finally {
        resolve();
      }
    },
  );
  vi.stubGlobal('navigator', { onLine: true, locks: { request } });
  let remote: RemoteTierlist | undefined;
  vi.mocked(connectTierlist).mockImplementation(async (value) => {
    const input = z
      .object({ document: tierlistDocumentSchema.optional() })
      .parse(value);
    if (!remote && input.document) {
      remote = { ownerId: 'owner', revision: 0, document: input.document };
    }

    if (!remote) {
      throw new Error('Missing test document');
    }

    return { ok: true, value: structuredClone(remote) };
  });
  vi.mocked(syncTierlist).mockImplementation(async (value) => {
    const input = z
      .object({ revision: z.number(), document: tierlistDocumentSchema })
      .parse(value);
    if (!remote) {
      throw new Error('Missing test owner');
    }

    const status = input.revision === remote.revision ? 'saved' : 'conflict';
    if (status === 'saved') {
      remote = {
        ...remote,
        revision: remote.revision + 1,
        document: input.document,
      };
    }

    return { ok: true, value: { status, tierlist: structuredClone(remote) } };
  });
  const tabs = Array.from({ length: 3 }, () => {
    const store = createStore();
    const hook = renderHook(
      () => {
        const storage = useLocalTierlist();
        const sync = useTierlistSync(storage, false);

        return { storage, sync };
      },
      {
        wrapper: ({ children }: PropsWithChildren) => (
          <Provider store={store}>{children}</Provider>
        ),
      },
    );

    return { store, hook };
  });

  try {
    await waitFor(
      () => {
        tabs.forEach(({ hook }) => {
          expect(hook.result.current.sync.status).toBe('saved');
        });
      },
      { timeout: 5000 },
    );
    act(() => {
      tabs[0].store.set(imageModeAtom, 'cover');
      tabs[1].store.set(tierItemsAtom, [
        { id: 'shared', label: 'Shared', rank: 'Watching' },
      ]);
    });
    await waitFor(
      () => {
        expect(remote?.document.imageMode).toBe('cover');
        expect(remote?.document.items[0]?.label).toBe('Shared');
        tabs.forEach(({ hook }) => {
          expect(hook.result.current.sync.status).toBe('saved');
          expect(
            hook.result.current.storage.snapshot?.sync?.syncedLocalRevision,
          ).toBe(2);
        });
      },
      { timeout: 5000 },
    );
    expect(request).toHaveBeenCalled();
    expect(vi.mocked(syncTierlist).mock.calls.length).toBe(1);
  } finally {
    tabs.forEach(({ hook }) => {
      hook.unmount();
    });
    vi.unstubAllGlobals();
  }
});

it.each(['device', 'online'] as const)(
  'shares the %s conflict choice across three tabs before uploading finishes',
  async (choice) => {
    await clear(createDatabaseStore('anime-tierlist', 'drafts'));
    vi.mocked(syncTierlist).mockClear();
    await loadLocalTierlist({
      version: 1,
      seed: createUserSeed(),
      revision: 1,
      items: [],
      ranks: ['S+', 'Watching'],
      imageMode: 'cover',
      sync: { ownerId: 'owner', serverRevision: 1, syncedLocalRevision: 0 },
    });
    let remote: RemoteTierlist = {
      ownerId: 'owner',
      revision: 2,
      document: {
        version: 1,
        items: [{ id: 'online', label: 'Online poster', rank: 'Watching' }],
        ranks: ['S+', 'Watching'],
        imageMode: 'contain',
      },
    };
    const upload = Promise.withResolvers<void>();
    vi.mocked(connectTierlist).mockImplementation(async () => ({
      ok: true,
      value: structuredClone(remote),
    }));
    vi.mocked(syncTierlist).mockImplementation(async (value) => {
      const input = z
        .object({ revision: z.number(), document: tierlistDocumentSchema })
        .parse(value);
      await upload.promise;
      const status = input.revision === remote.revision ? 'saved' : 'conflict';
      if (status === 'saved') {
        remote = {
          ...remote,
          revision: remote.revision + 1,
          document: input.document,
        };
      }

      return { ok: true, value: { status, tierlist: structuredClone(remote) } };
    });
    const tabs = Array.from({ length: 3 }, () => {
      const store = createStore();
      const hook = renderHook(
        () => {
          const storage = useLocalTierlist();
          const sync = useTierlistSync(storage, false);

          return { storage, sync };
        },
        {
          wrapper: ({ children }: PropsWithChildren) => (
            <Provider store={store}>{children}</Provider>
          ),
        },
      );

      return { store, hook };
    });

    try {
      await waitFor(
        () => {
          tabs.forEach(({ hook }) => {
            expect(hook.result.current.sync.status).toBe('conflict');
          });
        },
        { timeout: 5000 },
      );
      await act(async () => {
        if (choice === 'device') {
          await tabs[1].hook.result.current.sync.keepDeviceChanges();
        } else {
          await tabs[1].hook.result.current.sync.acceptOnlineChanges();
        }
      });
      await waitFor(() => {
        tabs.forEach(({ hook, store }) => {
          expect(hook.result.current.sync).not.toHaveProperty('conflict');
          expect(store.get(imageModeAtom)).toBe(
            choice === 'device' ? 'cover' : 'contain',
          );
          expect(store.get(tierItemsAtom)).toHaveLength(
            choice === 'device' ? 0 : 1,
          );
        });
      });
      upload.resolve();
      await waitFor(
        () => {
          tabs.forEach(({ hook }) => {
            expect(hook.result.current.sync.status).toBe('saved');
          });
        },
        { timeout: 5000 },
      );
      expect(remote.document.imageMode).toBe(
        choice === 'device' ? 'cover' : 'contain',
      );
    } finally {
      upload.resolve();
      tabs.forEach(({ hook }) => {
        hook.unmount();
      });
    }
  },
);
