import { createStore, del, get, set } from 'idb-keyval';
import type { ImportProvider } from '@/app/_lib/anime-import';
import {
  type AnimeImportCheckpoint,
  animeImportCheckpointSchema,
} from '@/app/_lib/anime-import-checkpoint';

const storage = createStore('anime-imports', 'checkpoints');

const key = (seed: string, provider: ImportProvider) => `${seed}:${provider}`;

export const readAnimeImportCheckpoint = async (
  seed: string,
  provider: ImportProvider,
) => {
  const parsed = animeImportCheckpointSchema.safeParse(
    await get<unknown>(key(seed, provider), storage),
  );
  return parsed.success && parsed.data.importedAt > Date.now() - 86_400_000
    ? parsed.data
    : undefined;
};

export const saveAnimeImportCheckpoint = (
  seed: string,
  checkpoint: AnimeImportCheckpoint,
) => set(key(seed, checkpoint.provider), checkpoint, storage);

export const clearAnimeImportCheckpoint = (
  seed: string,
  provider: ImportProvider,
) => del(key(seed, provider), storage);
