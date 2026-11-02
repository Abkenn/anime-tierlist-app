import type { AnimeSearchResult } from '@/app/_types/anime-search.types';

// Fetched results before each curated match. Use a whole number >= 1; lower = earlier.
export const CURATED_RESULT_INTERVAL = 3;

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
    const extra = extras[Math.floor(index / CURATED_RESULT_INTERVAL)];

    return (index + 1) % CURATED_RESULT_INTERVAL === 0 && extra
      ? [item, extra]
      : [item];
  });

  return [
    ...blended,
    ...extras.slice(Math.floor(first.length / CURATED_RESULT_INTERVAL)),
    ...remaining.flat(),
  ];
};
