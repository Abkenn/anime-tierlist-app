import { z } from 'zod';
import type { TierItemData, TierRank } from '@/app/_types/tierlist.types';
import { balanceMalRows, compareMalSeries } from './mal-row-balance';
import type { TierlistDocument } from './tierlist-sync';

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
export type MalAnime = {
  id: number;
  title: string;
  type: string;
  episodes: number | null;
  imageUrl?: string;
  prequels: number[];
};
export type MalSeries = {
  id: number;
  title: string;
  score: number;
  episodes: number;
  seasons: number;
  seasonIds: number[];
  imageUrl?: string;
};
export const malImportRanks: TierRank[] = [
  'S+',
  'S',
  'A+',
  'A',
  'B+',
  'B',
  'C',
  'D',
  'F',
];
export const isMalSeries = (type: string, episodes: number | null) =>
  type === 'TV' || (type === 'ONA' && (episodes ?? 0) > 1);
export const eligibleMalEntry = (entry: MalListEntry) =>
  entry.status === 2 &&
  entry.score > 0 &&
  isMalSeries(
    entry.anime_media_type_string,
    entry.anime_num_episodes || entry.num_watched_episodes,
  );

export const malScoreRank = (score: number, seasons: number): TierRank => {
  switch (true) {
    case score === 10 && seasons >= 2:
      return 'S+';
    case score >= 9.5:
      return 'S';
    case score >= 8.5:
      return 'A+';
    case score >= 8:
      return 'A';
    case score >= 7.5:
      return 'B+';
    case score >= 7:
      return 'B';
    case score >= 6:
      return 'C';
    case score >= 5:
      return 'D';
    default:
      return 'F';
  }
};

export const groupMalSeries = (
  entries: MalListEntry[],
  catalog: MalAnime[],
): MalSeries[] => {
  const anime = new Map(catalog.map((entry) => [entry.id, entry]));
  const parent = new Map(catalog.map((entry) => [entry.id, entry.id]));
  const root = (id: number): number => {
    const next = parent.get(id) ?? id;

    return next === id ? id : root(next);
  };
  catalog.forEach((entry) => {
    entry.prequels.forEach((id) => {
      if (anime.has(id)) {
        parent.set(root(entry.id), root(id));
      }
    });
  });
  const depth = (id: number, visited = new Set<number>()): number => {
    if (visited.has(id)) {
      return 0;
    }
    const next = new Set([...visited, id]);
    const prequels =
      anime.get(id)?.prequels.filter((prequel) => anime.has(prequel)) ?? [];

    return prequels.length
      ? 1 + Math.max(...prequels.map((prequel) => depth(prequel, next)))
      : 0;
  };
  const unique = [
    ...new Map(entries.map((entry) => [entry.anime_id, entry])).values(),
  ];
  const groups = new Map<number, MalListEntry[]>();
  unique.filter(eligibleMalEntry).forEach((entry) => {
    const metadata = anime.get(entry.anime_id);
    if (!metadata) {
      throw new Error('Season metadata is incomplete. Try generating again.');
    }
    const id = root(entry.anime_id);
    groups.set(id, [...(groups.get(id) ?? []), entry]);
  });

  return [...groups.entries()]
    .map(([id, seasons]) => {
      const representative =
        catalog
          .filter(
            (entry) =>
              root(entry.id) === id && isMalSeries(entry.type, entry.episodes),
          )
          .sort((a, b) => depth(a.id) - depth(b.id) || a.id - b.id)[0] ??
        anime.get(id);
      const weighted = seasons.map((entry) => ({
        entry,
        episodes:
          anime.get(entry.anime_id)?.episodes ||
          entry.anime_num_episodes ||
          entry.num_watched_episodes,
      }));
      if (weighted.some((entry) => entry.episodes <= 0)) {
        throw new Error(
          'An episode count is unavailable. Try generating again later.',
        );
      }
      const episodes = weighted.reduce((sum, entry) => sum + entry.episodes, 0);

      return {
        id: representative?.id ?? id,
        title: representative?.title ?? seasons[0].anime_title,
        imageUrl: representative?.imageUrl,
        episodes,
        seasons: seasons.length,
        seasonIds: seasons.map((entry) => entry.anime_id),
        score:
          weighted.reduce(
            (sum, entry) => sum + entry.entry.score * entry.episodes,
            0,
          ) / episodes,
      };
    })
    .sort(compareMalSeries);
};

export const malSeriesDocument = (series: MalSeries[]): TierlistDocument => {
  const rows = balanceMalRows(
    malImportRanks.map((rank) => ({
      rank,
      series: series.filter(
        (entry) => malScoreRank(entry.score, entry.seasons) === rank,
      ),
    })),
  );

  return {
    version: 1,
    ranks: [...malImportRanks],
    imageMode: 'natural',
    posterSize: 'dynamic',
    rankDetails: {},
    items: rows.flatMap((row) =>
      row.series.map(
        (entry): TierItemData => ({
          id: `mal-${entry.id}`,
          malId: entry.id,
          label: `${entry.title} (${entry.score.toFixed(2)}/10)`,
          rank: row.rank,
          ...(entry.imageUrl
            ? {
                image: {
                  src: entry.imageUrl,
                  width: 225,
                  height: 318,
                  alt: entry.title,
                },
              }
            : {}),
        }),
      ),
    ),
  };
};
