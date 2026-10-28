import {
  createStore,
  entries,
  get,
  promisifyRequest,
  set,
  setMany,
  update,
} from 'idb-keyval';
import {
  type LocalTierlist,
  localTierlistSchema,
} from '@/app/_lib/local-tierlist';
import {
  applyLocalTierlistEdit,
  type LocalTierlistContent,
} from '@/app/_lib/tierlist-local-edit';
import {
  getTierlistDocument,
  type RemoteTierlist,
  type TierlistDocument,
} from '@/app/_lib/tierlist-sync';
import { notifyTierlistTabs } from '@/app/_lib/tierlist-tabs';

const key = 'personal-tierlist';

const storage = createStore('anime-tierlist', 'drafts');
const activeKey = 'active-tierlist-seed';

export class LocalTierlistChangedError extends Error {
  constructor() {
    super(
      'This tierlist changed in another tab. Reload before editing further.',
    );
  }
}

export const getDeviceTierlist = async () =>
  localTierlistSchema.parse(await get<unknown>(key, storage));

const profileKey = async (seed: string) =>
  (await getDeviceTierlist()).seed === seed ? key : `profile:${seed}`;

export const readLocalTierlist = async (seed: string) =>
  localTierlistSchema.parse(
    await get<unknown>(await profileKey(seed), storage),
  );

export const saveLocalTierlistEdit = async (
  seed: string,
  before: LocalTierlistContent,
  after: LocalTierlistContent,
) => {
  let saved: LocalTierlist | undefined;
  await update<unknown>(
    await profileKey(seed),
    (existing) => {
      saved = localTierlistSchema.parse(
        applyLocalTierlistEdit(
          localTierlistSchema.parse(existing),
          before,
          after,
        ),
      );

      return saved;
    },
    storage,
  );
  notifyTierlistTabs();

  return localTierlistSchema.parse(saved);
};

export const saveLocalSyncMetadata = async (
  seed: string,
  remote: RemoteTierlist,
  localRevision: number,
) => {
  let saved: LocalTierlist | undefined;
  await update<unknown>(
    await profileKey(seed),
    (existing) => {
      const current = localTierlistSchema.parse(existing);
      saved =
        current.sync && current.sync.serverRevision > remote.revision
          ? current
          : {
              ...current,
              sync: {
                ownerId: remote.ownerId,
                serverRevision: remote.revision,
                syncedLocalRevision: localRevision,
              },
            };

      return saved;
    },
    storage,
  );
  notifyTierlistTabs();

  return localTierlistSchema.parse(saved);
};

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
) => {
  await update<unknown>(
    await profileKey(snapshot.seed),
    (existing) => {
      const current = localTierlistSchema.parse(existing);

      if (current.revision !== revision || current.seed !== snapshot.seed) {
        throw new LocalTierlistChangedError();
      }

      return localTierlistSchema.parse(snapshot);
    },
    storage,
  );
  notifyTierlistTabs();
};

export const activateImportedTierlist = async (
  seed: string,
  remote: RemoteTierlist,
  temporary = false,
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
      ...(temporary ? [] : [[activeKey, seed] as [string, string]]),
    ],
    storage,
  );
};

export const activateDeviceTierlist = async () => {
  await set(activeKey, (await getDeviceTierlist()).seed, storage);
};

type ReplaceDeviceInput = { seed: string; revision: number };

const copyImportedIntoDevice = async (
  store: IDBObjectStore,
  input: ReplaceDeviceInput,
) => {
  const [deviceValue, sourceValue] = await Promise.all([
    promisifyRequest(store.get(key)),
    promisifyRequest(store.get(`profile:${input.seed}`)),
  ]);
  const device = localTierlistSchema.parse(deviceValue);
  const source = localTierlistSchema.parse(sourceValue);
  if (source.revision !== input.revision) {
    throw new LocalTierlistChangedError();
  }
  if (
    source.accountOwnerId ||
    device.accountOwnerId ||
    source.seed === device.seed
  ) {
    throw new Error(
      'Open an imported anonymous tierlist before replacing this device’s list.',
    );
  }

  const snapshot = localTierlistSchema.parse({
    ...device,
    ...getTierlistDocument(source),
    revision: device.revision + 1,
    updatedAt: Date.now(),
  });
  try {
    store.put(device, `before-replace:${device.seed}`);
    store.put(snapshot, key);
    store.put(device.seed, activeKey);
  } catch (failure) {
    store.transaction.abort();
    throw failure;
  }

  return snapshot;
};

export const replaceDeviceTierlist = async (input: ReplaceDeviceInput) => {
  const snapshot = await storage('readwrite', async (store) => {
    const complete = promisifyRequest(store.transaction);
    const [copied] = await Promise.all([
      copyImportedIntoDevice(store, input),
      complete,
    ]);

    return copied;
  });
  notifyTierlistTabs();

  return snapshot;
};

export const adoptPublicTierlist = async (
  document: TierlistDocument,
  expected: { seed: string; revision: number },
) => {
  await storage('readwrite', async (store) => {
    const complete = promisifyRequest(store.transaction);
    const copy = async () => {
      const device = localTierlistSchema.parse(
        await promisifyRequest(store.get(key)),
      );
      if (
        device.seed !== expected.seed ||
        device.revision !== expected.revision ||
        device.accountOwnerId
      ) {
        throw new LocalTierlistChangedError();
      }
      const snapshot = localTierlistSchema.parse({
        ...device,
        ...getTierlistDocument(document),
        revision: device.revision + 1,
        updatedAt: Date.now(),
      });
      try {
        store.put(device, `before-replace:${device.seed}`);
        store.put(snapshot, key);
        store.put(device.seed, activeKey);
      } catch (error) {
        store.transaction.abort();
        throw error;
      }
    };
    await Promise.all([copy(), complete]);
  });
  notifyTierlistTabs();
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
