'use client';

import { useStore } from 'jotai';
import { useEffect, useState } from 'react';
import { tierItemsAtom } from '@/app/_atoms/tierlist/items.atoms';
import {
  enabledTierRanksAtom,
  imageModeAtom,
} from '@/app/_atoms/tierlist/settings.atoms';
import { createUserSeed } from '@/app/_lib/local-tierlist';
import {
  loadLocalTierlist,
  saveLocalTierlist,
} from '@/app/_services/local-tierlist';

type StorageState = {
  status: 'loading' | 'saved' | 'saving' | 'error';
  seed: string;
  error?: string;
};

export const useLocalTierlist = () => {
  const store = useStore();
  const [state, setState] = useState<StorageState>({
    status: 'loading',
    seed: '',
  });

  useEffect(() => {
    let disposed = false;
    let unsubscribe = () => {};

    const initialize = async () => {
      try {
        const saved = await loadLocalTierlist({
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

        store.set(tierItemsAtom, saved.items);
        store.set(enabledTierRanksAtom, saved.ranks);
        store.set(imageModeAtom, saved.imageMode);
        setState({ status: 'saved', seed: saved.seed });
        let revision = saved.revision;
        let queue = Promise.resolve();
        let failed = false;
        let pending = 0;

        const persist = () => {
          if (failed) {
            return;
          }

          const snapshot = {
            ...saved,
            items: store.get(tierItemsAtom),
            ranks: store.get(enabledTierRanksAtom),
            imageMode: store.get(imageModeAtom),
          };
          setState({ status: 'saving', seed: saved.seed });
          pending += 1;
          queue = queue
            .then(async () => {
              if (failed) {
                return;
              }

              await saveLocalTierlist(
                { ...snapshot, revision: revision + 1 },
                revision,
              );
              revision += 1;
              pending -= 1;

              if (!disposed && pending === 0) {
                setState({ status: 'saved', seed: saved.seed });
              }
            })
            .catch((error: unknown) => {
              failed = true;

              if (!disposed) {
                setState({
                  status: 'error',
                  seed: saved.seed,
                  error:
                    error instanceof Error
                      ? error.message
                      : 'Unable to save this tierlist on this device.',
                });
              }
            });
        };
        const subscriptions = [
          store.sub(tierItemsAtom, persist),
          store.sub(enabledTierRanksAtom, persist),
          store.sub(imageModeAtom, persist),
        ];
        unsubscribe = () =>
          subscriptions.forEach((stop) => {
            stop();
          });
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
      unsubscribe();
    };
  }, [store]);

  return state;
};
