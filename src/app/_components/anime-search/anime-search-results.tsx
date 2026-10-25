'use client';

import { useAtomValue } from 'jotai';
import { motion, useReducedMotion } from 'motion/react';
import {
  useActionState,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from 'react';
import { importedItemIdsAtom } from '@/app/_atoms/tierlist/items.atoms';
import { animeSearchConfigAtom } from '@/app/_atoms/tierlist/search.atoms';
import { TerminalText } from '@/app/_components/shell/terminal-text';
import { ScrollArea } from '@/app/_components/ui/scroll-area';
import { useAnimeSearch } from '@/app/_hooks/use-anime-search';
import { useSearchDisplacement } from '@/app/_hooks/use-search-displacement';
import { useViewportWindow } from '@/app/_hooks/use-viewport-window';
import { classifySearchInput, imageSuitability } from '@/app/_lib/anime-search';
import { blendAnimeSearchResults } from '@/app/_lib/anime-search-results';
import { searchCuratedAnime } from '@/app/_lib/curated-anime-search';
import { tierlistErrorMessage } from '@/app/_lib/tierlist-error';
import type { AnimeSearchResult } from '@/app/_types/anime-search.types';
import type { TierImage } from '@/app/_types/tierlist.types';
import { AnimeSearchResultCard } from './anime-search-result';
import { AnimeSearchSkeleton } from './anime-search-skeleton';

export const AnimeSearchResults = () => {
  const {
    curatedImages,
    initialQuery = '',
    initialPage,
    catalogSearchEnabled = true,
  } = useAtomValue(animeSearchConfigAtom);
  const imported = useAtomValue(importedItemIdsAtom);
  const [input, setInput] = useState(initialQuery);
  const [dimensions, setDimensions] = useState<
    Record<string, TierImage | null>
  >({});
  const { search, sentinel, query, url, urlError, waiting, submitQuery } =
    useAnimeSearch(input, { initialQuery, initialPage });
  const [submission, searchAction, submitting] = useActionState(
    async (_previous: { input: string; error: string }, data: FormData) => {
      const value = String(data.get('query') ?? '');
      const classified = classifySearchInput(value);
      submitQuery(value);
      if (classified.kind === 'invalid') {
        return { input: value, error: classified.message };
      }
      return { input: value, error: '' };
    },
    { input: '', error: '' },
  );
  const deferredQuery = useDeferredValue(query);
  const curated =
    deferredQuery.length >= 2 && !url && !urlError
      ? searchCuratedAnime(curatedImages, deferredQuery)
      : [];
  const provider = (search.data?.pages ?? []).map((page) =>
    [...page.items]
      .filter((item) => !imported.has(item.id))
      .sort((a, b) => {
        const first = dimensions[a.id];
        const second = dimensions[b.id];

        return (
          (first ? imageSuitability(first.width, first.height) : 2) -
          (second ? imageSuitability(second.width, second.height) : 2)
        );
      }),
  );
  const results: AnimeSearchResult[] = url
    ? [{ id: `url-${url}`, title: 'Unknown', imageUrl: url }]
    : blendAnimeSearchResults(
        provider,
        search.isPending && catalogSearchEnabled
          ? []
          : curated.filter((item) => !imported.has(item.id)),
      );

  const reducedMotion = useReducedMotion();
  const seen = new Set<string>();
  const visibleResults = results.filter((result) => {
    if (imported.has(result.id) || seen.has(result.id)) {
      return false;
    }
    seen.add(result.id);
    return true;
  });
  const displacement = useSearchDisplacement(visibleResults);
  const window = useViewportWindow(displacement.gridRef);
  const columns = Math.max(1, window.columns);
  const gap = window.rem * 0.125;
  const rowHeight = window.rem * 6 + gap;
  const rows = Math.ceil(displacement.results.length / columns);
  const first = Math.max(0, Math.floor(window.top / rowHeight) * columns);
  const last = Math.min(
    displacement.results.length,
    Math.ceil(window.bottom / rowHeight) * columns,
  );
  const rendered = displacement.results.flatMap((result, index) =>
    (index >= first && index < last) || result.id === displacement.draggedId
      ? [{ result, index }]
      : [],
  );
  const loadingImages = rendered.some(
    ({ result }) => !result.image && !Object.hasOwn(dimensions, result.id),
  );
  const previousQuery = useRef(query);
  useEffect(() => {
    if (previousQuery.current === query) {
      return;
    }
    previousQuery.current = query;
    const viewport = displacement.gridRef.current?.closest(
      '[data-slot="scroll-area-viewport"]',
    );
    if (viewport) {
      viewport.scrollTop = 0;
    }
  }, [query, displacement.gridRef]);

  const pagesById = new Map(
    search.data?.pages.flatMap((page, index) =>
      page.items.map((item) => [item.id, String(index)] as const),
    ) ?? [],
  );
  const curatedIds = new Set(curated.map((item) => item.id));
  const pageFor = (id: string) =>
    curatedIds.has(id) ? 'curated' : (pagesById.get(id) ?? '-1');

  const loaded = (id: string, image: TierImage | null) =>
    setDimensions((current) =>
      Object.hasOwn(current, id) && current[id]?.src === image?.src
        ? current
        : { ...current, [id]: image },
    );

  const statusMessage = () => {
    if (waiting) {
      return 'Waiting...';
    }
    if (submission.input === input && submission.error) {
      return submission.error;
    }
    if (urlError) {
      return urlError;
    }
    if (!url && search.isError) {
      return tierlistErrorMessage(
        search.error,
        'Search is unavailable right now. Try again shortly.',
      );
    }
    if (!url && search.isFetching) {
      return 'Searching...';
    }
    if (loadingImages) {
      return 'Loading images...';
    }
    if (query.length >= 2 && !url && results.length === 0) {
      return 'No images found.';
    }

    return '';
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <search className="shrink-0">
        <form action={searchAction} aria-busy={submitting}>
          <label className="block text-xs text-muted-foreground">
            Find anime or paste an image URL
            <input
              type="search"
              name="query"
              value={input}
              maxLength={2048}
              placeholder="Search anime…"
              className="mt-2 min-h-11 w-full border border-divider bg-background px-3 text-sm text-foreground outline-none focus-visible:border-foreground"
              onChange={(event) => setInput(event.currentTarget.value)}
            />
          </label>
        </form>
      </search>

      <p className="my-2 shrink-0 text-xs text-muted-foreground">
        Drag to a rank · Click to add to Watching
      </p>

      <ScrollArea
        className="min-h-0 flex-1"
        viewportProps={{
          className: 'overscroll-contain pr-3',
        }}
        aria-busy={waiting || search.isFetching || loadingImages}
      >
        <div
          ref={displacement.gridRef}
          className="relative grid shrink-0 grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-0.5 lg:grid-cols-3"
          style={{ height: Math.max(0, rows * rowHeight - gap) }}
        >
          {!waiting &&
            !urlError &&
            rendered.map(({ result, index }) => (
              <motion.div
                key={result.id}
                layout="position"
                className={`absolute flex h-24 items-center justify-center ${displacement.draggedId === result.id ? 'outline-1 -outline-offset-1 outline-dashed outline-divider' : ''}`}
                style={{
                  top: Math.floor(index / columns) * rowHeight,
                  left: `calc(${index % columns} * (100% + ${gap}px) / ${columns})`,
                  width: `calc((100% - ${(columns - 1) * gap}px) / ${columns})`,
                }}
                initial={false}
                data-search-result={result.id}
                data-search-page={pageFor(result.id)}
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : {
                        type: 'spring',
                        stiffness: 900,
                        damping: 58,
                        mass: 0.65,
                      }
                }
              >
                <AnimeSearchResultCard result={result} onLoaded={loaded} />
              </motion.div>
            ))}
        </div>

        <p role="status" className="min-h-8 py-2 text-xs text-muted-foreground">
          <TerminalText text={statusMessage()} />
        </p>

        {(waiting || search.isFetching || loadingImages) && !urlError && (
          <AnimeSearchSkeleton />
        )}

        {!waiting && !url && search.isError && (
          <button
            type="button"
            className="min-h-11 text-xs underline underline-offset-4"
            onClick={() =>
              search.hasNextPage
                ? void search.fetchNextPage()
                : void search.refetch()
            }
          >
            Try again
          </button>
        )}

        <div ref={sentinel} />

        {!waiting &&
          !url &&
          !search.isFetching &&
          !loadingImages &&
          Boolean(search.data?.pages.some((page) => page.items.length > 0)) &&
          search.hasNextPage && (
            <button
              type="button"
              disabled={search.isFetching || waiting}
              className="min-h-11 text-xs underline underline-offset-4 disabled:opacity-40"
              onClick={() => void search.fetchNextPage()}
            >
              Load more
            </button>
          )}
      </ScrollArea>
    </div>
  );
};
