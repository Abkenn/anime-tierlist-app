'use client';

import { useMachine } from '@xstate/react';
import { useEffect, useEffectEvent, useLayoutEffect } from 'react';
import { match, P } from 'ts-pattern';
import { type SnapshotFrom, waitFor } from 'xstate';
import { tierlistUpdateMessage } from '@/app/_lib/tierlist-error';
import { tierlistSyncMachine } from '@/app/_lib/tierlist-sync-machine';
import { OFFLINE_RECOVERED_EVENT } from '@/app/_services/offline-mode';
import type { useLocalTierlist } from './use-local-tierlist';

type SyncStatus =
  | { status: 'connecting' | 'saving' | 'saved' }
  | { status: 'offline'; message: string; retryAt: number }
  | { status: 'outdated' | 'unauthorized'; message: string }
  | {
      status: 'conflict';
      conflict: NonNullable<SnapshotFrom<typeof tierlistSyncMachine>['context']['conflict']>;
    };

const syncStatus = (
  state: SnapshotFrom<typeof tierlistSyncMachine>,
  current: boolean,
): SyncStatus => {
  const { conflict, remote, message, retryAt, command, input } = state.context;
  const needsSave =
    Boolean(command) || input.local?.sync?.syncedLocalRevision !== input.local?.revision;

  return match({ current, value: state.value, conflict, remote, command, needsSave })
    .returnType<SyncStatus>()
    .with({ current: false }, () => ({ status: 'connecting' }))
    .with({ value: { offline: P._ } }, () => ({ status: 'offline', message, retryAt }))
    .with({ value: 'outdated' }, () => ({ status: 'outdated', message: tierlistUpdateMessage }))
    .with({ value: 'unauthorized' }, () => ({ status: 'unauthorized', message }))
    .with({ conflict: P.nonNullable }, ({ conflict }) => ({ status: 'conflict', conflict }))
    .with({ remote: undefined, command: undefined }, () => ({ status: 'connecting' }))
    .with({ value: P.union('working', 'debouncing'), needsSave: true }, () => ({
      status: 'saving',
    }))
    .otherwise(() => ({ status: 'saved' }));
};

export const useTierlistSync = (
  storage: ReturnType<typeof useLocalTierlist>,
  paused: boolean,
  account = false,
) => {
  const local = storage.snapshot;
  const suspended = paused || storage.status === 'error';
  const [state, send, actor] = useMachine(tierlistSyncMachine, {
    input: { storage, local, paused: suspended, account },
  });
  const current =
    state.context.input.local?.seed === local?.seed && state.context.input.account === account;

  const update = useEffectEvent(
    (local: typeof storage.snapshot, paused: boolean, account: boolean) =>
      send({ type: 'update', input: { storage, local, paused, account } }),
  );

  useLayoutEffect(() => {
    update(local, suspended, account);
  }, [local, suspended, account]);

  useEffect(() => {
    const reconnect = () => send({ type: 'retry' });
    window.addEventListener('online', reconnect);
    window.addEventListener(OFFLINE_RECOVERED_EVENT, reconnect);
    window.addEventListener('focus', reconnect);

    return () => {
      window.removeEventListener('online', reconnect);
      window.removeEventListener(OFFLINE_RECOVERED_EVENT, reconnect);
      window.removeEventListener('focus', reconnect);
    };
  }, [send]);

  const run = async (type: 'saveNow' | 'keepDevice' | 'acceptOnline') => {
    let next = actor.getSnapshot();
    while (
      type === 'saveNow' &&
      next.matches('working') &&
      next.context.input.local?.seed === local?.seed &&
      next.context.input.account === account
    ) {
      await waitFor(
        actor,
        (snapshot) =>
          !snapshot.matches('working') ||
          snapshot.context.input.local?.seed !== local?.seed ||
          snapshot.context.input.account !== account,
      );
      next = actor.getSnapshot();
    }

    if (next.context.input.local?.seed !== local?.seed || next.context.input.account !== account) {
      throw new Error('Your tierlist changed. Reopen Share.');
    }

    const { promise, resolve, reject } = Promise.withResolvers<void>();
    const event = { type, resolve, reject };
    if (!next.can(event)) {
      if (type === 'saveNow') {
        throw new Error('Finish connecting or resolve the conflict before sharing.');
      }

      return;
    }

    send(event);
    await promise;
  };

  return {
    ...syncStatus(state, current),
    retry: () => send({ type: 'retry' }),
    saveNow: () => run('saveNow'),
    requireReload: () => send({ type: 'reload' }),
    keepDeviceChanges: () => run('keepDevice'),
    acceptOnlineChanges: () => run('acceptOnline'),
  };
};
