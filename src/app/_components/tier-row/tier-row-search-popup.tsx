'use client';

import { Popover } from '@base-ui/react/popover';
import { QueryClientProvider } from '@tanstack/react-query';
import { useAtom, useAtomValue } from 'jotai';
import { Plus } from 'lucide-react';
import { type CSSProperties, useRef } from 'react';
import { animeSearchClientAtom, searchTargetRankAtom } from '@/app/_atoms/tierlist/search.atoms';
import { AnimeSearchResults } from '@/app/_components/anime-search/anime-search-results';
import type { TierRank } from '@/app/_types/tierlist.types';

type TierRowSearchPopupProps = {
  rank: TierRank;
  label: string;
  triggerClass: string;
  position?: Pick<CSSProperties, 'left' | 'top'>;
};

export const TierRowSearchPopup = ({
  rank,
  label,
  triggerClass,
  position,
}: TierRowSearchPopupProps) => {
  const [target, setTarget] = useAtom(searchTargetRankAtom);
  const client = useAtomValue(animeSearchClientAtom);
  const input = useRef<HTMLInputElement>(null);

  return (
    <Popover.Root open={target === rank} onOpenChange={(open) => setTarget(open ? rank : null)}>
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
