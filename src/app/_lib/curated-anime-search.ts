import Fuse from 'fuse.js';
import type { CuratedAnimeImage } from '@/app/_types/anime-search.types';

const normalizeAlias = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const seasonPattern =
  /\b(?:season\s*(\d+)|(\d+)(?:st|nd|rd|th)\s+season|s(\d+))\b/u;

const seasonNumber = (value: string) =>
  value.match(seasonPattern)?.slice(1).find(Boolean);

export const searchCuratedAnime = (
  images: CuratedAnimeImage[],
  input: string,
): CuratedAnimeImage[] => {
  const query = normalizeAlias(input);
  if (query.length < 2) {
    return [];
  }

  const requestedSeason = seasonNumber(query);
  const queryWords = query
    .replace(seasonPattern, '')
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
  if (!queryWords.length) {
    return [];
  }

  const candidates = images
    .filter((image) => {
      const season = seasonNumber(normalizeAlias(image.title));

      return !requestedSeason || !season || requestedSeason === season;
    })
    .map((image) => ({
      image,
      aliases: [image.title, ...image.keywords].map((alias) =>
        normalizeAlias(alias).replace(seasonPattern, '').trim().split(/\s+/u),
      ),
    }));
  const words = [
    ...new Set(candidates.flatMap(({ aliases }) => aliases.flat())),
  ];
  const matches = queryWords.map(
    (word) =>
      new Set([
        ...words.filter((candidate) => candidate.startsWith(word)),
        ...(word.length >= 5
          ? new Fuse(words, {
              ignoreLocation: true,
              includeMatches: true,
              threshold: 1 / word.length,
              ignoreFieldNorm: true,
            })
              .search(word)
              .filter(
                ({ matches }) =>
                  (matches?.[0]?.indices[0]?.[0] ?? Infinity) <= 1,
              )
              .map(({ item }) => item)
          : []),
      ]),
  );

  return candidates
    .filter(({ aliases }) =>
      aliases.some((alias) => {
        let position = -1;

        return matches.every((matchingWords) => {
          position = alias.findIndex(
            (word, index) => index > position && matchingWords.has(word),
          );

          return position !== -1;
        });
      }),
    )
    .map(({ image }) => image);
};
