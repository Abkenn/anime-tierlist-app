import ky from 'ky';
import {
  eligibleImportEntry,
  groupImportSeries,
  type ImportAnime,
  type ImportListEntry,
  type ImportProvider,
  importSeriesDocument,
} from '@/app/_lib/anime-import';
import type { AnimeImportCheckpoint } from '@/app/_lib/anime-import-checkpoint';
import type { AnimeImportHistory } from '@/app/_lib/anime-import-history';
import type { TierlistDocument } from '@/app/_lib/tierlist-sync';
import { animeImportProviders } from './anime-import-providers';

type GenerateAnimeInput = {
  username: string;
  provider?: ImportProvider;
  histories?: TierlistDocument['animeImports'];
  history?: AnimeImportHistory;
  checkpoint?: AnimeImportCheckpoint;
  onCheckpoint?: (checkpoint: AnimeImportCheckpoint) => Promise<void>;
  beforeRequest?: () => Promise<void>;
  onCatalogReady?: () => Promise<void>;
  signal: AbortSignal;
  onProgress: (progress: AnimeImportProgress) => void;
};
export type AnimeImportProgress = {
  phase:
    | 'Waiting for import slot'
    | 'Retrying import'
    | 'Reading list'
    | 'Checking seasons'
    | 'Finding posters'
    | 'Loading posters';
  percent: number | null;
  queuePosition?: number;
  detail?: string;
};

