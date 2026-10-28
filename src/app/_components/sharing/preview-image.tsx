'use client';

import Image from 'next/image';
import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { preload } from 'react-dom';
import { TierlistFind } from '@/app/_components/tier-board/tierlist-find';
import { usePreviewPosters } from '@/app/_hooks/use-preview-posters';
import { useTitleColors } from '@/app/_hooks/use-title-colors';
import { posterCrossOrigin } from '@/app/_lib/poster-cross-origin';
import { watchPreviewClipboard } from '@/app/_lib/preview-clipboard';
import { matchesTierItemLabel } from '@/app/_lib/tier-item-label';
import type { ExportRow } from '@/app/_lib/tierlist-export-layout';
import type { TierImageMode } from '@/app/_types/tierlist.types';
import { PreviewBoardSurface } from './preview-board-surface';
import { PreviewDisplacement } from './preview-displacement';

// Only decoded public PNG URLs are remembered, never account data or poster blobs.
const decodedPreviews = new Set<string>();

type PreviewImageProps = {
  id: string;
  width: number;
  height: number;
  rows: ExportRow[];
  mode: TierImageMode;
};

export const PreviewImage = ({
  id,
  width,
  height,
  rows,
  mode,
}: PreviewImageProps) => {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>(() =>
    decodedPreviews.has(id) ? 'ready' : 'loading',
  );
  const root = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const posters = rows.flatMap((row) => row.posters);
  const visible = usePreviewPosters(root, posters, width, height);
  const colors = useTitleColors(
    visible.map((poster) => poster.item),
    mode,
  );
  const displayRows = rows.map((row) => ({
    ...row,
    posters: row.posters.map((poster) => {
      const color = colors.get(poster.item.id);
      return color && poster.item.title
        ? {
            ...poster,
            item: { ...poster.item, title: { ...poster.item.title, color } },
          }
        : poster;
    }),
  }));
  const visibleIds = new Set(visible.map((poster) => poster.item.id));
  const matches = posters.filter((poster) =>
    matchesTierItemLabel(poster.item, deferredQuery),
  );
  const matchingIds = new Set(matches.map((poster) => poster.item.id));
  const source = `/api/tierlist-preview/${id}/image`;
  const imageSource = source;
  const firstPoster = visible.reduce<(typeof visible)[number] | undefined>(
    (largest, poster) =>
      !largest || poster.width * poster.height > largest.width * largest.height
        ? poster
        : largest,
    undefined,
  );
  if (state !== 'ready' && firstPoster?.item.image) {
    preload(firstPoster.item.image.src, {
      as: 'image',
      fetchPriority: 'high',
      crossOrigin: posterCrossOrigin(firstPoster.item.image.src),
    });
  }

  useEffect(() => {
    return watchPreviewClipboard();
  }, []);

  return (
    <div
      ref={root}
      className="relative"
      style={{ minWidth: Math.max(640, width / 2) }}
    >
      {state !== 'ready' && (
        <PreviewBoardSurface
          rows={displayRows}
          width={width}
          height={height}
          mode={mode}
          visibleIds={visibleIds}
          clipPrefix={`live-${id}-`}
        />
      )}

      <Image
        src={imageSource}
        alt="Shared anime tierlist"
        width={width}
        height={height}
        unoptimized
        loading="eager"
        fetchPriority="low"
        onLoad={() => {
          decodedPreviews.add(id);
          if (decodedPreviews.size > 32) {
            const oldest = decodedPreviews.values().next().value;
            if (oldest) {
              decodedPreviews.delete(oldest);
            }
          }
          setState('ready');
        }}
        onError={() => setState('error')}
        className={`block h-auto w-full ${state === 'ready' ? 'opacity-100' : 'pointer-events-none absolute inset-0 opacity-0'}`}
      />

      <PreviewDisplacement
        id={id}
        source={state === 'ready' ? imageSource : undefined}
        mode={mode}
        visible={visible}
        width={width}
        height={height}
        rows={displayRows}
      />

      <TierlistFind
        query={query}
        onQueryChange={setQuery}
        count={matches.length}
      />

      {deferredQuery.trim() && (
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${width} ${height}`}
          className="pointer-events-none absolute inset-0 size-full"
        >
          {posters.map((poster) => (
            <rect
              key={poster.item.id}
              x={poster.x}
              y={poster.y}
              width={poster.width}
              height={poster.height}
              fill={matchingIds.has(poster.item.id) ? 'transparent' : '#000000'}
              fillOpacity={matchingIds.has(poster.item.id) ? 0 : 0.78}
              stroke={matchingIds.has(poster.item.id) ? '#ffffff' : 'none'}
              strokeWidth={2}
              data-preview-match={
                matchingIds.has(poster.item.id) ? 'true' : 'false'
              }
            />
          ))}
        </svg>
      )}
    </div>
  );
};
