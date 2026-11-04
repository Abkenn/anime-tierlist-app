import { anilistUsernameSchema } from '@/app/_lib/anilist-import';
import type {
  ImportAnime,
  ImportListEntry,
  ImportProvider,
  ImportSeries,
} from '@/app/_lib/anime-import';
import { malUsernameSchema, normalizeMalEntry } from '@/app/_lib/mal-import';
import type { SyncResult } from '@/app/_lib/tierlist-sync';
import {
  loadAnilistAnimeBatch,
  loadAnilistPage,
} from './anilist-import.actions';
import {
  loadMalAnimeBatch,
  loadMalListPage,
  loadMalPosterBatch,
} from './mal-import.actions';

export type AnimeImportAdapter = {
  label: string;
  parseUsername: (value: unknown) => string;
  readPage: (
    username: string,
    offset: number,
  ) => Promise<{
    entries: ImportListEntry[];
    catalog: ImportAnime[];
    next: number | null;
  }>;
  readAnime: (ids: number[]) => Promise<ImportAnime[]>;
  readPosters: (series: ImportSeries[]) => Promise<(string | null)[]>;
};

const unwrap = <T>(result: SyncResult<T>): T => {
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.value;
};

export const animeImportProviders: Record<ImportProvider, AnimeImportAdapter> =
  {
    mal: {
      label: 'MAL',
      parseUsername: (value) => malUsernameSchema.parse(value),
      readPage: async (username, offset) => {
        const entries = unwrap(await loadMalListPage({ username, offset }));
        return {
          entries: entries.map(normalizeMalEntry),
          catalog: [],
          next: entries.length ? offset + entries.length : null,
        };
      },
      readAnime: async (ids) =>
        unwrap(await loadMalAnimeBatch(ids)).map((anime) => ({
          ...anime,
          malId: anime.id,
        })),
      readPosters: async (series) => {
        const found = unwrap(
          await loadMalPosterBatch(series.map((entry) => entry.title)),
        );
        return series.map((entry, index) => {
          const poster = found[index];
          return poster &&
            (poster.malId === entry.id ||
              entry.seasonIds.includes(poster.malId ?? 0))
            ? poster.imageUrl
            : null;
        });
      },
    },
    anilist: {
      label: 'AniList',
      parseUsername: (value) => anilistUsernameSchema.parse(value),
      readPage: async (username, offset) => {
        const result = unwrap(
          await loadAnilistPage({ username, page: offset + 1 }),
        );
        return {
          entries: result.entries,
          catalog: result.catalog,
          next: result.hasNext ? offset + 1 : null,
        };
      },
      readAnime: async (ids) => unwrap(await loadAnilistAnimeBatch(ids)),
      // AniList already returns verified artwork with each season; no extra title searches.
      readPosters: async (series) =>
        series.map((entry) => entry.imageUrl ?? null),
    },
  };
