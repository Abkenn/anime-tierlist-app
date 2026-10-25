'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { createQueries } from 'orpc-stack/client';
import { kyTransport } from 'orpc-stack/ky';
import { useEffect, useRef, useState } from 'react';
import { animeSearchConfigAtom } from '@/app/_atoms/tierlist/search.atoms';
import {
  classifySearchInput,
  normalizeAnimeQuery,
} from '@/app/_lib/anime-search';
import { animeSearchEndpoint } from '@/app/_lib/anime-search-contract';
import type { AnimeSearchSeed } from '@/app/_types/anime-search.types';

const animeSearchQueries = createQueries(animeSearchEndpoint, {
  fetch: kyTransport,
});

export const useAnimeSearch = (
  input: string,
  { initialQuery = '', initialPage }: AnimeSearchSeed = {},
) => {
  const { catalogSearchEnabled = true } = useAtomValue(animeSearchConfigAtom);
  const [debounced, setDebounced] = useState(initialQuery);
  const sentinel = useRef<HTMLDivElement>(null);
  const classification = classifySearchInput(debounced);
  const url = classification.kind === 'image' ? classification.url : null;
  const urlError =
    classification.kind === 'invalid' ? classification.message : null;
  const query = normalizeAnimeQuery(debounced);
  const search = useInfiniteQuery(
    animeSearchQueries.searchAnime.infiniteOptions({
      input: (page: number) => ({ query, page }),
      enabled: catalogSearchEnabled && classification.kind === 'search',
      initialPageParam: 1,
      initialData:
        initialPage && query === initialQuery
          ? { pages: [initialPage], pageParams: [1] }
          : undefined,
      getNextPageParam: (last) => last.nextPage ?? undefined,
      staleTime: 30 * 24 * 60 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: false,
    }),
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(input.trim()), 350);

    return () => clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    const element = sentinel.current;

    if (
      !element ||
      !search.hasNextPage ||
      search.isFetching ||
      search.isError ||
      input.trim() !== debounced
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void search.fetchNextPage();
        }
      },
      { rootMargin: '120px' },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [
    search.hasNextPage,
    search.isFetching,
    search.isError,
    search.fetchNextPage,
    input,
    debounced,
  ]);

  return {
    search,
    sentinel,
    query,
    url,
    urlError,
    debounced,
    submitQuery: (value: string) => setDebounced(value.trim()),
    waiting: input.trim() !== debounced,
  };
};
