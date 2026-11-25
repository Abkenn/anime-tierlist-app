import { assign, fromPromise, setup } from 'xstate';
import type { LocalTierlist } from '@/app/_lib/local-tierlist';
import { isOutdatedTierlistClient, tierlistErrorMessage } from '@/app/_lib/tierlist-error';
import {
  getTierlistDocument,
  type RemoteTierlist,
  sameTierlistDocument,
} from '@/app/_lib/tierlist-sync';
import { withTierlistSyncLock } from '@/app/_lib/tierlist-tabs';
import { backupRemoteTierlist } from '@/app/_services/local-tierlist';
import { markOffline } from '@/app/_services/offline-mode';
import { synchronizeTierlist, TierlistSyncError } from '@/app/_services/synchronize-tierlist';
import { connectTierlist } from '@/app/_services/tierlist.actions';

type Storage = {
  refresh: () => Promise<LocalTierlist | undefined>;
  updateSync: (remote: RemoteTierlist, revision: number) => Promise<void>;
  replaceRemote: (remote: RemoteTierlist, revision?: number) => Promise<void>;
};

export type SyncInput = {
  storage: Storage;
  local?: LocalTierlist;
  paused: boolean;
  account: boolean;
};

type SyncCommand = {
  type: 'saveNow' | 'keepDevice' | 'acceptOnline';
  resolve: () => void;
  reject: (error: unknown) => void;
};

type SyncContext = {
  input: SyncInput;
  remote?: RemoteTierlist;
  conflict?: RemoteTierlist;
  command?: SyncCommand;
  message: string;
  retryAt: number;
};

type SyncEvent = { type: 'update'; input: SyncInput } | { type: 'retry' | 'reload' } | SyncCommand;
type OperationResult = { status: 'saved' | 'conflict'; remote: RemoteTierlist } | undefined;

const syncErrorMessage = (error: unknown) =>
  tierlistErrorMessage(error, 'Couldn?t reach your saved tierlist right now.');

const changed = () => new Error('Your tierlist changed. Reopen Share.');
const isSynced = (local?: LocalTierlist, remote?: RemoteTierlist) =>
  Boolean(
    local &&
      remote &&
      local.sync?.ownerId === remote.ownerId &&
      local.sync.syncedLocalRevision === local.revision &&
      local.sync.serverRevision === remote.revision &&
      sameTierlistDocument(getTierlistDocument(local), remote.document),
  );

const conflictResolved = (local?: LocalTierlist, conflict?: RemoteTierlist) =>
  Boolean(
    conflict &&
      local?.sync?.ownerId === conflict.ownerId &&
      local.sync.serverRevision >= conflict.revision,
  );

const runSync = async (context: SyncContext, signal: AbortSignal): Promise<OperationResult> => {
  const {
    input: { storage, local, account },
    command,
    conflict,
  } = context;
  let result: OperationResult;

  await withTierlistSyncLock(async () => {
    signal.throwIfAborted();
    const latest = await storage.refresh();
    signal.throwIfAborted();
    if (!latest || latest.seed !== local?.seed) {
      throw changed();
    }

    if (conflict && command?.type === 'keepDevice') {
      if (conflictResolved(latest, conflict)) {
        return;
      }

      await backupRemoteTierlist(latest.seed, conflict);
      signal.throwIfAborted();
      await storage.updateSync(conflict, latest.sync?.syncedLocalRevision ?? 0);
      result = { status: 'saved', remote: conflict };
      return;
    }

    if (conflict && command?.type === 'acceptOnline') {
      if (conflictResolved(latest, conflict)) {
        return;
      }

      if (latest.revision !== local.revision) {
        throw new Error('Your tierlist changed while resolving the conflict. Try again.');
      }

      const online = await connectTierlist(account ? { account: true } : { seed: latest.seed });
      signal.throwIfAborted();
      if (!online.ok) {
        throw new TierlistSyncError(online.code, online.message);
      }

      await storage.replaceRemote(online.value, latest.revision);
      signal.throwIfAborted();
      const replaced = await storage.refresh();
      if (!conflictResolved(replaced, online.value)) {
        throw new Error('Your tierlist changed while resolving the conflict. Try again.');
      }

      result = { status: 'saved', remote: online.value };
      return;
    }

    if (!navigator.onLine && !command) {
      throw new Error('Saved on this device. Online saving will resume when connected.');
    }

    const cached = context.remote;
    const remote =
      !command && cached && (!latest.sync || latest.sync.serverRevision <= cached.revision)
        ? cached
        : undefined;

    if (isSynced(latest, remote) && remote) {
      result = { status: 'saved', remote };
      return;
    }

    result = await synchronizeTierlist({
      local: latest,
      account,
      remote,
      storage,
      isCurrent: () => !signal.aborted,
    });
  });

  return result;
};

