import { assign, fromPromise, setup } from 'xstate';
import { isError } from './is-error';

type PreviewTask = () => Promise<string | null>;
type ShareEvent =
  | { type: 'lookup'; revision: number; task: PreviewTask }
  | { type: 'generate'; task: PreviewTask }
  | { type: 'close' }
  | { type: 'arrived' };

const previewError = (error: unknown) =>
  isError(error) ? error.message : 'Unable to prepare sharing.';

export const sharePreviewMachine = setup({
  types: {
    context: {} as { revision?: number; url: string; error: string; task: PreviewTask },
    events: {} as ShareEvent,
  },
  actors: {
    prepare: fromPromise<string | null, PreviewTask>(({ input }) => input()),
  },
  actions: {
    openPreview: (_args, _url: string) => {},
  },
}).createMachine({
  initial: 'idle',
  context: { url: '', error: '', task: async () => null },
  on: {
    close: { target: '.idle', actions: assign({ error: '' }) },
    lookup: {
      guard: ({ context, event }) => context.revision !== event.revision || !context.url,
      target: '.lookingUp',
      reenter: true,
      actions: assign(({ event }) => ({
        revision: event.revision,
        task: event.task,
        url: '',
        error: '',
      })),
    },
  },
  states: {
    idle: {
      on: {
        generate: {
          target: 'generating',
          actions: assign({ task: ({ event }) => event.task, error: '' }),
        },
      },
    },
    lookingUp: {
      invoke: {
        src: 'prepare',
        input: ({ context }) => context.task,
        onDone: { target: 'idle', actions: assign({ url: ({ event }) => event.output ?? '' }) },
        onError: {
          target: 'idle',
          actions: assign({ error: ({ event }) => previewError(event.error) }),
        },
      },
      on: {
        generate: {
          target: 'generating',
          actions: assign({ task: ({ event }) => event.task, error: '' }),
        },
      },
    },
    generating: {
      invoke: {
        src: 'prepare',
        input: ({ context }) => context.task,
        onDone: [
          {
            guard: ({ event }) => Boolean(event.output),
            target: 'opening',
            actions: [
              assign({ url: ({ event }) => event.output ?? '' }),
              { type: 'openPreview', params: ({ event }) => event.output ?? '' },
            ],
          },
          { target: 'idle' },
        ],
        onError: {
          target: 'idle',
          actions: assign({ error: ({ event }) => previewError(event.error) }),
        },
      },
    },
    opening: { on: { arrived: 'idle' } },
  },
});
