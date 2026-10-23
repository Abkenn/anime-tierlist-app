import { cacheLife, cacheTag } from 'next/cache';
import { normalizeAnimeQuery } from '@/app/_lib/anime-search';
import { searchAnimePage } from '@/app/_services/anime-search';
import type { CuratedAnimeImage } from '@/app/_types/anime-search.types';
import { AnimeSearchDiscard } from './anime-search-discard';
import { AnimeSearchProvider } from './anime-search-provider';
import { AnimeSearchResults } from './anime-search-results';

type AnimeSearchProps = {
  curatedImages?: CuratedAnimeImage[];
  initialQuery?: string;
};

export const AnimeSearch = async ({
  curatedImages = [],
  initialQuery = '',
}: AnimeSearchProps) => {
  'use cache';
  cacheLife('max');
  cacheTag('anime-search');

  const query = normalizeAnimeQuery(initialQuery);
  const initialPage =
    query.length >= 2 && query.length <= 300
      ? await searchAnimePage(query, 1)
      : undefined;

  return (
    <aside
      aria-label="Anime search"
      className="relative min-w-0 lg:grid lg:min-h-0 lg:w-64 lg:grid-rows-[minmax(0,1fr)] lg:self-stretch lg:contain-size"
    >
      <AnimeSearchProvider
        curatedImages={curatedImages}
        initialQuery={query}
        initialPage={initialPage}
      >
        <AnimeSearchResults />
      </AnimeSearchProvider>

      <AnimeSearchDiscard />
    </aside>
  );
};
