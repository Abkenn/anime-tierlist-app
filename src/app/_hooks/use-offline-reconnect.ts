'use client';

import { useMachine } from '@xstate/react';
import { useRouter } from 'next/navigation';
import { useEffect, useTransition } from 'react';
import { assign, fromPromise, setup } from 'xstate';
import { useOfflineMode } from '@/app/_hooks/use-offline-mode';
import {
  OFFLINE_POLL_INTERVAL_MS,
  OFFLINE_RECONNECT_EVENT,
  OFFLINE_RECOVERED_EVENT,
  withOfflineMode,
} from '@/app/_services/offline-mode';
import type { OfflineMode } from '@/app/_types/offline.types';

const reconnectMachine = setup({
  types: {
    context: {} as { mode: OfflineMode; retryAt?: number },
    events: {} as { type: 'modeChanged'; mode: OfflineMode } | { type: 'retry' | 'online' },
  },
  actors: {
    probe: fromPromise(async ({ signal }) => {
      const response = await fetch('/api/connection', {
        cache: 'no-store',
        redirect: 'error',
        signal,
      });

      return response.status === 200 && response.headers.get('X-Tierlist-Connection') === 'online';
    }),
  },
  actions: {
    navigate: () => {},
    refresh: () => {},
  },
}).createMachine({
  initial: 'idle',
  context: { mode: null },
  on: {
    modeChanged: {
      guard: ({ context, event }) => context.mode !== event.mode,
      actions: assign({ mode: ({ event }) => event.mode }),
      target: '.selectMode',
    },
  },
  states: {
    selectMode: {
      always: [
        { guard: ({ context }) => context.mode === 'offline', target: 'probing' },
        { guard: ({ context }) => context.mode === 'dev-temporary', target: 'waiting' },
        { target: 'idle' },
      ],
    },
    idle: {
      entry: assign({ retryAt: undefined }),
      on: { retry: { guard: ({ context }) => context.mode === 'dev', target: 'probing' } },
    },
    waiting: {
      entry: assign({ retryAt: () => Date.now() + OFFLINE_POLL_INTERVAL_MS }),
      after: { [OFFLINE_POLL_INTERVAL_MS]: 'probing' },
      on: { retry: 'probing', online: 'probing' },
    },
    probing: {
      entry: assign({ retryAt: undefined }),
      invoke: {
        src: 'probe',
        onDone: [
          { guard: ({ event }) => event.output === true, target: 'navigating' },
          { target: 'probeFailed' },
        ],
        onError: 'probeFailed',
      },
      after: { 5000: 'probeFailed' },
    },
    probeFailed: {
      always: [
        { guard: ({ context }) => context.mode === 'dev', target: 'idle' },
        { target: 'waiting' },
      ],
    },
    navigating: {
      entry: 'navigate',
      on: {
        retry: 'probing',
        modeChanged: [
          {
            guard: ({ event }) => event.mode === null,
            actions: [assign({ mode: null }), 'refresh'],
            target: 'idle',
          },
        ],
      },
    },
  },
});

export const useOfflineReconnect = () => {
  const router = useRouter();
  const mode = useOfflineMode();
  const [transitioning, startTransition] = useTransition();
  const [state, send] = useMachine(
    reconnectMachine.provide({
      actions: {
        navigate: () => {
          const href = withOfflineMode(new URL(window.location.href), null);
          startTransition(() =>
            router.replace(href, { scroll: false, transitionTypes: ['reconnect'] }),
          );
        },
        refresh: () => {
          startTransition(() => router.refresh());
          window.dispatchEvent(new Event(OFFLINE_RECOVERED_EVENT));
        },
      },
    }),
  );

  const reconnect = () => send({ type: 'retry' });

  useEffect(() => {
    send({ type: 'modeChanged', mode });
  }, [mode, send]);

  useEffect(() => {
    const retry = () => send({ type: 'retry' });
    const online = () => send({ type: 'online' });
    window.addEventListener(OFFLINE_RECONNECT_EVENT, retry);
    window.addEventListener('online', online);

    return () => {
      window.removeEventListener(OFFLINE_RECONNECT_EVENT, retry);
      window.removeEventListener('online', online);
    };
  }, [send]);

  return {
    mode,
    checking: state.matches('probing') || transitioning,
    reconnect,
    retryAt: state.context.retryAt,
  };
};
