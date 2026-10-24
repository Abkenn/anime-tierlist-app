import Fuse from 'fuse.js';
import type { CuratedAnimeImage } from '@/app/_types/anime-search.types';

const normalizeAlias = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

export const searchCuratedAnime = (
  images: CuratedAnimeImage[],
  input: string,
): CuratedAnimeImage[] => {
  const query = normalizeAlias(input);
  if (query.length < 2) {
    return [];
  }

  const candidates = images.map((image) => ({
    image,
    aliases: [image.title, ...image.keywords].map(normalizeAlias),
  }));
  if (query.length < 4) {
    return candidates
      .filter(({ aliases }) =>
        aliases.some(
          (alias) =>
            alias.split(' ').some((word) => word.startsWith(query)) ||
            alias.replaceAll(' ', '') === query.replaceAll(' ', ''),
        ),
      )
      .map(({ image }) => image);
  }

  return new Fuse(candidates, {
    keys: ['aliases'],
    threshold: 0.25,
    ignoreLocation: true,
    ignoreFieldNorm: true,
  })
    .search(query)
    .map(({ item }) => item.image);
};
