'use client';

import { useStore } from 'jotai';
import { useEffect, useRef, useState } from 'react';
import { clearEditingItemAtom } from '@/app/_atoms/tierlist/interaction.atoms';
import { tierItemsAtom } from '@/app/_atoms/tierlist/items.atoms';
import {
  enabledTierRanksAtom,
  imageModeAtom,
  posterSizeAtom,
  rankDetailsAtom,
} from '@/app/_atoms/tierlist/settings.atoms';
import { createUserSeed, type LocalTierlist } from '@/app/_lib/local-tierlist';
import { createSaveQueue } from '@/app/_lib/save-queue';
import type { RemoteTierlist } from '@/app/_lib/tierlist-sync';
import { sameTierlistDocument } from '@/app/_lib/tierlist-sync';
import { subscribeTierlistTabs } from '@/app/_lib/tierlist-tabs';
import {
  activateAccountTierlist,
  activateDeviceTierlist,
  activateImportedTierlist,
  backupLocalTierlist,
  getDeviceTierlist,
  LocalTierlistChangedError,
  loadLocalTierlist,
  readLocalTierlist,
  replaceDeviceTierlist,
  saveLocalSyncMetadata,
  saveLocalTierlist,
  saveLocalTierlistEdit,
} from '@/app/_services/local-tierlist';

type StorageState = {
  status: 'loading' | 'saved' | 'saving' | 'error';
  seed: string;
  error?: string;
};
type LocalController = {
  refresh: () => Promise<LocalTierlist>;
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

  const importAccountProfile = (profileKey: string, remote: RemoteTierlist) =>
    changeProfile(profileKey, () =>
      activateAccountTierlist(profileKey, remote),
    );

  const restoreDeviceProfile = () =>
    changeProfile(deviceSeed, activateDeviceTierlist);

  const replaceDeviceProfile = async () => {
    const source = await controller.current?.refresh();
    if (!source) {
      throw new Error('Wait for this tierlist to finish saving.');
    }

    await changeProfile(deviceSeed, async () => {
      await replaceDeviceTierlist({
        seed: source.seed,
        revision: source.revision,
      });
    });
  };

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
    let stopTabs = () => {};

    const initialize = async () => {
      try {
        let current = await loadLocalTierlist({
          version: 1,
          seed: createUserSeed(),
          revision: 0,
          updatedAt: Date.now(),
          items: store.get(tierItemsAtom),
          ranks: store.get(enabledTierRanksAtom),
          imageMode: store.get(imageModeAtom),
          posterSize: store.get(posterSizeAtom),
          rankDetails: store.get(rankDetailsAtom),
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
        let observed = current;

        const hydrate = (clearEditing = true) => {
          if (clearEditing) {
            store.set(clearEditingItemAtom);
          }
          store.set(tierItemsAtom, current.items);
          store.set(enabledTierRanksAtom, current.ranks);
          store.set(imageModeAtom, current.imageMode);
          store.set(posterSizeAtom, current.posterSize ?? 'dynamic');
          store.set(rankDetailsAtom, current.rankDetails ?? {});
          observed = current;
        };

        const publish = (pending = 0) => {
          if (!disposed) {
            setSnapshot(current);
            setState({
              status: pending ? 'saving' : 'saved',
              seed: current.seed,
            });
          }
        };

        const queue = createSaveQueue({
          onSaving: () => {
            if (!disposed) {
              setState({ status: 'saving', seed: current.seed });
            }
          },
          onSettled: (pending) => {
            if (
              !pending &&
              !disposed &&
              !sameTierlistDocument(observed, current)
            ) {
              unsubscribe();
              hydrate(false);
              unsubscribe = subscribe();
            }
            publish(pending);
          },
          onError: (error) => {
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
          },
        });

        const persist = async () => {
          if (queue.failed) {
            return;
          }

          const document = {
            updatedAt: Date.now(),
            items: store.get(tierItemsAtom),
            ranks: store.get(enabledTierRanksAtom),
            imageMode: store.get(imageModeAtom),
            posterSize: store.get(posterSizeAtom),
            rankDetails: store.get(rankDetailsAtom),
          };
          const before = observed;
          observed = { ...observed, ...document };
          try {
            await queue.enqueue(async () => {
              current = await saveLocalTierlistEdit(
                current.seed,
                before,
                document,
              );
            });
          } catch {
            // The queue reports failures; atom subscriptions have no promise consumer.
          }
        };

        hydrate();
        publish();

        const subscribe = () => {
          const subscriptions = [
            store.sub(tierItemsAtom, persist),
            store.sub(enabledTierRanksAtom, persist),
            store.sub(imageModeAtom, persist),
            store.sub(posterSizeAtom, persist),
            store.sub(rankDetailsAtom, persist),
          ];

          return () =>
            subscriptions.forEach((stop) => {
              stop();
            });
        };

        unsubscribe = subscribe();
        const refresh = async () => {
          await queue.enqueue(async () => {
            current = await readLocalTierlist(current.seed);
          }, false);

          return current;
        };
        const receive = async () => {
          if (disposed || queue.failed) {
            return;
          }

          try {
            await refresh();
          } catch {
            // The save queue owns storage failure feedback.
          }
        };
        stopTabs = subscribeTierlistTabs(() => void receive());
        void receive();
        controller.current = {
          refresh,
          flush: queue.flush,
          metadata: (remote, localRevision) => {
            if (
              current.sync?.ownerId === remote.ownerId &&
              current.sync.serverRevision === remote.revision &&
              current.sync.syncedLocalRevision === localRevision
            ) {
              return queue.flush();
            }

            return queue.enqueue(async () => {
              current = await saveLocalSyncMetadata(
                current.seed,
                remote,
                localRevision,
              );
            });
          },
          replace: (remote, expectedRevision) =>
            queue.enqueue(async () => {
              current = await readLocalTierlist(current.seed);
              if (
                expectedRevision !== undefined &&
                current.revision !== expectedRevision
              ) {
                return;
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
              try {
                await saveLocalTierlist(next, current.revision);
              } catch (error) {
                if (!(error instanceof LocalTierlistChangedError)) {
                  throw error;
                }

                current = await readLocalTierlist(current.seed);

                return;
              }
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
      stopTabs();
    };
  }, [store, profileSeed]);

  return {
    ...state,
    snapshot,
    imported: Boolean(snapshot && snapshot.seed !== deviceSeed),
    importProfile,
    importAccountProfile,
    restoreDeviceProfile,
    replaceDeviceProfile,
    updateSync,
    replaceRemote,
    refresh: async () => controller.current?.refresh(),
    flush: async () => {
      await controller.current?.flush();
    },
  };
};
