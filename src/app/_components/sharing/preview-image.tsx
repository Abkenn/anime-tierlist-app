'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { preload } from 'react-dom';
import { TierlistFind } from '@/app/_components/tier-board/tierlist-find';
import { usePreviewPosters } from '@/app/_hooks/use-preview-posters';
import { useTitleColors } from '@/app/_hooks/use-title-colors';
import { posterCrossOrigin } from '@/app/_lib/poster-cross-origin';
import { posterDisplaySource } from '@/app/_lib/poster-display-source';
import { watchPreviewClipboard } from '@/app/_lib/preview-clipboard';
import { matchesTierItemLabel } from '@/app/_lib/tier-item-label';
import type { ExportRow } from '@/app/_lib/tierlist-export-layout';
import type { TierImageMode } from '@/app/_types/tierlist.types';
import { PreviewBoardSurface } from './preview-board-surface';
import { PreviewDisplacement } from './preview-displacement';

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
  const root = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [settledSources, setSettledSources] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const deferredQuery = useDeferredValue(query);
  const posters = useMemo(() => rows.flatMap((row) => row.posters), [rows]);
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
  const pendingPosters = visible.filter(
    (poster) => poster.item.image && !settledSources.has(poster.item.image.src),
  );
  const pendingIds = new Set(pendingPosters.map((poster) => poster.item.id));
  const matches = posters.filter((poster) =>
    matchesTierItemLabel(poster.item, deferredQuery),
  );
  const matchingIds = new Set(matches.map((poster) => poster.item.id));
  const priorityPosters =
    rows.find((row) => row.posters.length)?.posters.slice(0, 3) ?? [];
  const priorityIds = new Set(priorityPosters.map((poster) => poster.item.id));
  for (const poster of priorityPosters) {
    if (poster.item.image) {
      preload(posterDisplaySource(poster.item.image.src), {
        as: 'image',
        fetchPriority: 'high',
        crossOrigin: posterCrossOrigin(poster.item.image.src),
      });
    }
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
      <PreviewBoardSurface
        rows={displayRows}
        width={width}
        height={height}
        mode={mode}
        visibleIds={visibleIds}
        priorityIds={priorityIds}
        clipPrefix={`live-${id}-`}
        pendingIds={pendingIds}
        onPosterSettled={(source) => {
          setSettledSources((previous) => {
            if (previous.has(source)) {
              return previous;
            }

            return new Set([...previous, source]);
          });
        }}
      />

      <PreviewDisplacement
        id={id}
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