export const generateAnimeTierlist = async ({
  username,
  provider = 'mal',
  history,
  histories,
  checkpoint: savedCheckpoint,
  onCheckpoint,
  beforeRequest,
  onCatalogReady,
  signal,
  onProgress,
}: GenerateAnimeInput) => {
  const adapter = animeImportProviders[provider];
  const name = adapter.parseUsername(username);
  const saved =
    histories?.[provider] ?? (provider === 'mal' ? history : undefined);
  const previous =
    saved?.username.toLowerCase() === name.toLowerCase() ? saved : undefined;
  const checkpoint =
    savedCheckpoint?.provider === provider &&
    savedCheckpoint.username.toLowerCase() === name.toLowerCase()
      ? savedCheckpoint
      : undefined;
  const resuming =
    checkpoint && !checkpoint.complete && checkpoint.scope === 'statuses-v2';
  const request = async <T>(operation: () => Promise<T>) => {
    signal.throwIfAborted();
    await beforeRequest?.();
    signal.throwIfAborted();
    const result = await operation();
    signal.throwIfAborted();
    return result;
  };
  const entries: ImportListEntry[] = resuming ? [...checkpoint.entries] : [];
  const seen = new Set(entries.map((entry) => entry.id));
  const catalog = new Map<number, ImportAnime>(
    (checkpoint?.catalog ?? previous?.catalog)?.map((anime) => [
      anime.id,
      provider === 'mal' ? { ...anime, malId: anime.id } : anime,
    ]),
  );
  const posters = { ...previous?.posters, ...checkpoint?.posters };
  const dimensions = { ...previous?.dimensions, ...checkpoint?.dimensions };
  let offset = resuming ? checkpoint.offset : 0;
  let listComplete = resuming ? checkpoint.listComplete : false;
  const save = (complete = false) =>
    onCheckpoint?.({
      provider,
      scope: 'statuses-v2',
      username: name,
      importedAt: Date.now(),
      catalog: [...catalog.values()],
      posters: { ...posters },
      dimensions: { ...dimensions },
      entries: [...entries],
      offset,
      listComplete,
      complete,
    }) ?? Promise.resolve();
  onProgress({ phase: 'Reading list', percent: null });
  while (!listComplete) {
    signal.throwIfAborted();
    const page = await request(() => adapter.readPage(name, offset));
    page.catalog.forEach((anime) => {
      catalog.set(anime.id, anime);
    });
    const fresh = page.entries.filter((entry) => !seen.has(entry.id));
    if (page.entries.length && !fresh.length) {
      throw new Error(
        `${adapter.label} returned a repeated list page. Try again later.`,
      );
    }
    fresh.forEach((entry) => {
      seen.add(entry.id);
      entries.push(entry);
    });
    if (page.next === null) {
      listComplete = true;
      await save();
      break;
    }
    if (!page.entries.length) {
      throw new Error(
        `${adapter.label} returned an empty list page before the end. Try again later.`,
      );
    }
    offset = page.next;
    await save();
  }
  const eligible = entries.filter(eligibleImportEntry);
  if (!eligible.length) {
    throw new Error(
      'No completed, watching or dropped TV or episodic ONA series were found.',
    );
  }
  const needed = new Set(eligible.map((entry) => entry.id));
  const resolved = new Set<number>();
  let seasonPercent = 0;
  onProgress({ phase: 'Checking seasons', percent: 0 });
  while (resolved.size < needed.size) {
    const pending = [...needed].filter((id) => !resolved.has(id));
    const missing = pending.filter((id) => !catalog.has(id)).slice(0, 8);
    if (missing.length) {
      const batch = await request(() => adapter.readAnime(missing));
      if (missing.some((id) => !batch.some((anime) => anime.id === id))) {
        throw new Error(
          `${adapter.label} season metadata is incomplete. Try again later.`,
        );
      }
      batch.forEach((anime) => {
        catalog.set(anime.id, anime);
      });
      await save();
    }
    pending.forEach((id) => {
      const anime = catalog.get(id);
      if (!anime) {
        return;
      }
      resolved.add(id);
      anime.prequels.forEach((prequel) => {
        needed.add(prequel);
      });
    });
    // Newly discovered prequels must not make the displayed progress move backwards.
    seasonPercent =
      resolved.size === needed.size
        ? 100
        : Math.max(
            seasonPercent,
            Math.min(99, Math.round((resolved.size / needed.size) * 100)),
          );
    onProgress({
      phase: 'Checking seasons',
      percent: seasonPercent,
    });
  }
  const series = groupImportSeries(entries, [...catalog.values()]);
  onProgress({ phase: 'Finding posters', percent: 0 });
  const missingPosters = series.filter(
    (entry) => !Object.hasOwn(posters, String(entry.id)),
  );
  for (let offset = 0; offset < missingPosters.length; offset += 8) {
    const batch = missingPosters.slice(offset, offset + 8);
    const found = await request(() => adapter.readPosters(batch));
    batch.forEach((entry, index) => {
      posters[String(entry.id)] = found[index];
    });
    await save();
    onProgress({
      phase: 'Finding posters',
      percent: Math.round(
        (Math.min(offset + 8, missingPosters.length) / missingPosters.length) *
          100,
      ),
    });
  }
  series.forEach((entry) => {
    const poster = posters[String(entry.id)];
    if (poster) {
      entry.imageUrl = poster;
    }
  });
  onProgress({ phase: 'Finding posters', percent: 100 });
  signal.throwIfAborted();
  await onCatalogReady?.();
  const document = importSeriesDocument(series, provider);
  let nextPoster = 0;
  let loadedPosters = 0;
  let unavailablePosters = 0;
  onProgress({ phase: 'Loading posters', percent: 0 });
  const loadPosters = async () => {
    while (nextPoster < document.items.length) {
      signal.throwIfAborted();
      const item = document.items[nextPoster++];
      if (item.image && dimensions[item.image.src]) {
        Object.assign(item.image, dimensions[item.image.src]);
      } else if (item.image) {
        try {
          const blob = await ky
            .get(item.image.src, {
              signal,
              timeout: 12_000,
              retry: 0,
              credentials: 'omit',
            })
            .blob();
          const bitmap = await createImageBitmap(blob);
          item.image.width = bitmap.width;
          item.image.height = bitmap.height;
          dimensions[item.image.src] = {
            width: bitmap.width,
            height: bitmap.height,
          };
          bitmap.close();
        } catch {
          signal.throwIfAborted();
          unavailablePosters += 1;
        }
      }
      loadedPosters += 1;
      onProgress({
        phase: 'Loading posters',
        percent: Math.round((loadedPosters / document.items.length) * 100),
      });
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(6, document.items.length) }, loadPosters),
  );
  signal.throwIfAborted();

  await save(true);
  const importHistory: AnimeImportHistory = {
    username: name,
    importedAt: Date.now(),
    catalog: [...catalog.values()],
    posters,
    dimensions,
  };
  document.animeImports = { ...histories, [provider]: importHistory };
  if (provider === 'mal') {
    document.malImport = importHistory;
  }
  return {
    document,
    series,
    unavailablePosters,
    completed: entries.filter((entry) => entry.completed).length,
    skipped: entries.length - eligible.length,
  };
};
