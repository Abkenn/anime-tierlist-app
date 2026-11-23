import { assign, fromCallback, fromPromise, setup } from 'xstate';
import { anilistUsernameSchema } from '@/app/_lib/anilist-import';
import { isError } from '@/app/_lib/is-error';
import { malUsernameSchema } from '@/app/_lib/mal-import';
import { tierlistErrorMessage } from '@/app/_lib/tierlist-error';
import {
  type AnimeImportRequest,
  type AnimeImportResult,
  type AnimeImportSession,
  applyAnimeImport,
  createAnimeImportSession,
} from '@/app/_services/anime-import-session';
import type { AnimeImportProgress } from '@/app/_services/generate-anime-tierlist';

type ApplyRequest = {
  apply: (result: AnimeImportResult) => Promise<void>;
  onApplied: () => void;
};

type ImportContext = {
  request: AnimeImportRequest | null;
  session: AnimeImportSession | null;
  result: AnimeImportResult | null;
  progress: AnimeImportProgress | null;
  generationProgress: AnimeImportProgress | null;
  resumeAvailable: boolean;
  attempts: number;
  retryDelay: number;
  error: string;
  applyError: string;
  application: ApplyRequest | null;
  slotReady: (() => void) | null;
};

type ImportEvent =
  | { type: 'GENERATE'; request: AnimeImportRequest; busy: boolean }
  | { type: 'RESET' }
  | { type: 'CANCEL' }
  | { type: 'PROGRESS'; progress: AnimeImportProgress }
  | { type: 'CHECKPOINT_SAVED' }
  | { type: 'RESUME_AVAILABLE'; available: boolean }
  | { type: 'RENEW_SLOT'; ready: () => void }
  | { type: 'CONFIRM' }
  | { type: 'UNCONFIRM' }
  | ({ type: 'APPLY'; hasItems: boolean; busy: boolean } & ApplyRequest);

const required = <T>(value: T | null): T => {
  if (value === null) {
    throw new Error('Import operation is not ready.');
  }

  return value;
};

const transientImportError = (error: unknown) =>
  isError(error) &&
  /rate limit|timed out|temporarily|busy|Unable to load|Catalog request failed \(5\d\d\)/iu.test(
    error.message,
  );

const requestSlot = (signal: AbortSignal, send: (ready: () => void) => void) =>
  new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => reject(signal.reason);

    signal.addEventListener('abort', abort, { once: true });
    send(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    });
  });

