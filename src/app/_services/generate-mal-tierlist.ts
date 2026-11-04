import ky from 'ky';
import {
  eligibleMalEntry,
  groupMalSeries,
  type MalAnime,
  type MalListEntry,
  malSeriesDocument,
  malUsernameSchema,
} from '@/app/_lib/mal-import';
import type { MalImportHistory } from '@/app/_lib/mal-import-history';
import type { SyncResult } from '@/app/_lib/tierlist-sync';
import {
  loadMalAnimeBatch,
  loadMalListPage,
  loadMalPosterBatch,
} from './mal-import.actions';

type GenerateMalInput = {
  username: string;
  history?: MalImportHistory;
  signal: AbortSignal;
  onProgress: (progress: MalImportProgress) => void;
};
export type MalImportProgress = {
  phase:
    | 'Reading list'
    | 'Checking seasons'
    | 'Finding posters'
    | 'Loading posters';
  percent: number | null;
};

const value = <T>(result: SyncResult<T>) => {
  if (!result.ok) {
    throw new Error(result.message);
  }

  return result.value;
};

export const generateMalTierlist = async ({
  username,
  history,
  signal,
  onProgress,
}: GenerateMalInput) => {
  const name = malUsernameSchema.parse(username);
  const previous =
    history?.username.toLowerCase() === name.toLowerCase()
      ? history
      : undefined;
  const request = async <T>(operation: () => Promise<SyncResult<T>>) => {
    signal.throwIfAborted();
    const result = value(await operation());
    signal.throwIfAborted();
    return result;
  };
  const entries: MalListEntry[] = [];
  const seen = new Set<number>();
  let offset = 0;
  onProgress({ phase: 'Reading list', percent: null });
  while (true) {
    signal.throwIfAborted();
    const page = await request(() =>
      loadMalListPage({ username: name, offset }),
    );
    if (!page.length) {
      break;
    }
    const fresh = page.filter((entry) => !seen.has(entry.anime_id));
    if (!fresh.length) {
      throw new Error('MAL returned a repeated list page. Try again later.');
    }
    fresh.forEach((entry) => {
      seen.add(entry.anime_id);
      entries.push(entry);
    });
    offset += page.length;
  }
  const eligible = entries.filter(eligibleMalEntry);
  if (!eligible.length) {
    throw new Error(
      'No completed, scored TV or episodic ONA series were found.',
    );
  }
  const catalog = new Map<number, MalAnime>(
    previous?.catalog.map((anime) => [anime.id, anime]),
  );
  const needed = new Set(eligible.map((entry) => entry.anime_id));
  const resolved = new Set<number>();
  let seasonPercent = 0;
  onProgress({ phase: 'Checking seasons', percent: 0 });
  while (resolved.size < needed.size) {
    const pending = [...needed].filter((id) => !resolved.has(id));
    const missing = pending.filter((id) => !catalog.has(id)).slice(0, 8);
    if (missing.length) {
      const batch = await request(() => loadMalAnimeBatch(missing));
      batch.forEach((anime) => {
        catalog.set(anime.id, anime);
      });
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
  const series = groupMalSeries(entries, [...catalog.values()]);
  const posters = { ...previous?.posters };
  onProgress({ phase: 'Finding posters', percent: 0 });
  const missingPosters = series.filter(
    (entry) => !Object.hasOwn(posters, String(entry.id)),
  );
  for (let offset = 0; offset < missingPosters.length; offset += 8) {
    const batch = missingPosters.slice(offset, offset + 8);
    const found = await request(() =>
      loadMalPosterBatch(batch.map((entry) => entry.title)),
    );
    batch.forEach((entry, index) => {
      const poster = found[index];
      posters[String(entry.id)] =
        poster &&
        (poster.malId === entry.id ||
          entry.seasonIds.includes(poster.malId ?? 0))
          ? poster.imageUrl
          : null;
    });
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
  const document = malSeriesDocument(series);
  const dimensions = { ...previous?.dimensions };
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

  document.malImport = {
    username: name,
    importedAt: Date.now(),
    catalog: [...catalog.values()],
    posters,
    dimensions,
  };
  return {
    document,
    series,
    unavailablePosters,
    completed: entries.length,
    skipped: entries.length - eligible.length,
  };
};
