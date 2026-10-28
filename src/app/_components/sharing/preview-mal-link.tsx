'use client';

import { ExternalLink } from 'lucide-react';
import { type CSSProperties, useState } from 'react';
import { usePromiseValue } from '@/app/_hooks/use-promise-value';
import {
  knownMalId,
  malLookupQueries,
  normalizeMalTitle,
} from '@/app/_lib/mal-anime';
import { getTierItemLabel } from '@/app/_lib/tier-item-label';
import { resolveMalLink } from '@/app/_services/mal-anime.actions';
import type { TierItemData } from '@/app/_types/tierlist.types';

type Resolution = { id: number | null };
const unavailable: Resolution = { id: null };
const requests = new Map<
  string,
  { expires: number; task: Promise<Resolution> }
>();
const lookup = (queries: string[]) => {
  const key = JSON.stringify(queries.map(normalizeMalTitle));
  const cached = requests.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.task;
  }
  const task = (async () => ({ id: await resolveMalLink(queries) }))();
  requests.set(key, { expires: Date.now() + 300_000, task });
  if (requests.size > 512) {
    const oldest = requests.keys().next().value;
    if (oldest) {
      requests.delete(oldest);
    }
  }
  return task;
};

type PreviewMalLinkProps = { item: TierItemData; style: CSSProperties };
export const PreviewMalLink = ({ item, style }: PreviewMalLinkProps) => {
  const [request, setRequest] = useState<Promise<Resolution>>();
  const resolution = usePromiseValue(request, unavailable);
  const known = knownMalId(item);
  const id = known ?? resolution?.id;
  const queries = malLookupQueries(item);
  const pending = !known && request && !resolution;
  const unknownLabel = pending
    ? 'Looking up MAL link...'
    : 'Unknown MAL link. Please add label';
  const label = id
    ? `Open ${getTierItemLabel(item)} on MyAnimeList`
    : unknownLabel;
  const load = () => {
    if (!known && queries.length) {
      setRequest(lookup(queries));
    }
  };
  const className =
    'absolute right-1 top-1 flex size-7 max-w-full items-center justify-center border border-foreground/20 bg-background/85 text-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 hover:bg-background pointer-coarse:opacity-100';

  return (
    <div
      className="group pointer-events-auto absolute"
      style={style}
      onPointerEnter={load}
      onFocusCapture={load}
    >
      <a
        data-preview-mal=""
        href={id ? `https://myanimelist.net/anime/${id}` : undefined}
        role={id ? undefined : 'link'}
        tabIndex={0}
        aria-disabled={!id}
        target="_blank"
        rel="noopener noreferrer"
        draggable={false}
        title={label}
        aria-label={label}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          if (!id) {
            event.preventDefault();
          }
        }}
        className={`${className} aria-disabled:cursor-default aria-disabled:text-muted-foreground`}
      >
        <ExternalLink aria-hidden="true" className="size-3.5" />
      </a>
    </div>
  );
};
