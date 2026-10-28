import type { TierItemData } from '@/app/_types/tierlist.types';
import { curatedAnimeImages } from './curated-anime';

export type MalCandidate = {
  mal_id: number;
  title?: string | null;
  title_english?: string | null;
  title_synonyms?: string[];
  titles?: { type?: string; title: string }[];
};
export const normalizeMalTitle = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
const seasonPattern =
  /\b(?:season\s*(\d+)|(\d+)(?:st|nd|rd|th)\s+season|s0?(\d+))\b/u;
const romanSeasons: Record<string, number> = { ii: 2, iii: 3, iv: 4, v: 5 };
export const malSeason = (title: string) => {
  const normalized = normalizeMalTitle(title);
  const explicit = normalized.match(seasonPattern)?.slice(1).find(Boolean);
  if (explicit) {
    return Number(explicit);
  }
  const trailing = normalized.match(/\s(ii|iii|iv|v|[1-9])$/u)?.[1];
  return trailing && !/\bpart\s/u.test(normalized)
    ? (romanSeasons[trailing] ?? Number(trailing))
    : undefined;
};
const baseTitle = (value: string) => {
  const normalized = normalizeMalTitle(value).replace(seasonPattern, '').trim();
  return malSeason(value)
    ? normalized.replace(/\s(ii|iii|iv|v|[1-9])$/u, '').trim()
    : normalized;
};
const curatedById = new Map(
  curatedAnimeImages.map((anime) => [anime.id, anime]),
);
const curatedByImage = new Map(
  curatedAnimeImages.map((anime) => [anime.imageUrl, anime]),
);

const curatedByAlias = new Map<string, number | null>();
for (const anime of curatedAnimeImages) {
  if (!anime.malId) {
    continue;
  }
  for (const alias of [anime.title, ...anime.keywords]) {
    const key = normalizeMalTitle(alias);
    const previous = curatedByAlias.get(key);
    curatedByAlias.set(
      key,
      previous === undefined || previous === anime.malId ? anime.malId : null,
    );
  }
}

export const knownMalId = (item: TierItemData) => {
  if (item.malId) {
    return item.malId;
  }
  const legacy = item.id.match(/^mal-(\d+)$/u)?.[1];
  if (legacy && Number.isSafeInteger(Number(legacy)) && Number(legacy) > 0) {
    return Number(legacy);
  }
  const curated =
    curatedById.get(item.id) ?? curatedByImage.get(item.image?.src ?? '');
  if (curated?.malId) {
    return curated.malId;
  }
  for (const query of malLookupQueries(item)) {
    if ((malSeason(query) ?? 1) !== 1) {
      continue;
    }
    const normalized = normalizeMalTitle(query);
    const match = curatedByAlias.get(normalized);
    if (match) {
      return match;
    }
  }
  return undefined;
};

export const malLookupQueries = (
  item: Pick<TierItemData, 'label' | 'title'>,
) => {
  const label = item.label.trim().slice(0, 300);
  const text =
    item.title?.text.trim().replace(/\s+/gu, ' ').slice(0, 280) ?? '';
  const season = malSeason(label);
  const fallback =
    text && season && !malSeason(text) ? `${text} Season ${season}` : text;
  return [...new Set([label, fallback])].filter(
    (query) =>
      query.length >= 2 &&
      !['unknown', 'untitled', 'image', 'poster', 'anime'].includes(
        normalizeMalTitle(query),
      ) &&
      baseTitle(query).length >= 2,
  );
};

const almostEqual = (left: string, right: string) => {
  if (left === right) {
    return true;
  }
  if (
    Math.min(left.length, right.length) < 8 ||
    Math.abs(left.length - right.length) > 1 ||
    String(left.match(/\d+/gu)) !== String(right.match(/\d+/gu))
  ) {
    return false;
  }
  let i = 0;
  let j = 0;
  let differences = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      i += 1;
      j += 1;
      continue;
    }
    if (++differences > 1) {
      return false;
    }
    if (left.length >= right.length) {
      i += 1;
    }
    if (right.length >= left.length) {
      j += 1;
    }
  }
  return differences + Number(i < left.length || j < right.length) <= 1;
};

export const selectMalCandidate = (
  query: string,
  candidates: MalCandidate[],
) => {
  const requestedSeason = malSeason(query) ?? 1;
  const wanted = baseTitle(query);
  const matches = candidates
    .flatMap((candidate) => {
      const primary = [
        candidate.title,
        candidate.title_english,
        ...(candidate.titles ?? [])
          .filter((entry) => entry.type !== 'Synonym')
          .map((entry) => entry.title),
      ].filter((title): title is string => Boolean(title));
      const aliases = [
        ...(candidate.title_synonyms ?? []),
        ...(candidate.titles ?? [])
          .filter((entry) => entry.type === 'Synonym')
          .map((entry) => entry.title),
      ];
      const season =
        primary.map(malSeason).find(Boolean) ??
        aliases.map(malSeason).find(Boolean) ??
        1;
      if (season !== requestedSeason) {
        return [];
      }
      const primaryExact = primary.some((title) => baseTitle(title) === wanted);
      const specialized = /\b(recap|special|pvs?|movie|picture drama)\b/u.test(
        primary.map(normalizeMalTitle).join(' '),
      );
      const extendedTitle = primary.some((title) =>
        baseTitle(title).startsWith(`${wanted} `),
      );
      const aliasExact =
        !specialized &&
        !extendedTitle &&
        aliases.some((title) => baseTitle(title) === wanted);
      const near = primary.some((title) =>
        almostEqual(wanted, baseTitle(title)),
      );
      const score = Math.max(
        primaryExact ? 3 : 0,
        aliasExact ? 2 : 0,
        near ? 1 : 0,
      );
      return score ? [{ id: candidate.mal_id, score }] : [];
    })
    .sort((a, b) => b.score - a.score);
  const winners = new Set(
    matches
      .filter((match) => match.score === matches[0]?.score)
      .map((match) => match.id),
  );
  return winners.size === 1 ? [...winners][0] : null;
};
