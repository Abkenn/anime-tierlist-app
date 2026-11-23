import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type ActorRefFrom, createActor } from 'xstate';
import type { AnimeImportCheckpoint } from '@/app/_lib/anime-import-checkpoint';
import type { AnimeImportRequest } from '@/app/_services/anime-import-session';
import type { generateAnimeTierlist } from '@/app/_services/generate-anime-tierlist';
import { animeImportMachine } from './anime-import-machine';

const mocks = vi.hoisted(() => ({
  queue: vi.fn(),
  generate: vi.fn<typeof generateAnimeTierlist>(),
  readCheckpoint: vi.fn(),
  saveCheckpoint: vi.fn(),
  clearCheckpoint: vi.fn(),
}));

vi.mock('@/app/_services/anime-import-queue.actions', () => ({
  pollAnimeImportQueue: mocks.queue,
}));
vi.mock('@/app/_services/generate-anime-tierlist', () => ({
  generateAnimeTierlist: mocks.generate,
}));
vi.mock('@/app/_services/local-tierlist', () => ({ readLocalTierlist: vi.fn(async () => ({})) }));
vi.mock('@/app/_services/anime-import-checkpoint', () => ({
  readAnimeImportCheckpoint: mocks.readCheckpoint,
  saveAnimeImportCheckpoint: mocks.saveCheckpoint,
  clearAnimeImportCheckpoint: mocks.clearCheckpoint,
}));

const request: AnimeImportRequest = {
  seed: 'a'.repeat(64),
  revision: 7,
  username: 'Example',
  provider: 'mal',
};
const result: Awaited<ReturnType<typeof generateAnimeTierlist>> = {
  document: { version: 1, items: [], ranks: ['A'], imageMode: 'natural' },
  series: [],
  completed: 0,
  skipped: 0,
  unavailablePosters: 0,
};
const checkpoint: AnimeImportCheckpoint = {
  provider: 'mal',
  username: 'Example',
  importedAt: 0,
  catalog: [],
  posters: {},
  dimensions: {},
  entries: [],
  offset: 300,
  listComplete: false,
  complete: false,
};
const actors: ActorRefFrom<typeof animeImportMachine>[] = [];

const start = () => {
  const actor = createActor(animeImportMachine).start();
  actors.push(actor);
  actor.send({ type: 'GENERATE', request, busy: false });

  return actor;
};

const applyEvent = (hasItems = true) => ({
  type: 'APPLY' as const,
  hasItems,
  busy: false,
  apply: vi.fn(async () => {}),
  onApplied: vi.fn(),
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1000);
  vi.resetAllMocks();
  mocks.queue.mockResolvedValue({ ok: true, value: { position: 1 } });
  mocks.generate.mockResolvedValue(result);
});

afterEach(() => {
  actors.splice(0).forEach((actor) => {
    actor.stop();
  });
  vi.useRealTimers();
});

