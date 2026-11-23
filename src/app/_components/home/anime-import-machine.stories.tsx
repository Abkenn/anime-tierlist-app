import { createBrowserInspector } from '@statelyai/inspect';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useMachine } from '@xstate/react';
import { useEffect, useRef, useState } from 'react';
import { expect, waitFor } from 'storybook/test';
import { fromPromise, SimulatedClock } from 'xstate';
import { animeImportMachine } from '@/app/_lib/anime-import-machine';
import type { AnimeImportResult, AnimeImportSession } from '@/app/_services/anime-import-session';

type Inspector = ReturnType<typeof createBrowserInspector>;

type GenerationControls = {
  complete: () => void;
  fail: (message: string) => void;
  renew: () => Promise<void>;
};

const buttonClass =
  'min-h-9 cursor-pointer border border-divider px-3 hover:bg-accent disabled:opacity-40';
const demoResult: AnimeImportResult = {
  document: { version: 1, items: [], ranks: ['A'], imageMode: 'natural' },
  series: [],
  completed: 0,
  skipped: 0,
  unavailablePosters: 0,
  expected: { seed: 'visualizer-only', revision: 7 },
  ticket: 'visualizer-only',
  provider: 'mal',
};

const ImportSimulation = ({ inspect }: Pick<Inspector, 'inspect'>) => {
  const generation = useRef<GenerationControls | null>(null);
  const queuePosition = useRef(1);
  const [waiting, setWaiting] = useState(false);
  const [clock] = useState(() => new SimulatedClock());
  const [logic] = useState(() =>
    animeImportMachine.provide({
      actors: {
        prepare: fromPromise(
          async (): Promise<AnimeImportSession> => ({
            pollSlot: async () => queuePosition.current,
            finish: async () => {},
            generate: async ({ signal, onProgress, onSavedProgress, renewSlot }) => {
              const pending = Promise.withResolvers<AnimeImportResult>();
              const abort = () => pending.reject(signal.reason);

              signal.addEventListener('abort', abort, { once: true });
              onProgress({ phase: 'Checking seasons', percent: 42 });
              onSavedProgress();
              generation.current = {
                complete: () => pending.resolve(demoResult),
                fail: (message) => pending.reject(new Error(message)),
                renew: () => renewSlot(signal),
              };
              try {
                return await pending.promise;
              } finally {
                signal.removeEventListener('abort', abort);
                generation.current = null;
              }
            },
          }),
        ),
        // This sandbox never invokes the storage or server implementations.
        apply: fromPromise(async () => {}),
      },
    }),
  );
  const [state, send] = useMachine(logic, {
    inspect,
    clock,
    id: 'anime-import-demo',
  });
  const generating = state.hasTag('generating');
  const reviewing = state.matches('reviewing');
  const holdingSlot = state.matches({ importing: { running: { generating: 'holdingSlot' } } });

  const renew = async () => {
    try {
      await generation.current?.renew();
    } catch {
      // Cancelling a simulated renewal rejects its pending request normally.
    }
  };

  return (
    <div className="space-y-3 p-4 text-xs">
      <h1 className="text-lg">Anime import state machine</h1>
      <p>Same import machine, simulated I/O. No tierlist, provider or database writes.</p>

      <p role="status" aria-label="Current machine state" className="font-medium">
        State: {JSON.stringify(state.value)}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={buttonClass}
          disabled={generating || state.hasTag('applying')}
          onClick={() =>
            send({
              type: 'GENERATE',
              busy: false,
              request: {
                seed: 'visualizer-only',
                revision: 7,
                provider: 'mal',
                username: 'Example',
              },
            })
          }
        >
          Start import
        </button>

        <button
          type="button"
          className={buttonClass}
          disabled={!generating}
          onClick={() => send({ type: 'CANCEL' })}
        >
          Cancel
        </button>

        <label className="flex min-h-9 items-center gap-2">
          <input
            type="checkbox"
            checked={waiting}
            onChange={(event) => {
              setWaiting(event.currentTarget.checked);
              queuePosition.current = event.currentTarget.checked ? 2 : 1;
            }}
          />
          Queue occupied
        </label>

        <button type="button" className={buttonClass} onClick={() => clock.increment(4000)}>
          Advance 4s
        </button>

        <button type="button" className={buttonClass} onClick={() => clock.increment(60_000)}>
          Advance 60s
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          disabled={!holdingSlot}
          onClick={() => generation.current?.complete()}
        >
          Provider succeeds
        </button>

        <button
          type="button"
          className={buttonClass}
          disabled={!holdingSlot}
          onClick={() => generation.current?.fail('Catalog request timed out.')}
        >
          Transient failure
        </button>

        <button
          type="button"
          className={buttonClass}
          disabled={!holdingSlot}
          onClick={() => generation.current?.fail('MAL could not find that public list.')}
        >
          Permanent failure
        </button>

        <button
          type="button"
          className={buttonClass}
          disabled={!holdingSlot}
          onClick={() => void renew()}
        >
          Renew queue lease
        </button>

        <button
          type="button"
          className={buttonClass}
          disabled={!reviewing}
          onClick={() => send({ type: 'CONFIRM' })}
        >
          Confirm replacement
        </button>

        <button
          type="button"
          className={buttonClass}
          disabled={!reviewing}
          onClick={() =>
            send({
              type: 'APPLY',
              busy: false,
              hasItems: true,
              apply: async () => {},
              onApplied: () => {},
            })
          }
        >
          Apply result
        </button>

        <button
          type="button"
          className={buttonClass}
          disabled={generating || state.hasTag('applying')}
          onClick={() => send({ type: 'RESET' })}
        >
          Reset
        </button>
      </div>

      {state.context.progress && (
        <p>
          {state.context.progress.phase}:{' '}
          {state.context.progress.detail ?? `${state.context.progress.percent ?? '—'}%`}
        </p>
      )}

      {(state.context.error || state.context.applyError) && (
        <p>{state.context.error || state.context.applyError}</p>
      )}
    </div>
  );
};

