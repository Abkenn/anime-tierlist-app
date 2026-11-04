import type { AnimeImportCheckpoint } from '@/app/_lib/anime-import-checkpoint';
import { isError } from '@/app/_lib/is-error';
import {
  readAnimeImportCheckpoint,
  saveAnimeImportCheckpoint,
} from './anime-import-checkpoint';
import { pollAnimeImportQueue } from './anime-import-queue.actions';
import { generateAnimeTierlist } from './generate-anime-tierlist';
import { waitForImport } from './import-wait';

type RunImportInput = Parameters<typeof generateAnimeTierlist>[0] & {
  seed: string;
  onSavedProgress?: () => void;
};

export const runAnimeImport = async ({
  seed,
  onSavedProgress,
  ...input
}: RunImportInput) => {
  const provider = input.provider ?? 'mal';
  const label = provider === 'mal' ? 'MAL' : 'AniList';
  const ticket = crypto.randomUUID();
  let checkpoint: AnimeImportCheckpoint | undefined =
    await readAnimeImportCheckpoint(seed, provider);
  let heartbeat = 0;
  let released = false;
  const queue = async () => {
    while (true) {
      input.signal.throwIfAborted();
      const status = await pollAnimeImportQueue({ seed, ticket, provider });
      if (!status.ok) {
        throw new Error(status.message);
      }
      heartbeat = Date.now();
      if (status.value.position === 1) {
        return;
      }
      input.onProgress({
        phase: 'Waiting for import slot',
        percent: null,
        queuePosition: status.value.position,
        detail: `Another ${label} import is running. Yours will start automatically.`,
      });
      await waitForImport(4000, input.signal);
    }
  };
  const release = async () => {
    if (released) {
      return;
    }
    released = true;
    await pollAnimeImportQueue({ seed, ticket, provider, release: true }).catch(
      () => {},
    );
  };
  try {
    await queue();
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await generateAnimeTierlist({
          ...input,
          provider,
          checkpoint,
          beforeRequest: async () => {
            if (Date.now() - heartbeat > 30_000) {
              await queue();
            }
          },
          onCatalogReady: release,
          onCheckpoint: async (value) => {
            checkpoint = value;
            await saveAnimeImportCheckpoint(seed, value);
            onSavedProgress?.();
          },
        });
      } catch (error) {
        input.signal.throwIfAborted();
        const transient =
          isError(error) &&
          /rate limit|timed out|temporarily|busy|Unable to load|Catalog request failed \(5\d\d\)/iu.test(
            error.message,
          );
        if (attempt >= 2 || !transient) {
          throw error;
        }
        const seconds = /rate limit|AniList is busy/iu.test(error.message)
          ? 60
          : (attempt + 1) * 3;
        input.onProgress({
          phase: 'Retrying import',
          percent: null,
          detail: `Provider temporarily unavailable. Retrying in ${seconds}s (${attempt + 1}/2); completed lookups are saved.`,
        });
        await waitForImport(seconds * 1000, input.signal);
      }
    }
  } finally {
    await release();
  }
};