describe('anime import workflow', () => {
  it('starts without artificial delay and requires confirmation before replacing a populated board', async () => {
    const actor = start();
    await vi.waitFor(() => expect(actor.getSnapshot().matches('reviewing')).toBe(true));
    expect(mocks.queue).toHaveBeenLastCalledWith(
      expect.objectContaining({ release: true, event: 'generated' }),
    );
    const application = applyEvent();
    actor.send(application);
    expect(application.apply).not.toHaveBeenCalled();
    actor.send({ type: 'CONFIRM' });
    actor.send(application);
    await vi.waitFor(() => expect(actor.getSnapshot().matches('applied')).toBe(true));
    expect(application.apply).toHaveBeenCalledWith(
      expect.objectContaining({
        document: result.document,
        expected: { seed: request.seed, revision: 7 },
      }),
    );
    expect(application.onApplied).toHaveBeenCalledOnce();
    expect(mocks.clearCheckpoint).toHaveBeenCalledWith(request.seed, 'mal');
    actor.send(application);
    expect(application.apply).toHaveBeenCalledOnce();
  });

  it('waits four seconds between real queue positions without starting the generator', async () => {
    mocks.queue
      .mockResolvedValueOnce({ ok: true, value: { position: 3 } })
      .mockResolvedValueOnce({ ok: true, value: { position: 2 } });
    const actor = start();
    await vi.waitFor(() => expect(actor.getSnapshot().context.progress?.queuePosition).toBe(3));
    expect(mocks.generate).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(4000);
    expect(actor.getSnapshot().context.progress?.queuePosition).toBe(2);
    expect(mocks.generate).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(4000);
    await vi.waitFor(() => expect(actor.getSnapshot().matches('reviewing')).toBe(true));
    expect(mocks.generate).toHaveBeenCalledOnce();
  });

  it('retries twice with saved progress, then fails and releases the slot', async () => {
    mocks.generate.mockImplementation(async ({ onCheckpoint }) => {
      await onCheckpoint?.(checkpoint);
      throw new Error('Catalog request timed out.');
    });
    const actor = start();
    await vi.waitFor(() => expect(actor.getSnapshot().context.attempts).toBe(1));
    expect(actor.getSnapshot().context.retryDelay).toBe(3000);
    await vi.advanceTimersByTimeAsync(3000);
    expect(actor.getSnapshot().context.attempts).toBe(2);
    expect(actor.getSnapshot().context.retryDelay).toBe(6000);
    expect(mocks.generate.mock.calls[1][0].checkpoint).toEqual(checkpoint);
    expect(actor.getSnapshot().context.resumeAvailable).toBe(true);
    await vi.advanceTimersByTimeAsync(6000);
    expect(actor.getSnapshot().matches('failed')).toBe(true);
    expect(mocks.generate).toHaveBeenCalledTimes(3);
    await vi.waitFor(() =>
      expect(mocks.queue).toHaveBeenLastCalledWith(
        expect.objectContaining({ release: true, event: 'failed' }),
      ),
    );
  });

  it('uses the longer provider backoff and cancels its timer immediately', async () => {
    mocks.generate.mockRejectedValue(new Error('AniList is busy.'));
    const actor = start();
    await vi.waitFor(() => expect(actor.getSnapshot().context.retryDelay).toBe(60_000));
    actor.send({ type: 'CANCEL' });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(actor.getSnapshot().matches('cancelled')).toBe(true);
    expect(mocks.generate).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not retry permanent errors or apply partial results', async () => {
    mocks.generate.mockRejectedValue(new Error('MAL could not find that public list.'));
    const actor = start();
    await vi.waitFor(() => expect(actor.getSnapshot().matches('failed')).toBe(true));
    expect(mocks.generate).toHaveBeenCalledOnce();
    expect(actor.getSnapshot().context.result).toBeNull();
    expect(actor.getSnapshot().context.error).toContain('could not find');
  });

  it('cancels while queued and releases the ticket without starting provider calls', async () => {
    mocks.queue.mockResolvedValue({ ok: true, value: { position: 2 } });
    const actor = start();
    await vi.waitFor(() => expect(actor.getSnapshot().context.progress?.queuePosition).toBe(2));
    actor.send({ type: 'CANCEL' });
    await vi.waitFor(() =>
      expect(mocks.queue).toHaveBeenLastCalledWith(
        expect.objectContaining({ release: true, event: 'cancelled' }),
      ),
    );
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('aborts generation and ignores late completion/progress after a new request starts', async () => {
    const pending = Promise.withResolvers<typeof result>();
    mocks.generate.mockImplementationOnce(() => pending.promise);
    const actor = start();
    await vi.waitFor(() => expect(mocks.generate).toHaveBeenCalledOnce());
    const oldInput = mocks.generate.mock.calls[0][0];
    actor.send({ type: 'CANCEL' });
    expect(oldInput.signal.aborted).toBe(true);
    actor.send({ type: 'GENERATE', request: { ...request, provider: 'anilist' }, busy: false });
    await vi.waitFor(() => expect(actor.getSnapshot().matches('reviewing')).toBe(true));
    pending.resolve(result);
    oldInput.onProgress({ phase: 'Loading posters', percent: 99 });
    await vi.advanceTimersByTimeAsync(0);
    expect(actor.getSnapshot().context.result?.provider).toBe('anilist');
    expect(actor.getSnapshot().context.progress).toBeNull();
  });

  it('aborts and releases the queue ticket when its mounted owner stops', async () => {
    mocks.generate.mockReturnValue(new Promise(() => {}));
    const actor = start();
    await vi.waitFor(() => expect(mocks.generate).toHaveBeenCalledOnce());
    actor.stop();
    expect(mocks.generate.mock.calls[0][0].signal.aborted).toBe(true);
    await vi.waitFor(() =>
      expect(mocks.queue).toHaveBeenLastCalledWith(
        expect.objectContaining({ release: true, event: 'cancelled' }),
      ),
    );
  });

  it('renews an expired slot through the machine while retaining the same generation', async () => {
    mocks.generate.mockImplementationOnce(async ({ beforeRequest, onProgress }) => {
      onProgress({ phase: 'Checking seasons', percent: 42 });
      vi.setSystemTime(32_001);
      await beforeRequest?.();

      return result;
    });
    mocks.queue
      .mockResolvedValueOnce({ ok: true, value: { position: 1 } })
      .mockResolvedValueOnce({ ok: true, value: { position: 2 } });
    const actor = start();
    await vi.waitFor(() =>
      expect(
        actor.getSnapshot().matches({ importing: { running: { generating: 'waitingToRenew' } } }),
      ).toBe(true),
    );
    expect(actor.getSnapshot().context.progress?.queuePosition).toBe(2);
    await vi.advanceTimersByTimeAsync(4000);
    await vi.waitFor(() => expect(actor.getSnapshot().matches('reviewing')).toBe(true));
    expect(mocks.generate).toHaveBeenCalledOnce();
    expect(mocks.queue).toHaveBeenCalledTimes(4);
  });

  it('releases after an in-flight queue join finishes, even if cancelled first', async () => {
    const pending = Promise.withResolvers<{ ok: true; value: { position: number } }>();
    mocks.queue.mockReturnValueOnce(pending.promise);
    const actor = start();
    await vi.waitFor(() => expect(mocks.queue).toHaveBeenCalledOnce());
    actor.send({ type: 'CANCEL' });
    expect(mocks.queue).toHaveBeenCalledOnce();
    pending.resolve({ ok: true, value: { position: 1 } });
    await vi.waitFor(() =>
      expect(mocks.queue).toHaveBeenLastCalledWith(
        expect.objectContaining({ release: true, event: 'cancelled' }),
      ),
    );
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(actor.getSnapshot().matches('cancelled')).toBe(true);
  });

  it('releases before poster downloads and does not wait for completion metrics afterward', async () => {
    mocks.generate.mockImplementationOnce(async ({ onCatalogReady }) => {
      await onCatalogReady?.();
      mocks.queue.mockReturnValueOnce(new Promise(() => {}));

      return result;
    });
    const actor = start();
    await vi.waitFor(() => expect(actor.getSnapshot().matches('reviewing')).toBe(true));
    expect(mocks.queue).toHaveBeenLastCalledWith(
      expect.objectContaining({ release: false, event: 'generated' }),
    );
  });

  it('keeps the reviewed result after an atomic apply rejects a stale destination', async () => {
    const actor = start();
    await vi.waitFor(() => expect(actor.getSnapshot().matches('reviewing')).toBe(true));
    const application = applyEvent(false);
    application.apply.mockRejectedValueOnce(new Error('Your tierlist changed.'));
    actor.send(application);
    await vi.waitFor(() =>
      expect(actor.getSnapshot().context.applyError).toContain('tierlist changed'),
    );
    expect(actor.getSnapshot().matches({ reviewing: 'unconfirmed' })).toBe(true);
    expect(actor.getSnapshot().context.result?.document).toEqual(result.document);
    expect(mocks.clearCheckpoint).not.toHaveBeenCalled();
    expect(application.onApplied).not.toHaveBeenCalled();
  });

  it('rejects duplicate starts, resets and apply attempts during generation', async () => {
    mocks.generate.mockReturnValue(new Promise(() => {}));
    const actor = start();
    await vi.waitFor(() => expect(mocks.generate).toHaveBeenCalledOnce());
    actor.send({ type: 'GENERATE', request, busy: false });
    actor.send({ type: 'RESET' });
    const application = applyEvent(false);
    actor.send(application);
    expect(actor.getSnapshot().hasTag('generating')).toBe(true);
    expect(mocks.generate).toHaveBeenCalledOnce();
    expect(application.apply).not.toHaveBeenCalled();
  });

  it('validates usernames before creating a session and respects an externally busy board', async () => {
    const actor = createActor(animeImportMachine).start();
    actors.push(actor);
    actor.send({ type: 'GENERATE', request: { ...request, username: '?' }, busy: false });
    expect(actor.getSnapshot().context.error).toContain('valid MAL username');
    actor.send({ type: 'GENERATE', request, busy: true });
    await vi.advanceTimersByTimeAsync(0);
    expect(actor.getSnapshot().matches('idle')).toBe(true);
    expect(mocks.queue).not.toHaveBeenCalled();
  });
});
