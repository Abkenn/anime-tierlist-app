'use client';

import { useEffect, useRef, useState } from 'react';
import {
  isOutdatedTierlistClient,
  tierlistErrorMessage,
  tierlistUpdateMessage,
} from '@/app/_lib/tierlist-error';
import {
  getTierlistDocument,
  type RemoteTierlist,
  sameTierlistDocument,
} from '@/app/_lib/tierlist-sync';
import { withTierlistSyncLock } from '@/app/_lib/tierlist-tabs';
import { backupRemoteTierlist } from '@/app/_services/local-tierlist';
import {
  synchronizeTierlist,
  TierlistSyncError,
} from '@/app/_services/synchronize-tierlist';
import { connectTierlist } from '@/app/_services/tierlist.actions';
import type { useLocalTierlist } from './use-local-tierlist';

type SyncScope = {
  seed: string;
  remote?: RemoteTierlist;
  running: boolean;
  failed: boolean;
  attempt: number;
  outdated: boolean;
  unauthorized: boolean;
};
type SyncState =
  | { status: 'connecting' | 'saved' | 'saving' }
  | { status: 'offline'; message: string; retryAt: number }
  | { status: 'conflict'; conflict: RemoteTierlist }
  | { status: 'outdated' | 'unauthorized'; message: string };

const getSyncFailureState = (
  error: unknown,
  { outdated, unauthorized }: Pick<SyncScope, 'outdated' | 'unauthorized'>,
): SyncState => {
  if (outdated) {
    return { status: 'outdated', message: tierlistUpdateMessage };
  }

  const message = tierlistErrorMessage(
    error,
    'Couldn’t reach your saved tierlist right now.',
  );

  return unauthorized
    ? { status: 'unauthorized', message }
    : { status: 'offline', message, retryAt: Date.now() + 30_000 };
};

