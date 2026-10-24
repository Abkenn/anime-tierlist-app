'use client';

import { useAtomValue } from 'jotai';
import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { importedItemIdsAtom } from '@/app/_atoms/tierlist/items.atoms';
import { animeSearchConfigAtom } from '@/app/_atoms/tierlist/search.atoms';
import { TerminalText } from '@/app/_components/shell/terminal-text';
import { ScrollArea } from '@/app/_components/ui/scroll-area';
import { useAnimeSearch } from '@/app/_hooks/use-anime-search';
import { useSearchDisplacement } from '@/app/_hooks/use-search-displacement';
import { imageSuitability, normalizeAnimeQuery } from '@/app/_lib/anime-search';
import { tierlistErrorMessage } from '@/app/_lib/tierlist-error';
import type { AnimeSearchResult } from '@/app/_types/anime-search.types';
import type { TierImage } from '@/app/_types/tierlist.types';
import { AnimeSearchResultCard } from './anime-search-result';

export const AnimeSearchResults = () => {
  const {
    curatedImages,
    initialQuery = '',
    initialPage,
  } = useAtomValue(animeSearchConfigAtom);
  const imported = useAtomValue(importedItemIdsAtom);
  const [input, setInput] = useState(initialQuery);
  const [dimensions, setDimensions] = useState<
    Record<string, TierImage | null>
  >({});
  const { search, sentinel, query, url, urlError, waiting } = useAnimeSearch(
    input,
    { initialQuery, initialPage },
  );
  const curated =
    query.length >= 2 && !url && !urlError
      ? curatedImages.filter((image) =>
          image.keywords.some(
            (keyword) =>
              normalizeAnimeQuery(keyword).includes(query) ||
              query.includes(normalizeAnimeQuery(keyword)),
          ),
        )
      : [];
  const provider = (search.data?.pages ?? []).flatMap((page) =>
    [...page.items]
      .filter((item) => !curated.some((custom) => custom.id === item.id))
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
    : [...curated, ...provider];

  const reducedMotion = useReducedMotion();
  const visibleResults = results.filter(
    (result, index, all) =>
      !imported.has(result.id) &&
      all.findIndex((entry) => entry.id === result.id) === index,
  );
  const displacement = useSearchDisplacement(visibleResults);
  const loadingImages = visibleResults.some(
    (result) => !result.image && !Object.hasOwn(dimensions, result.id),
  );

  const pageFor = (id: string) => {
    if (curated.some((item) => item.id === id)) {
      return 'curated';
    }

    return String(
      search.data?.pages.findIndex((page) =>
        page.items.some((item) => item.id === id),
      ) ?? -1,
    );
  };

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
    <div className="lg:flex lg:min-h-0 lg:flex-col">
      <label className="block text-xs text-muted-foreground">
        Find anime or paste an image URL
        <input
          type="search"
          value={input}
          maxLength={2048}
          placeholder="Search anime…"
          className="mt-2 min-h-11 w-full border border-divider bg-background px-3 text-sm text-foreground outline-none focus-visible:border-foreground"
          onChange={(event) => setInput(event.currentTarget.value)}
        />
      </label>

      <p className="my-2 text-xs text-muted-foreground">
        Drag to a rank · Click to add to Watching
      </p>

      <ScrollArea
        className="lg:min-h-0 lg:flex-1"
        viewportProps={{
          className: 'max-h-64 overscroll-contain pr-3 lg:max-h-none',
        }}
        aria-busy={waiting || search.isFetching || loadingImages}
      >
        <div
          ref={displacement.gridRef}
          className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] items-center gap-0.5 lg:grid-cols-3"
        >
          {!waiting &&
            !urlError &&
            displacement.results.map((result) => (
              <motion.div
                key={result.id}
                layout="position"
                className={
                  displacement.draggedId === result.id
                    ? 'outline outline-1 -outline-offset-1 outline-dashed outline-divider'
                    : undefined
                }
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

        {!url && search.hasNextPage && (
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
