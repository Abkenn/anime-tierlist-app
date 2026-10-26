'use client';

import { Popover } from '@base-ui/react/popover';
import { QueryClientProvider } from '@tanstack/react-query';
import { useAtom, useAtomValue } from 'jotai';
import { Plus } from 'lucide-react';
import { type CSSProperties, useEffect, useRef } from 'react';
import {
  animeSearchClientAtom,
  searchTargetRankAtom,
} from '@/app/_atoms/tierlist/search.atoms';
import { rankDetailsAtom } from '@/app/_atoms/tierlist/settings.atoms';
import { AnimeSearchResults } from '@/app/_components/anime-search/anime-search-results';
import type { TierRank } from '@/app/_types/tierlist.types';

type TierRowSearchProps = {
  rank: TierRank;
  position?: Pick<CSSProperties, 'left' | 'top'>;
};

export const TierRowSearch = ({ rank, position }: TierRowSearchProps) => {
  const [target, setTarget] = useAtom(searchTargetRankAtom);
  const details = useAtomValue(rankDetailsAtom);
  const client = useAtomValue(animeSearchClientAtom);
  const input = useRef<HTMLInputElement>(null);
  const label = details[rank]?.label ?? rank;

  useEffect(
    () => () => {
      setTarget((current) => (current === rank ? null : current));
    },
    [rank, setTarget],
  );

  return (
    <Popover.Root
      open={target === rank}
      onOpenChange={(open) => setTarget(open ? rank : null)}
    >
      <Popover.Trigger
        aria-label={`Add anime to ${label}`}
        title={`Add anime to ${label}`}
        style={position}
        className="pointer-events-none absolute left-1 top-1/2 z-20 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center text-muted-foreground/60 opacity-0 transition-opacity hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 group-hover/row:pointer-events-auto group-hover/row:opacity-100 group-has-focus-visible/row:pointer-events-auto group-has-focus-visible/row:opacity-100 pointer-coarse:group-focus-within/row:pointer-events-auto pointer-coarse:group-focus-within/row:opacity-100 data-popup-open:pointer-events-auto data-popup-open:opacity-100"
      >
        <Plus aria-hidden="true" className="size-3.5" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="z-50"
        >
          <Popover.Popup
            aria-label={`Add anime to ${label}`}
            initialFocus={input}
            className="flex min-h-0 w-80 max-w-[calc(100vw-1.5rem)] flex-col rounded-xs bg-popover text-popover-foreground shadow-lg has-data-search-result:h-[min(24rem,var(--available-height))] has-data-search-result:border has-data-search-result:border-divider has-data-search-result:p-2.5"
          >
            <div className="sr-only">
              <Popover.Title>Add to {label}</Popover.Title>
            </div>

            <QueryClientProvider client={client}>
              <AnimeSearchResults inline inputRef={input} />
            </QueryClientProvider>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
};
