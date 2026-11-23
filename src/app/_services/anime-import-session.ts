import type { ImportProvider } from '@/app/_lib/anime-import';
import type { AnimeImportCheckpoint } from '@/app/_lib/anime-import-checkpoint';
import type { AnimeImportProgress, generateAnimeTierlist } from './generate-anime-tierlist';

export type AnimeImportRequest = {
  seed: string;
  revision: number;
  provider: ImportProvider;
  username: string;
};

export type AnimeImportResult = Awaited<ReturnType<typeof generateAnimeTierlist>> & {
  expected: { seed: string; revision: number };
  ticket: string;
  provider: ImportProvider;
};

type ImportOutcome = 'generated' | 'failed' | 'cancelled';

type GenerateSessionInput = {
  signal: AbortSignal;
  onProgress: (progress: AnimeImportProgress) => void;
  onSavedProgress: () => void;
  renewSlot: (signal: AbortSignal) => Promise<void>;
};

export const createAnimeImportSession = async (
  request: AnimeImportRequest,
  signal: AbortSignal,
) => {
  const [{ readLocalTierlist }, checkpoints, { pollAnimeImportQueue }, { generateAnimeTierlist }] =
    await Promise.all([
      import('./local-tierlist'),
      import('./anime-import-checkpoint'),
      import('./anime-import-queue.actions'),
      import('./generate-anime-tierlist'),
    ]);
  signal.throwIfAborted();
  const [profile, savedCheckpoint] = await Promise.all([
    readLocalTierlist(request.seed),
    checkpoints.readAnimeImportCheckpoint(request.seed, request.provider),
  ]);
  signal.throwIfAborted();
  const ticket = crypto.randomUUID();
  const identity = { seed: request.seed, provider: request.provider, ticket };
  let checkpoint: AnimeImportCheckpoint | undefined = savedCheckpoint;
  let heartbeat = 0;
  let released = false;
  let finished = false;
  let pendingPoll: Promise<unknown> | undefined;

  const release = async (event?: ImportOutcome) => {
    const shouldRelease = !released;
    released = true;
    try {
      await pollAnimeImportQueue({ ...identity, release: shouldRelease, event });
    } catch {
      // Best-effort queue cleanup/metrics must not discard a completed result.
    }
  };

  const finish = async (outcome: ImportOutcome) => {
    if (finished) {
      return;
    }

    finished = true;
    // An uncancellable Server Function may still join after cancellation.
    // Release after its response, so cleanup cannot be overtaken by that join.
    await Promise.allSettled(pendingPoll ? [pendingPoll] : []);
    if (released) {
      void release(outcome);
    } else {
      await release(outcome);
    }
  };

  const pollSlot = async (pollSignal: AbortSignal) => {
    pollSignal.throwIfAborted();
    const task = pollAnimeImportQueue(identity);
    pendingPoll = task;
    const result = await task;
    pollSignal.throwIfAborted();
    if (!result.ok) {
      throw new Error(result.message);
    }

    heartbeat = Date.now();

    return result.value.position;
  };

  const generate = async ({
    signal,
    onProgress,
    onSavedProgress,
    renewSlot,
  }: GenerateSessionInput) => {
    const result = await generateAnimeTierlist({
      provider: request.provider,
      username: request.username,
      histories: profile.animeImports,
      history: profile.malImport,
      checkpoint,
      signal,
      onProgress,
      beforeRequest: async () => {
        signal.throwIfAborted();
        if (!released && Date.now() - heartbeat > 30_000) {
          await renewSlot(signal);
        }
      },
      onCatalogReady: () => release(),
      onCheckpoint: async (value) => {
        signal.throwIfAborted();
        await checkpoints.saveAnimeImportCheckpoint(request.seed, value);
        checkpoint = value;
        if (!signal.aborted) {
          onSavedProgress();
        }
      },
    });
    signal.throwIfAborted();
    await finish('generated');

    return {
      ...result,
      expected: { seed: request.seed, revision: request.revision },
      provider: request.provider,
      ticket,
    };
  };

  return { pollSlot, generate, finish };
};

export type AnimeImportSession = Awaited<ReturnType<typeof createAnimeImportSession>>;

export const applyAnimeImport = async (
  result: AnimeImportResult,
  apply: (result: AnimeImportResult) => Promise<void>,
) => {
  await apply(result);
  const [{ pollAnimeImportQueue }, { clearAnimeImportCheckpoint }] = await Promise.all([
    import('./anime-import-queue.actions'),
    import('./anime-import-checkpoint'),
  ]);
  const reportApplied = async () => {
    try {
      await pollAnimeImportQueue({
        seed: result.expected.seed,
        ticket: result.ticket,
        provider: result.provider,
        event: 'applied',
      });
    } catch {
      // Completion telemetry cannot invalidate a successful local apply.
    }
  };

  void reportApplied();
  try {
    await clearAnimeImportCheckpoint(result.expected.seed, result.provider);
  } catch {
    // Applying is already committed; an old checkpoint is safe to overwrite later.
  }
};
