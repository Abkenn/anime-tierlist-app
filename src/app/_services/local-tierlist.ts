import { createStore, get, update } from 'idb-keyval';
import {
  type LocalTierlist,
  localTierlistSchema,
} from '@/app/_lib/local-tierlist';

const key = 'personal-tierlist';

const storage = createStore('anime-tierlist', 'drafts');

export const loadLocalTierlist = async (initial: LocalTierlist) => {
  const store = storage;
  await update<unknown>(key, (existing) => existing ?? initial, store);

  return localTierlistSchema.parse(await get<unknown>(key, store));
};

export const saveLocalTierlist = (snapshot: LocalTierlist, revision: number) =>
  update<unknown>(
    key,
    (existing) => {
      const current = localTierlistSchema.parse(existing);

      if (current.revision !== revision || current.seed !== snapshot.seed) {
        throw new Error(
          'This tierlist changed in another tab. Reload before editing further.',
        );
      }

      return localTierlistSchema.parse(snapshot);
    },
    storage,
  );
