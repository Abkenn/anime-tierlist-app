import type { AnimeSearchResult } from '@/app/_types/anime-search.types';

export const blendAnimeSearchResults = (
  pages: AnimeSearchResult[][],
  curated: AnimeSearchResult[],
): AnimeSearchResult[] => {
  const firstVisiblePage = Math.max(
    0,
    pages.findIndex((page) => page.length > 0),
  );
  const [first = [], ...remaining] = pages.slice(firstVisiblePage);
  const fetchedIds = new Set(pages.flat().map((item) => item.id));
  const extras = curated.filter((item) => !fetchedIds.has(item.id));
  const blended = first.flatMap((item, index) => {
    const extra = extras[Math.floor(index / 4)];

    return (index + 1) % 4 === 0 && extra ? [item, extra] : [item];
  });

  return [
    ...blended,
    ...extras.slice(Math.floor(first.length / 4)),
    ...remaining.flat(),
  ];
};
