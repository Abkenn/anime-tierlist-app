'use client';

import { Popover } from '@base-ui/react/popover';
import { QueryClientProvider } from '@tanstack/react-query';
import { useAtom, useAtomValue } from 'jotai';
import { Plus } from 'lucide-react';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
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
  const [hasOpened, setHasOpened] = useState(false);
  const label = details[rank]?.label ?? rank;
  const triggerClass =
    'pointer-events-none absolute left-1 top-1/2 z-20 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center text-muted-foreground/60 opacity-0 transition-opacity hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 group-hover/row:pointer-events-auto group-hover/row:opacity-100 group-has-focus-visible/row:pointer-events-auto group-has-focus-visible/row:opacity-100 pointer-coarse:group-focus-within/row:pointer-events-auto pointer-coarse:group-focus-within/row:opacity-100 data-popup-open:pointer-events-auto data-popup-open:opacity-100';

  if (target === rank && !hasOpened) {
    setHasOpened(true);
  }

  useEffect(
    () => () => {
      setTarget((current) => (current === rank ? null : current));
    },
    [rank, setTarget],
  );

  if (!hasOpened) {
    return (
      <button
        type="button"
        aria-label={`Add anime to ${label}`}
        title={`Add anime to ${label}`}
        aria-haspopup="dialog"
        aria-expanded={false}
        style={position}
        className={triggerClass}
        onClick={() => setTarget(rank)}
      >
        <Plus aria-hidden="true" className="size-3.5" />
      </button>
    );
  }

  return (
    <Popover.Root
      open={target === rank}
      onOpenChange={(open) => setTarget(open ? rank : null)}
    >
      <Popover.Trigger
        aria-label={`Add anime to ${label}`}
        title={`Add anime to ${label}`}
        style={position}
        className={triggerClass}
      >
        <Plus aria-hidden="true" className="size-3.5" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="start"
          positionMethod="fixed"
          collisionAvoidance={{ side: 'flip', align: 'shift' }}
          sideOffset={8}
          collisionPadding={12}
          className="z-50"
        >
          <Popover.Popup
            aria-label={`Add anime to ${label}`}
            initialFocus={input}
            className="flex min-h-0 w-80 max-w-[calc(100vw-1.5rem)] flex-col gap-3 rounded-xs border border-divider bg-popover p-3 text-popover-foreground shadow-lg has-data-search-result:h-[min(26rem,var(--available-height))]"
          >
            <Popover.Title className="px-1 text-xs font-medium text-muted-foreground">
              Add to {label}
            </Popover.Title>

            <QueryClientProvider client={client}>
              <AnimeSearchResults inline inputRef={input} />
            </QueryClientProvider>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
};