export const tierlistSyncMachine = setup({
  types: {
    context: {} as SyncContext,
    input: {} as SyncInput,
    events: {} as SyncEvent,
  },
  actors: {
    sync: fromPromise<OperationResult, SyncContext>(async ({ input, signal }) => {
      const abort = () => input.command?.reject(changed());
      signal.addEventListener('abort', abort, { once: true });

      try {
        return await runSync(input, signal);
      } finally {
        signal.removeEventListener('abort', abort);
      }
    }),
  },
  guards: {
    shouldSync: ({ context }) =>
      Boolean(
        context.input.local &&
          !context.input.paused &&
          !isSynced(context.input.local, context.remote),
      ),
    canSave: ({ context }) => Boolean(context.input.local && !context.input.paused),
  },
  delays: {
    untilRetry: ({ context }) => Math.max(0, context.retryAt - Date.now()),
  },
  actions: {
    reset: assign({ remote: undefined, conflict: undefined, command: undefined, message: '' }),
    startCommand: assign(({ event }) => ('resolve' in event ? { command: event } : {})),
  },
}).createMachine({
  initial: 'ready',
  context: ({ input }) => ({ input, message: '', retryAt: 0 }),
  on: {
    update: [
      {
        guard: ({ context, event }) =>
          context.input.local?.seed !== event.input.local?.seed ||
          context.input.account !== event.input.account,
        target: '.ready',
        reenter: true,
        actions: ['reset', assign({ input: ({ event }) => event.input })],
      },
      { actions: assign({ input: ({ event }) => event.input }) },
    ],
    reload: { target: '.outdated', actions: 'reset' },
  },
  states: {
    ready: {
      always: { guard: 'shouldSync', target: 'debouncing' },
      on: {
        retry: { actions: assign({ remote: undefined }) },
        saveNow: { guard: 'canSave', target: 'working', actions: 'startCommand' },
      },
    },
    debouncing: {
      always: { guard: ({ context }) => context.input.paused, target: 'ready' },
      after: { 350: 'working' },
      on: {
        retry: { actions: assign({ remote: undefined }) },
        saveNow: { guard: 'canSave', target: 'working', actions: 'startCommand' },
      },
    },
    working: {
      invoke: {
        src: 'sync',
        input: ({ context }) => context,
        onDone: [
          {
            guard: ({ event }) => event.output?.status === 'conflict',
            target: 'conflict',
            actions: [
              ({ context }) =>
                context.command?.reject(new Error('Choose which tierlist to keep before sharing.')),
              assign({ command: undefined, conflict: ({ event }) => event.output?.remote }),
            ],
          },
          {
            target: 'ready',
            actions: [
              ({ context }) => context.command?.resolve(),
              assign({
                command: undefined,
                conflict: undefined,
                remote: ({ event }) => event.output?.remote,
              }),
            ],
          },
        ],
        onError: [
          {
            guard: ({ event }) => isOutdatedTierlistClient(event.error),
            target: 'outdated',
            actions: [({ context, event }) => context.command?.reject(event.error), 'reset'],
          },
          {
            guard: ({ event }) =>
              event.error instanceof TierlistSyncError && event.error.code === 'unauthorized',
            target: 'unauthorized',
            actions: [
              ({ context, event }) => context.command?.reject(event.error),
              assign({ message: ({ event }) => syncErrorMessage(event.error) }),
              assign({ command: undefined, conflict: undefined }),
            ],
          },
          {
            guard: ({ context }) => Boolean(context.conflict),
            target: 'conflict',
            actions: [
              ({ context, event }) => context.command?.reject(event.error),
              assign({ command: undefined }),
            ],
          },
          {
            target: 'offline',
            actions: [
              ({ context, event }) => {
                if (context.command) {
                  context.command.reject(event.error);
                } else {
                  markOffline();
                }
              },
              assign({ message: ({ event }) => syncErrorMessage(event.error) }),
              assign({ command: undefined, retryAt: () => Date.now() + 30_000 }),
            ],
          },
        ],
      },
    },
    offline: {
      initial: 'waiting',
      on: {
        retry: { target: 'ready', actions: assign({ remote: undefined }) },
        saveNow: { guard: 'canSave', target: 'working', actions: 'startCommand' },
      },
      states: {
        waiting: {
          always: { guard: ({ context }) => context.input.paused, target: 'paused' },
          after: {
            untilRetry: { target: '#tierlistSync.ready', actions: assign({ remote: undefined }) },
          },
        },
        paused: {
          always: { guard: ({ context }) => !context.input.paused, target: 'waiting' },
        },
      },
    },
    conflict: {
      always: {
        guard: ({ context }) => conflictResolved(context.input.local, context.conflict),
        target: 'ready',
        actions: 'reset',
      },
      on: {
        keepDevice: { target: 'working', actions: 'startCommand' },
        acceptOnline: { target: 'working', actions: 'startCommand' },
      },
    },
    unauthorized: {},
    outdated: {},
  },
  id: 'tierlistSync',
});
