'use client';

import { useAtom, useAtomValue } from 'jotai';
import { Plus } from 'lucide-react';
import { type CSSProperties, lazy, Suspense, useEffect, useState } from 'react';
import { searchTargetRankAtom } from '@/app/_atoms/tierlist/search.atoms';
import { rankDetailsAtom } from '@/app/_atoms/tierlist/settings.atoms';
import type { TierRank } from '@/app/_types/tierlist.types';

const TierRowSearchPopup = lazy(async () => ({
  default: (await import('./tier-row-search-popup')).TierRowSearchPopup,
}));

type TierRowSearchProps = {
  rank: TierRank;
  position?: Pick<CSSProperties, 'left' | 'top'>;
};

export const TierRowSearch = ({ rank, position }: TierRowSearchProps) => {
  const [target, setTarget] = useAtom(searchTargetRankAtom);
  const details = useAtomValue(rankDetailsAtom);
  const [hasOpened, setHasOpened] = useState(false);
  const label = details[rank]?.label ?? rank;
  const triggerClass =
    'pointer-events-none absolute left-1 top-1/2 z-20 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center text-muted-foreground/60 opacity-0 transition-opacity hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 group-hover/row:pointer-events-auto group-hover/row:opacity-100 group-has-focus-visible/row:pointer-events-auto group-has-focus-visible/row:opacity-100 pointer-coarse:size-11 pointer-coarse:group-focus-within/row:pointer-events-auto pointer-coarse:group-focus-within/row:opacity-100 data-popup-open:pointer-events-auto data-popup-open:opacity-100 in-data-compact-auto:hidden';

  if (target === rank && !hasOpened) {
    setHasOpened(true);
  }

  useEffect(
    () => () => {
      setTarget((current) => (current === rank ? null : current));
    },
    [rank, setTarget],
  );

  const trigger = (
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

  return hasOpened ? (
    <Suspense fallback={trigger}>
      <TierRowSearchPopup
        rank={rank}
        label={label}
        position={position}
        triggerClass={triggerClass}
      />
    </Suspense>
  ) : (
    trigger
  );
};
