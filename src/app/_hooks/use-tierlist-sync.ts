'use client';

import { useEffect, useRef, useState } from 'react';
import {
  isOutdatedTierlistClient,
  tierlistErrorMessage,
  tierlistUpdateMessage,
} from '@/app/_lib/tierlist-error';
import {
  getSyncDecision,
  getTierlistDocument,
  type RemoteTierlist,
  sameTierlistDocument,
} from '@/app/_lib/tierlist-sync';
import { backupRemoteTierlist } from '@/app/_services/local-tierlist';
import {
  connectTierlist,
  syncTierlist,
} from '@/app/_services/tierlist.actions';
import type { useLocalTierlist } from './use-local-tierlist';

type SyncScope = {
  seed: string;
  remote?: RemoteTierlist;
  running: boolean;
  failed: boolean;
  attempt: number;
  outdated: boolean;
};
type SyncState = {
  status:
    | 'connecting'
    | 'saved'
    | 'saving'
    | 'offline'
    | 'conflict'
    | 'outdated';
  message?: string;
  conflict?: RemoteTierlist;
  retryAt?: number;
};

export const useTierlistSync = (
  storage: ReturnType<typeof useLocalTierlist>,
  paused: boolean,
) => {
  const scope = useRef<SyncScope | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<SyncState>({ status: 'connecting' });
  const local = storage.snapshot;
  const seed = local?.seed;

  const retry = () => {
    if (scope.current?.outdated) {
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
    if (!local || !state.conflict) {
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

    const result = await connectTierlist({ seed: local.seed });

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
      ? { seed, running: false, failed: false, outdated: false, attempt: -1 }
      : null;
    setState({ status: 'connecting' });

    return () => {
      scope.current = null;
    };
  }, [seed]);

  useEffect(() => {
    const reconnect = () => {
      if (scope.current?.running || scope.current?.outdated) {
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
    if (paused || state.status !== 'offline' || !state.retryAt) {
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
      Math.max(0, state.retryAt - Date.now()),
    );

    return () => clearTimeout(timer);
  }, [paused, state.status, state.retryAt]);

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

        if (!active.remote) {
          const result = await connectTierlist({
            seed: local.seed,
            document: getTierlistDocument(local),
          });

          if (!result.ok) {
            throw new Error(result.message);
          }

          active.remote = result.value;
        }

        if (scope.current !== active || active.attempt !== attempt) {
          return;
        }

        const decision = getSyncDecision(local, active.remote);

        if (decision === 'conflict') {
          setState({ status: 'conflict', conflict: active.remote });
          return;
        }

        if (decision === 'download') {
          await storage.replaceRemote(active.remote, local.revision);
        } else if (decision === 'equal') {
          await storage.updateSync(active.remote, local.revision);
        } else {
          const result = await syncTierlist({
            ownerId: active.remote.ownerId,
            revision: active.remote.revision,
            document: getTierlistDocument(local),
          });

          if (!result.ok) {
            throw new Error(result.message);
          }

          active.remote = result.value.tierlist;

          if (scope.current !== active) {
            return;
          }

          if (result.value.status === 'conflict') {
            setState({ status: 'conflict', conflict: active.remote });
            return;
          }

          await storage.updateSync(active.remote, local.revision);
        }

        if (scope.current === active) {
          if (!active.outdated) {
            setState({ status: 'saved' });
          }
        }
      } catch (error) {
        active.failed = true;
        active.outdated ||= isOutdatedTierlistClient(error);

        if (scope.current === active) {
          setState({
            status: active.outdated ? 'outdated' : 'offline',
            message: active.outdated
              ? tierlistUpdateMessage
              : tierlistErrorMessage(
                  error,
                  'Couldn’t reach your saved tierlist right now.',
                ),
            retryAt: active.outdated ? undefined : Date.now() + 30_000,
          });
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
  ]);

  return {
    ...state,
    retry,
    requireReload,
    keepDeviceChanges,
    acceptOnlineChanges,
  };
};
