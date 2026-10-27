'use client';

import Image from 'next/image';
import { useDeferredValue, useEffect, useState } from 'react';
import { TerminalText } from '@/app/_components/shell/terminal-text';
import { TierlistFind } from '@/app/_components/tier-board/tierlist-find';
import { Skeleton } from '@/app/_components/ui/skeleton';
import { watchPreviewClipboard } from '@/app/_lib/preview-clipboard';
import { matchesTierItemLabel } from '@/app/_lib/tier-item-label';
import type { ExportPoster } from '@/app/_lib/tierlist-export-layout';

type PreviewImageProps = {
  id: string;
  width: number;
  height: number;
  posters: ExportPoster[];
};

export const PreviewImage = ({
  id,
  width,
  height,
  posters,
}: PreviewImageProps) => {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const matches = posters.filter((poster) =>
    matchesTierItemLabel(poster.item, deferredQuery),
  );
  const matchingIds = new Set(matches.map((poster) => poster.item.id));
  const source = `/api/tierlist-preview/${id}/image`;

  useEffect(() => {
    if (state === 'ready') {
      return watchPreviewClipboard();
    }
  }, [state]);

  return (
    <div className="relative min-w-160" aria-busy={state === 'loading'}>
      <Image
        key={attempt}
        src={attempt ? `${source}?retry=${attempt}` : source}
        alt="Shared anime tierlist"
        width={width}
        height={height}
        unoptimized
        loading="eager"
        fetchPriority="high"
        onLoad={() => setState('ready')}
        onError={() => setState('error')}
        className={`block h-auto w-full ${state === 'ready' ? 'opacity-100' : 'opacity-0'}`}
      />

      <TierlistFind
        query={query}
        onQueryChange={setQuery}
        count={matches.length}
      />

      {state === 'ready' && deferredQuery.trim() && (
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

      {state === 'loading' && (
        <div className="absolute inset-0">
          <Skeleton className="size-full" />
          <p
            role="status"
            className="absolute left-4 top-4 text-xs text-muted-foreground"
          >
            <TerminalText text="Loading tierlist..." />
          </p>
        </div>
      )}

      {state === 'error' && (
        <div className="absolute left-4 top-4 flex items-center gap-4 text-xs">
          <p role="status">The preview image could not load.</p>
          <button
            type="button"
            className="min-h-9 cursor-pointer underline underline-offset-4"
            onClick={() => {
              setState('loading');
              setAttempt((value) => value + 1);
            }}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
};
