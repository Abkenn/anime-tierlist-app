'use client';

import { useStore } from 'jotai';
import { useEffect, useRef, useState } from 'react';
import { clearEditingItemAtom } from '@/app/_atoms/tierlist/interaction.atoms';
import { tierItemsAtom } from '@/app/_atoms/tierlist/items.atoms';
import {
  enabledTierRanksAtom,
  imageModeAtom,
} from '@/app/_atoms/tierlist/settings.atoms';
import { createUserSeed, type LocalTierlist } from '@/app/_lib/local-tierlist';
import type { RemoteTierlist } from '@/app/_lib/tierlist-sync';
import {
  activateDeviceTierlist,
  activateImportedTierlist,
  backupLocalTierlist,
  getDeviceTierlist,
  loadLocalTierlist,
  saveLocalTierlist,
} from '@/app/_services/local-tierlist';

type StorageState = {
  status: 'loading' | 'saved' | 'saving' | 'error';
  seed: string;
  error?: string;
};
type LocalController = {
  flush: () => Promise<void>;
  metadata: (remote: RemoteTierlist, localRevision: number) => Promise<void>;
  replace: (remote: RemoteTierlist, expectedRevision?: number) => Promise<void>;
};

export const useLocalTierlist = () => {
  const store = useStore();
  const controller = useRef<LocalController | null>(null);
  const [profileSeed, setProfileSeed] = useState<string>();
  const [snapshot, setSnapshot] = useState<LocalTierlist>();
  const [deviceSeed, setDeviceSeed] = useState('');
  const [state, setState] = useState<StorageState>({
    status: 'loading',
    seed: '',
  });

  const changeProfile = async (seed: string, change: () => Promise<void>) => {
    await controller.current?.flush();
    await change();
    controller.current = null;
    setSnapshot(undefined);
    setState({ status: 'loading', seed: '' });
    setProfileSeed(seed);
  };

  const importProfile = (seed: string, remote: RemoteTierlist) =>
    changeProfile(seed, () => activateImportedTierlist(seed, remote));

  const restoreDeviceProfile = () =>
    changeProfile(deviceSeed, activateDeviceTierlist);

  const updateSync = async (remote: RemoteTierlist, localRevision: number) => {
    await controller.current?.metadata(remote, localRevision);
  };

  const replaceRemote = async (
    remote: RemoteTierlist,
    expectedRevision?: number,
  ) => {
    await controller.current?.replace(remote, expectedRevision);
  };

  useEffect(() => {
    let disposed = false;
    let unsubscribe = () => {};

    const initialize = async () => {
      try {
        let current = await loadLocalTierlist({
          version: 1,
          seed: createUserSeed(),
          revision: 0,
          items: store.get(tierItemsAtom),
          ranks: store.get(enabledTierRanksAtom),
          imageMode: store.get(imageModeAtom),
        });

        if (disposed) {
          return;
        }

        if (profileSeed && current.seed !== profileSeed) {
          throw new Error(
            'The active tierlist changed in another tab. Reload to continue.',
          );
        }

        const device = await getDeviceTierlist();

        if (disposed) {
          return;
        }

        setDeviceSeed(device.seed);
        let queue = Promise.resolve();
        let failed = false;
        let pending = 0;

        const hydrate = () => {
          store.set(clearEditingItemAtom);
          store.set(tierItemsAtom, current.items);
          store.set(enabledTierRanksAtom, current.ranks);
          store.set(imageModeAtom, current.imageMode);
        };

        const publish = () => {
          if (!disposed) {
            setSnapshot(current);
            setState({
              status: pending ? 'saving' : 'saved',
              seed: current.seed,
            });
          }
        };

        const enqueue = (operation: () => Promise<void>) => {
          if (failed) {
            return Promise.reject(
              new Error(
                'Local saving is paused. Reload before editing further.',
              ),
            );
          }

          pending += 1;
          setState({ status: 'saving', seed: current.seed });
          const task = queue.then(operation);
          queue = task
            .then(() => {
              pending -= 1;
              publish();
            })
            .catch((error: unknown) => {
              failed = true;

              if (!disposed) {
                setState({
                  status: 'error',
                  seed: current.seed,
                  error:
                    error instanceof Error
                      ? error.message
                      : 'Unable to save this tierlist on this device.',
                });
              }
            });

          return task;
        };

        const persist = () => {
          if (failed) {
            return;
          }

          const document = {
            items: store.get(tierItemsAtom),
            ranks: store.get(enabledTierRanksAtom),
            imageMode: store.get(imageModeAtom),
          };
          void enqueue(async () => {
            const next = {
              ...current,
              ...document,
              revision: current.revision + 1,
            };
            await saveLocalTierlist(next, current.revision);
            current = next;
          }).catch(() => {});
        };

        hydrate();
        publish();

        const subscribe = () => {
          const subscriptions = [
            store.sub(tierItemsAtom, persist),
            store.sub(enabledTierRanksAtom, persist),
            store.sub(imageModeAtom, persist),
          ];

          return () =>
            subscriptions.forEach((stop) => {
              stop();
            });
        };

        unsubscribe = subscribe();
        controller.current = {
          flush: async () => {
            await queue;

            if (failed) {
              throw new Error(
                'Local saving is paused. Reload before switching tierlists.',
              );
            }
          },
          metadata: (remote, localRevision) => {
            if (
              current.sync?.ownerId === remote.ownerId &&
              current.sync.serverRevision === remote.revision &&
              current.sync.syncedLocalRevision === localRevision
            ) {
              return queue;
            }

            return enqueue(async () => {
              const next = {
                ...current,
                sync: {
                  ownerId: remote.ownerId,
                  serverRevision: remote.revision,
                  syncedLocalRevision: localRevision,
                },
              };
              await saveLocalTierlist(next, current.revision);
              current = next;
            });
          },
          replace: (remote, expectedRevision) =>
            enqueue(async () => {
              if (
                expectedRevision !== undefined &&
                current.revision !== expectedRevision
              ) {
                throw new Error(
                  'Local edits changed while syncing. Reload to compare both versions.',
                );
              }

              await backupLocalTierlist(current);
              const next = {
                ...current,
                ...remote.document,
                revision: current.revision + 1,
                sync: {
                  ownerId: remote.ownerId,
                  serverRevision: remote.revision,
                  syncedLocalRevision: current.revision + 1,
                },
              };
              await saveLocalTierlist(next, current.revision);
              current = next;
              unsubscribe();
              hydrate();
              unsubscribe = subscribe();
            }),
        };
      } catch {
        if (!disposed) {
          setState({
            status: 'error',
            seed: '',
            error:
              'Local storage is unavailable or the saved tierlist could not be read. Your saved data has not been replaced.',
          });
        }
      }
    };

    void initialize();

    return () => {
      disposed = true;
      controller.current = null;
      unsubscribe();
    };
  }, [store, profileSeed]);

  return {
    ...state,
    snapshot,
    imported: Boolean(snapshot && snapshot.seed !== deviceSeed),
    importProfile,
    restoreDeviceProfile,
    updateSync,
    replaceRemote,
    flush: async () => {
      await controller.current?.flush();
    },
  };
};