const ImportMachineVisualizer = () => {
  const frame = useRef<HTMLIFrameElement>(null);
  const [inspector, setInspector] = useState<Inspector>();

  useEffect(() => {
    if (!frame.current) {
      return;
    }

    const connection = createBrowserInspector({
      iframe: frame.current,
      url: 'http://127.0.0.1:6106/inspect',
      // The default depth truncates transitions inside the nested lease states.
      serializationDepthLimit: 32,
    });
    setInspector(connection);

    return () => connection.stop();
  }, []);

  return (
    <>
      {inspector && <ImportSimulation inspect={inspector.inspect} />}

      <p className="px-4 text-xs">The live graph connects to Stately Sketch on port 6106.</p>

      <iframe
        ref={frame}
        title="Stately Sketch import machine inspector"
        className="h-[70dvh] w-full border border-divider"
      />
    </>
  );
};

const meta = {
  title: 'Development/Anime import machine',
  component: ImportMachineVisualizer,
  parameters: { layout: 'fullscreen' },
  tags: ['!autodocs'],
} satisfies Meta<typeof ImportMachineVisualizer>;

export default meta;

export const Visualizer: StoryObj<typeof meta> = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Start import' }));
    await waitFor(() =>
      expect(canvas.getByRole('status', { name: 'Current machine state' })).toHaveTextContent(
        'holdingSlot',
      ),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Transient failure' }));
    await waitFor(() =>
      expect(canvas.getByRole('status', { name: 'Current machine state' })).toHaveTextContent(
        'retrying',
      ),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Advance 4s' }));
    await waitFor(() =>
      expect(canvas.getByRole('status', { name: 'Current machine state' })).toHaveTextContent(
        'holdingSlot',
      ),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Provider succeeds' }));
    await waitFor(() =>
      expect(canvas.getByRole('status', { name: 'Current machine state' })).toHaveTextContent(
        'unconfirmed',
      ),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Confirm replacement' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Apply result' }));
    await waitFor(() =>
      expect(canvas.getByRole('status', { name: 'Current machine state' })).toHaveTextContent(
        'applied',
      ),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Reset' }));
  },
};
