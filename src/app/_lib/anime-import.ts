import type { TierItemData, TierRank } from '@/app/_types/tierlist.types';
import { balanceImportRows, compareImportSeries } from './anime-row-balance';
import type { TierlistDocument } from './tierlist-sync';

export type ImportProvider = 'mal' | 'anilist';

export type ImportListEntry = {
  id: number;
  title: string;
  format: string;
  episodes: number | null;
  watchedEpisodes: number;
  completed: boolean;
  score: number;
};

export type ImportAnime = {
  id: number;
  malId?: number;
  title: string;
  type: string;
  episodes: number | null;
  imageUrl?: string;
  prequels: number[];
};

export type ImportSeries = {
  id: number;
  malId?: number;
  title: string;
  score: number;
  episodes: number;
  seasons: number;
  seasonIds: number[];
  imageUrl?: string;
};

export const importRanks: TierRank[] = [
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

export const isImportSeries = (type: string, episodes: number | null) =>
  type === 'TV' || (type === 'ONA' && (episodes ?? 0) > 1);

export const eligibleImportEntry = (entry: ImportListEntry) =>
  entry.completed &&
  entry.score > 0 &&
  isImportSeries(entry.format, entry.episodes || entry.watchedEpisodes);

export const importScoreRank = (score: number, seasons: number): TierRank => {
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

export const groupImportSeries = (
  entries: ImportListEntry[],
  catalog: ImportAnime[],
): ImportSeries[] => {
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
    ...new Map(entries.map((entry) => [entry.id, entry])).values(),
  ];
  const groups = new Map<number, ImportListEntry[]>();
  unique.filter(eligibleImportEntry).forEach((entry) => {
    const metadata = anime.get(entry.id);
    if (!metadata) {
      throw new Error('Season metadata is incomplete. Try generating again.');
    }
    const id = root(entry.id);
    groups.set(id, [...(groups.get(id) ?? []), entry]);
  });

  return [...groups.entries()]
    .map(([id, seasons]) => {
      const representative =
        catalog
          .filter(
            (entry) =>
              root(entry.id) === id &&
              isImportSeries(entry.type, entry.episodes),
          )
          .sort((a, b) => depth(a.id) - depth(b.id) || a.id - b.id)[0] ??
        anime.get(id);
      const weighted = seasons.map((entry) => ({
        entry,
        episodes:
          anime.get(entry.id)?.episodes ||
          entry.episodes ||
          entry.watchedEpisodes,
      }));
      if (weighted.some((entry) => entry.episodes <= 0)) {
        throw new Error(
          'An episode count is unavailable. Try generating again later.',
        );
      }
      const episodes = weighted.reduce((sum, entry) => sum + entry.episodes, 0);

      return {
        id: representative?.id ?? id,
        malId: representative?.malId,
        title: representative?.title ?? seasons[0].title,
        imageUrl: representative?.imageUrl,
        episodes,
        seasons: seasons.length,
        seasonIds: seasons.map((entry) => entry.id),
        score:
          weighted.reduce(
            (sum, entry) => sum + entry.entry.score * entry.episodes,
            0,
          ) / episodes,
      };
    })
    .sort(compareImportSeries);
};

export const importSeriesDocument = (
  series: ImportSeries[],
  provider: ImportProvider,
): TierlistDocument => {
  const rows = balanceImportRows(
    importRanks.map((rank) => ({
      rank,
      series: series.filter(
        (entry) => importScoreRank(entry.score, entry.seasons) === rank,
      ),
    })),
  );

  return {
    version: 1,
    ranks: [...importRanks],
    imageMode: 'natural',
    posterSize: 'dynamic',
    rankDetails: {},
    items: rows.flatMap((row) =>
      row.series.map(
        (entry): TierItemData => ({
          id: `${provider}-${entry.id}`,
          ...(entry.malId ? { malId: entry.malId } : {}),
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
