import type { LocalTierlist } from '@/app/_lib/local-tierlist';
import {
  getSyncDecision,
  getTierlistDocument,
  type RemoteTierlist,
  type SyncResult,
  type TierlistFailureCode,
} from '@/app/_lib/tierlist-sync';
import { connectTierlist, syncTierlist } from './tierlist.actions';

type SynchronizeTierlistInput = {
  local: LocalTierlist;
  remote?: RemoteTierlist;
  account: boolean;
  isCurrent: () => boolean;
  storage: {
    replaceRemote: (
      remote: RemoteTierlist,
      expectedRevision: number,
    ) => Promise<void>;
    updateSync: (
      remote: RemoteTierlist,
      localRevision: number,
    ) => Promise<void>;
  };
};

export class TierlistSyncError extends Error {
  constructor(
    readonly code: TierlistFailureCode,
    message: string,
  ) {
    super(message);
  }
}

const readResult = <T>(result: SyncResult<T>) => {
  if (!result.ok) {
    throw new TierlistSyncError(result.code, result.message);
  }

  return result.value;
};

export const synchronizeTierlist = async ({
  local,
  remote: cachedRemote,
  account,
  isCurrent,
  storage,
}: SynchronizeTierlistInput) => {
  let remote =
    cachedRemote ??
    readResult(
      await connectTierlist(
        account
          ? { account: true }
          : { seed: local.seed, document: getTierlistDocument(local) },
      ),
    );
  if (!isCurrent()) {
    return;
  }

  switch (getSyncDecision(local, remote)) {
    case 'conflict':
      return { status: 'conflict' as const, remote };
    case 'download':
      await storage.replaceRemote(remote, local.revision);
      break;
    case 'equal':
      await storage.updateSync(remote, local.revision);
      break;
    case 'upload': {
      const result = readResult(
        await syncTierlist({
          ownerId: remote.ownerId,
          revision: remote.revision,
          document: getTierlistDocument(local),
        }),
      );
      if (!isCurrent()) {
        return;
      }

      remote = result.tierlist;
      if (result.status === 'conflict') {
        return { status: 'conflict' as const, remote };
      }

      await storage.updateSync(remote, local.revision);
      break;
    }
  }

  return { status: 'saved' as const, remote };
};