export const animeImportMachine = setup({
  types: {
    context: {} as ImportContext,
    events: {} as ImportEvent,
  },
  actors: {
    prepare: fromPromise(({ input, signal }: { input: AnimeImportRequest; signal: AbortSignal }) =>
      createAnimeImportSession(input, signal),
    ),
    leaseCleanup: fromCallback<{ type: 'unused' }, AnimeImportSession>(
      ({ input }) =>
        () =>
          void input.finish('cancelled'),
    ),
    pollSlot: fromPromise(({ input, signal }: { input: AnimeImportSession; signal: AbortSignal }) =>
      input.pollSlot(signal),
    ),
    generate: fromPromise(
      ({
        input,
        signal,
      }: {
        input: {
          session: AnimeImportSession;
          publish: (event: ImportEvent) => void;
        };
        signal: AbortSignal;
      }) =>
        input.session.generate({
          signal,
          onProgress: (progress) => {
            if (!signal.aborted) {
              input.publish({ type: 'PROGRESS', progress });
            }
          },
          onSavedProgress: () => input.publish({ type: 'CHECKPOINT_SAVED' }),
          renewSlot: (signal) =>
            requestSlot(signal, (ready) => input.publish({ type: 'RENEW_SLOT', ready })),
        }),
    ),
    apply: fromPromise(
      async ({
        input,
        signal,
      }: {
        input: { result: AnimeImportResult; application: ApplyRequest };
        signal: AbortSignal;
      }) => {
        await applyAnimeImport(input.result, input.application.apply);
        signal.throwIfAborted();
      },
    ),
  },
  delays: {
    queuePoll: 4000,
    retry: ({ context }) => context.retryDelay,
  },
  actions: {
    queued: assign({
      progress: ({ context }, params: { position: number }) => ({
        phase: 'Waiting for import slot' as const,
        percent: null,
        queuePosition: params.position,
        detail: `Another ${context.request?.provider === 'mal' ? 'MAL' : 'AniList'} import is running. Yours will start automatically.`,
      }),
    }),
    fail: assign(({ context }, params: { error: unknown }) => {
      void context.session?.finish('failed');

      return {
        error: tierlistErrorMessage(params.error, 'Unable to generate this tierlist. Try again.'),
        progress: null,
      };
    }),
    retryLater: assign(({ context }, params: { error: unknown }) => {
      const attempts = context.attempts + 1;
      const seconds =
        isError(params.error) && /rate limit|AniList is busy/iu.test(params.error.message)
          ? 60
          : attempts * 3;

      return {
        attempts,
        retryDelay: seconds * 1000,
        progress: {
          phase: 'Retrying import' as const,
          percent: null,
          detail: `Provider temporarily unavailable. Retrying in ${seconds}s (${attempts}/2); completed lookups are saved.`,
        },
      };
    }),
    startApply: assign(({ event }) =>
      event.type === 'APPLY'
        ? { application: { apply: event.apply, onApplied: event.onApplied }, applyError: '' }
        : {},
    ),
  },
}).createMachine({
  id: 'animeImport',
  initial: 'idle',
  context: {
    request: null,
    session: null,
    result: null,
    progress: null,
    generationProgress: null,
    resumeAvailable: false,
    attempts: 0,
    retryDelay: 0,
    error: '',
    applyError: '',
    application: null,
    slotReady: null,
  },
  on: {
    GENERATE: [
      {
        guard: ({ event }) =>
          !event.busy &&
          (event.request.provider === 'mal' ? malUsernameSchema : anilistUsernameSchema).safeParse(
            event.request.username,
          ).success,
        target: '.importing',
        actions: assign(({ event }) => ({
          request: event.request,
          session: null,
          result: null,
          progress: null,
          generationProgress: null,
          attempts: 0,
          error: '',
          applyError: '',
          slotReady: null,
        })),
      },
      {
        guard: ({ event }) => !event.busy,
        actions: assign(({ event }) => ({
          request: event.request,
          error: `Enter a valid ${event.request.provider === 'mal' ? 'MAL' : 'AniList'} username (2–${event.request.provider === 'mal' ? 16 : 20} letters, numbers, underscores or hyphens).`,
        })),
      },
    ],
    RESET: {
      target: '.idle',
      actions: assign({ result: null, error: '', applyError: '', progress: null }),
    },
    RESUME_AVAILABLE: {
      actions: assign({ resumeAvailable: ({ event }) => event.available }),
    },
  },
  states: {
    idle: {},
    importing: {
      tags: ['generating'],
      initial: 'preparing',
      on: {
        GENERATE: {},
        RESET: {},
        RESUME_AVAILABLE: {},
        CANCEL: {
          target: 'cancelled',
          actions: ({ context }) => void context.session?.finish('cancelled'),
        },
        PROGRESS: {
          actions: assign(({ event }) => ({
            progress: event.progress,
            generationProgress: event.progress,
          })),
        },
        CHECKPOINT_SAVED: { actions: assign({ resumeAvailable: true }) },
      },
      states: {
        preparing: {
          invoke: {
            src: 'prepare',
            input: ({ context }) => required(context.request),
            onDone: {
              target: 'running',
              actions: assign({ session: ({ event }) => event.output }),
            },
            onError: {
              target: '#failed',
              actions: { type: 'fail', params: ({ event }) => ({ error: event.error }) },
            },
          },
        },
        running: {
          initial: 'checkingSlot',
          invoke: { src: 'leaseCleanup', input: ({ context }) => required(context.session) },
          states: {
            checkingSlot: {
              invoke: {
                src: 'pollSlot',
                input: ({ context }) => required(context.session),
                onDone: [
                  { guard: ({ event }) => event.output === 1, target: 'generating' },
                  {
                    target: 'waitingForSlot',
                    actions: {
                      type: 'queued',
                      params: ({ event }) => ({ position: event.output }),
                    },
                  },
                ],
                onError: {
                  target: '#failed',
                  actions: { type: 'fail', params: ({ event }) => ({ error: event.error }) },
                },
              },
            },
            waitingForSlot: { after: { queuePoll: 'checkingSlot' } },
            generating: {
              initial: 'holdingSlot',
              invoke: {
                src: 'generate',
                input: ({ context, self }) => ({
                  session: required(context.session),
                  publish: self.send,
                }),
                onDone: {
                  target: '#reviewing',
                  actions: assign({ result: ({ event }) => event.output, progress: null }),
                },
                onError: [
                  {
                    guard: ({ context, event }) =>
                      context.attempts < 2 && transientImportError(event.error),
                    target: 'retrying',
                    actions: {
                      type: 'retryLater',
                      params: ({ event }) => ({ error: event.error }),
                    },
                  },
                  {
                    target: '#failed',
                    actions: { type: 'fail', params: ({ event }) => ({ error: event.error }) },
                  },
                ],
              },
              states: {
                holdingSlot: {
                  on: {
                    RENEW_SLOT: {
                      target: 'renewingSlot',
                      actions: assign({ slotReady: ({ event }) => event.ready }),
                    },
                  },
                },
                renewingSlot: {
                  invoke: {
                    src: 'pollSlot',
                    input: ({ context }) => required(context.session),
                    onDone: [
                      {
                        guard: ({ event }) => event.output === 1,
                        target: 'holdingSlot',
                        actions: [
                          ({ context }) => context.slotReady?.(),
                          assign({
                            slotReady: null,
                            progress: ({ context }) => context.generationProgress,
                          }),
                        ],
                      },
                      {
                        target: 'waitingToRenew',
                        actions: {
                          type: 'queued',
                          params: ({ event }) => ({ position: event.output }),
                        },
                      },
                    ],
                    onError: {
                      target: '#failed',
                      actions: { type: 'fail', params: ({ event }) => ({ error: event.error }) },
                    },
                  },
                },
                waitingToRenew: { after: { queuePoll: 'renewingSlot' } },
              },
            },
            retrying: { after: { retry: 'generating' } },
          },
        },
      },
    },
    cancelled: {
      entry: assign({ error: 'Generation cancelled. Your tierlist is unchanged.', progress: null }),
    },
    failed: { id: 'failed' },
    reviewing: {
      id: 'reviewing',
      initial: 'unconfirmed',
      on: {
        APPLY: {
          guard: ({ event }) => !event.busy && !event.hasItems,
          target: 'applying',
          actions: 'startApply',
        },
      },
      states: {
        unconfirmed: { on: { CONFIRM: 'confirmed' } },
        confirmed: {
          on: {
            UNCONFIRM: 'unconfirmed',
            APPLY: {
              guard: ({ event }) => !event.busy,
              target: '#animeImport.applying',
              actions: 'startApply',
            },
          },
        },
      },
    },
    applying: {
      tags: ['applying'],
      on: { GENERATE: {}, RESET: {} },
      invoke: {
        src: 'apply',
        input: ({ context }) => ({
          result: required(context.result),
          application: required(context.application),
        }),
        onDone: {
          target: 'applied',
          actions: [
            assign({ resumeAvailable: false }),
            ({ context }) => context.application?.onApplied(),
          ],
        },
        onError: {
          target: 'reviewing',
          actions: assign({
            applyError: ({ event }) =>
              tierlistErrorMessage(
                event.error,
                'Your tierlist changed. Generate again before applying.',
              ),
          }),
        },
      },
    },
    applied: {},
  },
});
