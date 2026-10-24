import { createStore, entries, get, set, setMany, update } from 'idb-keyval';
import {
  type LocalTierlist,
  localTierlistSchema,
} from '@/app/_lib/local-tierlist';
import type { RemoteTierlist } from '@/app/_lib/tierlist-sync';

const key = 'personal-tierlist';

const storage = createStore('anime-tierlist', 'drafts');
const activeKey = 'active-tierlist-seed';

export const getDeviceTierlist = async () =>
  localTierlistSchema.parse(await get<unknown>(key, storage));

const profileKey = async (seed: string) =>
  (await getDeviceTierlist()).seed === seed ? key : `profile:${seed}`;

export const loadLocalTierlist = async (initial: LocalTierlist) => {
  const store = storage;
  await update<unknown>(key, (existing) => existing ?? initial, store);

  const device = await getDeviceTierlist();
  const active = await get<string>(activeKey, store);

  return active && active !== device.seed
    ? localTierlistSchema.parse(await get<unknown>(`profile:${active}`, store))
    : device;
};

export const saveLocalTierlist = async (
  snapshot: LocalTierlist,
  revision: number,
) =>
  update<unknown>(
    await profileKey(snapshot.seed),
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

export const activateImportedTierlist = async (
  seed: string,
  remote: RemoteTierlist,
) => {
  const target = await profileKey(seed);
  const existing = await get<unknown>(target, storage);
  const snapshot =
    existing === undefined
      ? localTierlistSchema.parse({
          ...remote.document,
          seed,
          revision: 0,
          sync: {
            ownerId: remote.ownerId,
            serverRevision: remote.revision,
            syncedLocalRevision: 0,
          },
        })
      : localTierlistSchema.parse(existing);
  await setMany(
    [
      [target, snapshot],
      [activeKey, seed],
    ],
    storage,
  );
};

export const activateDeviceTierlist = async () => {
  await set(activeKey, (await getDeviceTierlist()).seed, storage);
};

export const activateAccountTierlist = async (
  profileKey: string,
  remote: RemoteTierlist,
) => {
  const existing = await get<unknown>(`profile:${profileKey}`, storage);
  const active = await get<string>(activeKey, storage);
  const profiles = await entries(storage);
  const previous = profiles
    .filter(
      ([key]) =>
        typeof key === 'string' &&
        (key === 'personal-tierlist' || key.startsWith('profile:')),
    )
    .sort(
      ([first], [second]) =>
        Number(second === `profile:${active}`) -
        Number(first === `profile:${active}`),
    )
    .map(([, value]) => localTierlistSchema.safeParse(value))
    .find(
      (profile) =>
        profile.success && profile.data.sync?.ownerId === remote.ownerId,
    );
  const snapshot = localTierlistSchema.parse(
    existing ??
      (previous?.success
        ? { ...previous.data, seed: profileKey }
        : {
            ...remote.document,
            seed: profileKey,
            revision: 0,
            sync: {
              ownerId: remote.ownerId,
              serverRevision: remote.revision,
              syncedLocalRevision: 0,
            },
          }),
  );
  await setMany(
    [
      [
        `profile:${profileKey}`,
        { ...snapshot, accountOwnerId: remote.ownerId },
      ],
      [activeKey, profileKey],
    ],
    storage,
  );
};

export const backupLocalTierlist = async (snapshot: LocalTierlist) => {
  await set(`before-replace:${snapshot.seed}`, snapshot, storage);
};

export const backupRemoteTierlist = async (
  seed: string,
  remote: RemoteTierlist,
) => {
  await set(`before-upload:${seed}`, remote, storage);
};
