import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { AnimeImportCheckpoint } from '@/app/_lib/anime-import-checkpoint';
import { runAnimeImport } from './run-anime-import';

const mocks = vi.hoisted(() => ({
  queue: vi.fn(),
  generate: vi.fn(),
  read: vi.fn(),
  save: vi.fn(),
}));
vi.mock('./anime-import-queue.actions', () => ({
  pollAnimeImportQueue: mocks.queue,
}));
vi.mock('./generate-anime-tierlist', () => ({
  generateAnimeTierlist: mocks.generate,
}));
vi.mock('./anime-import-checkpoint', () => ({
  readAnimeImportCheckpoint: mocks.read,
  saveAnimeImportCheckpoint: mocks.save,
}));

const input = () => ({
  seed: 'a'.repeat(64),
  username: 'Example',
  provider: 'mal' as const,
  signal: new AbortController().signal,
  onProgress: vi.fn(),
});

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
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  vi.resetAllMocks();
  mocks.queue.mockResolvedValue({ ok: true, value: { position: 1 } });
  mocks.read.mockResolvedValue(undefined);
});
afterEach(() => vi.useRealTimers());
it('starts immediately for one importer and releases its ticket', async () => {
  mocks.generate.mockResolvedValue('ready');
  await expect(runAnimeImport(input())).resolves.toBe('ready');
  expect(Date.now()).toBe(0);
  expect(mocks.queue).toHaveBeenLastCalledWith(
    expect.objectContaining({ release: true, event: 'generated' }),
  );
});
it('shows the real queue position and waits for its turn before requesting provider data', async () => {
  mocks.queue
    .mockResolvedValueOnce({ ok: true, value: { position: 3 } })
    .mockResolvedValueOnce({ ok: true, value: { position: 2 } });
  mocks.generate.mockResolvedValue('ready');
  const request = input();
  const task = runAnimeImport(request);
  await vi.advanceTimersByTimeAsync(0);
  expect(mocks.generate).not.toHaveBeenCalled();
  expect(request.onProgress).toHaveBeenCalledWith(
    expect.objectContaining({
      queuePosition: 3,
      detail: expect.stringContaining('Another MAL import'),
    }),
  );
  await vi.advanceTimersByTimeAsync(4000);
  expect(mocks.generate).not.toHaveBeenCalled();
  await vi.runAllTimersAsync();
  await task;
  expect(mocks.generate).toHaveBeenCalledOnce();
});
it('automatically retries transient errors with the saved checkpoint', async () => {
  mocks.generate
    .mockImplementationOnce(async ({ onCheckpoint }) => {
      await onCheckpoint(checkpoint);
      throw new Error('Catalog request timed out.');
    })
    .mockResolvedValueOnce('ready');
  const request = input();
  const task = runAnimeImport(request);
  await vi.runAllTimersAsync();
  await expect(task).resolves.toBe('ready');
  expect(mocks.save).toHaveBeenCalledWith(request.seed, checkpoint);
  expect(mocks.generate.mock.calls[1][0].checkpoint).toEqual(checkpoint);
  expect(request.onProgress).toHaveBeenCalledWith(
    expect.objectContaining({ phase: 'Retrying import' }),
  );
});
it('cancels while queued without starting provider calls and releases the ticket', async () => {
  mocks.queue.mockResolvedValue({ ok: true, value: { position: 2 } });
  const controller = new AbortController();
  const task = runAnimeImport({ ...input(), signal: controller.signal });
  const rejected = expect(task).rejects.toMatchObject({ name: 'AbortError' });
  await vi.advanceTimersByTimeAsync(0);
  controller.abort();
  await rejected;
  expect(mocks.generate).not.toHaveBeenCalled();
  expect(mocks.queue).toHaveBeenLastCalledWith(
    expect.objectContaining({ release: true, event: 'cancelled' }),
  );
  expect(vi.getTimerCount()).toBe(0);
});
it('does not retry a permanent profile error', async () => {
  mocks.generate.mockRejectedValue(
    new Error('MAL could not find that public list.'),
  );
  await expect(runAnimeImport(input())).rejects.toThrow('could not find');
  expect(mocks.generate).toHaveBeenCalledOnce();
  expect(mocks.queue).toHaveBeenLastCalledWith(
    expect.objectContaining({ release: true, event: 'failed' }),
  );
});

it('records generation after early slot release without rejoining the queue', async () => {
  mocks.generate.mockImplementationOnce(async ({ onCatalogReady }) => {
    await onCatalogReady();

    return 'ready';
  });
  await expect(runAnimeImport(input())).resolves.toBe('ready');
  expect(mocks.queue).toHaveBeenCalledTimes(3);
  expect(mocks.queue).toHaveBeenLastCalledWith(
    expect.objectContaining({ release: false, event: 'generated' }),
  );
});

it('does not lose a generated tierlist when metric delivery fails', async () => {
  mocks.generate.mockResolvedValue('ready');
  mocks.queue.mockResolvedValueOnce({ ok: true, value: { position: 1 } });
  mocks.queue.mockRejectedValueOnce(new Error('offline'));
  await expect(runAnimeImport(input())).resolves.toBe('ready');
});

it('returns the generated result without waiting for completion telemetry after release', async () => {
  mocks.generate.mockImplementationOnce(async ({ onCatalogReady }) => {
    await onCatalogReady();
    mocks.queue.mockReturnValueOnce(new Promise(() => {}));

    return 'ready';
  });
  await expect(runAnimeImport(input())).resolves.toBe('ready');
  expect(mocks.queue).toHaveBeenLastCalledWith(
    expect.objectContaining({ event: 'generated', release: false }),
  );
});