export const useTierlistSync = (
  storage: ReturnType<typeof useLocalTierlist>,
  paused: boolean,
  account = false,
) => {
  const scope = useRef<SyncScope | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<SyncState>({ status: 'connecting' });
  const local = storage.snapshot;
  const seed = local?.seed;
  const retryAt = state.status === 'offline' ? state.retryAt : undefined;
  const conflict = state.status === 'conflict' ? state.conflict : undefined;

  const retry = () => {
    if (scope.current?.outdated || scope.current?.unauthorized) {
      return;
    }

    if (scope.current) {
      scope.current.failed = false;
      scope.current.remote = undefined;
    }

    setAttempt((value) => value + 1);
    setState({ status: 'connecting' });
  };

  const requireReload = () => {
    if (scope.current) {
      scope.current.outdated = true;
      scope.current.failed = true;
    }

    setState({ status: 'outdated', message: tierlistUpdateMessage });
  };

  const keepDeviceChanges = async () => {
    if (!local || state.status !== 'conflict') {
      return;
    }

    await backupRemoteTierlist(local.seed, state.conflict);
    await storage.updateSync(
      state.conflict,
      local.sync?.syncedLocalRevision ?? 0,
    );
    if (scope.current) {
      scope.current.remote = state.conflict;
    }

    setState({ status: 'saving' });
    setAttempt((value) => value + 1);
  };

  const acceptOnlineChanges = async () => {
    if (!local) {
      return;
    }

    const result = await connectTierlist(
      account ? { account: true } : { seed: local.seed },
    );

    if (!result.ok) {
      throw new Error(result.message);
    }

    await storage.replaceRemote(result.value);
    if (scope.current) {
      scope.current.remote = result.value;
    }

    setState({ status: 'saved' });
  };

  useEffect(() => {
    scope.current = seed
      ? {
          seed,
          running: false,
          failed: false,
          outdated: false,
          unauthorized: false,
          attempt: -1,
        }
      : null;
    setState({ status: 'connecting' });

    return () => {
      scope.current = null;
    };
  }, [seed]);

  useEffect(() => {
    const reconnect = () => {
      if (
        scope.current?.running ||
        scope.current?.outdated ||
        scope.current?.unauthorized
      ) {
        return;
      }

      if (scope.current) {
        scope.current.failed = false;
        scope.current.remote = undefined;
      }

      setAttempt((value) => value + 1);
    };

    window.addEventListener('online', reconnect);
    window.addEventListener('focus', reconnect);

    return () => {
      window.removeEventListener('online', reconnect);
      window.removeEventListener('focus', reconnect);
    };
  }, []);

  useEffect(() => {
    if (paused || retryAt === undefined) {
      return;
    }

    const timer = setTimeout(
      () => {
        if (scope.current) {
          scope.current.failed = false;
          scope.current.remote = undefined;
        }

        setState({ status: 'connecting' });
        setAttempt((value) => value + 1);
      },
      Math.max(0, retryAt - Date.now()),
    );

    return () => clearTimeout(timer);
  }, [paused, retryAt]);

  useEffect(() => {
    if (
      conflict &&
      local?.sync &&
      local.sync.ownerId === conflict.ownerId &&
      local.sync.serverRevision >= conflict.revision
    ) {
      if (scope.current) {
        scope.current.remote = undefined;
      }
      setState({ status: 'connecting' });
    }
  }, [local, conflict]);

  useEffect(() => {
    const active = scope.current;

    if (
      !local ||
      !active ||
      paused ||
      active.running ||
      active.failed ||
      active.outdated ||
      state.status === 'conflict' ||
      storage.status === 'error'
    ) {
      return;
    }

    if (
      active.remote &&
      local.sync?.syncedLocalRevision === local.revision &&
      local.sync.serverRevision === active.remote.revision &&
      sameTierlistDocument(getTierlistDocument(local), active.remote.document)
    ) {
      return;
    }

    const synchronize = async () => {
      active.running = true;
      active.attempt = attempt;

      try {
        await withTierlistSyncLock(async () => {
          const latest = await storage.refresh();
          if (
            !latest ||
            scope.current !== active ||
            latest.seed !== active.seed
          ) {
            return;
          }

          const local = latest;
          if (
            active.remote &&
            local.sync &&
            local.sync.serverRevision > active.remote.revision
          ) {
            active.remote = undefined;
          }

          if (!navigator.onLine) {
            throw new Error(
              'Saved on this device. Online saving will resume when connected.',
            );
          }

          const checkingSavedChanges =
            state.status === 'saved' &&
            local.sync?.syncedLocalRevision === local.revision;

          if (!checkingSavedChanges) {
            setState({ status: active.remote ? 'saving' : 'connecting' });
          }

          const result = await synchronizeTierlist({
            local,
            remote: active.remote,
            account,
            storage: {
              replaceRemote: storage.replaceRemote,
              updateSync: storage.updateSync,
            },
            isCurrent: () =>
              scope.current === active && active.attempt === attempt,
          });
          if (!result || scope.current !== active) {
            return;
          }

          active.remote = result.remote;
          if (!active.outdated) {
            setState(
              result.status === 'conflict'
                ? { status: 'conflict', conflict: result.remote }
                : { status: 'saved' },
            );
          }
        });
      } catch (error) {
        active.failed = true;
        active.unauthorized ||=
          error instanceof TierlistSyncError && error.code === 'unauthorized';
        active.outdated ||= isOutdatedTierlistClient(error);

        if (scope.current === active) {
          setState(getSyncFailureState(error, active));
        }
      } finally {
        active.running = false;

        if (scope.current === active && !active.failed) {
          setAttempt((value) => value + 1);
        }
      }
    };

    const timer = setTimeout(() => {
      void synchronize();
    }, 350);

    return () => clearTimeout(timer);
  }, [
    local,
    attempt,
    paused,
    state.status,
    storage.status,
    storage.updateSync,
    storage.replaceRemote,
    storage.refresh,
    account,
  ]);

  return {
    ...state,
    retry,
    requireReload,
    keepDeviceChanges,
    acceptOnlineChanges,
  };
};
