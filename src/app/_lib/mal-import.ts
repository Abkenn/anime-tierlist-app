import { z } from 'zod';
import {
  eligibleImportEntry,
  groupImportSeries,
  type ImportAnime,
  type ImportListEntry,
  type ImportSeries,
  importSeriesDocument,
} from './anime-import';

export {
  importRanks as malImportRanks,
  importScoreRank as malScoreRank,
  isImportSeries as isMalSeries,
} from './anime-import';

export const malUsernameSchema = z
  .string()
  .trim()
  .regex(/^[\w-]{2,16}$/u);

export const malListSchema = z
  .array(
    z.object({
      anime_id: z.number().int().positive(),
      anime_title: z.union([z.string(), z.number()]).transform(String),
      anime_media_type_string: z.string(),
      anime_num_episodes: z.number().int().nonnegative().nullable(),
      num_watched_episodes: z.number().int().nonnegative(),
      status: z.number().int(),
      score: z.number().int().min(0).max(10),
    }),
  )
  .max(300);

export type MalListEntry = z.infer<typeof malListSchema>[number];

export type MalAnime = ImportAnime;

export type MalSeries = ImportSeries;

const malStatuses: Partial<
  Record<number, NonNullable<ImportListEntry['status']>>
> = { 1: 'watching', 2: 'completed', 4: 'dropped' };

export const normalizeMalEntry = (entry: MalListEntry): ImportListEntry => ({
  id: entry.anime_id,
  title: entry.anime_title,
  format: entry.anime_media_type_string,
  episodes: entry.anime_num_episodes,
  watchedEpisodes: entry.num_watched_episodes,
  completed: entry.status === 2,
  status: malStatuses[entry.status] ?? 'skipped',
  score: entry.score,
});

export const eligibleMalEntry = (entry: MalListEntry) =>
  eligibleImportEntry(normalizeMalEntry(entry));

export const groupMalSeries = (entries: MalListEntry[], catalog: MalAnime[]) =>
  groupImportSeries(
    entries.map(normalizeMalEntry),
    catalog.map((anime) => ({ ...anime, malId: anime.id })),
  );

export const malSeriesDocument = (series: MalSeries[]) =>
  importSeriesDocument(
    series.map((entry) => ({ ...entry, malId: entry.id })),
    'mal',
  );
