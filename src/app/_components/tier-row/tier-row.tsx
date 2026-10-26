import { cn } from 'cn';
import type { CSSProperties } from 'react';
import type { TierColor, TierRank } from '@/app/_types/tierlist.types';
import { TierRankLabel } from './tier-rank-label';
import { TierRowSearch } from './tier-row-search';

type TierRowProps = {
  rank: TierRank;
  color: TierColor;
  active?: boolean;
  itemCount?: number;
  fixedItemSize?: boolean;
  lines?: number;
  searchPosition?: Pick<CSSProperties, 'left' | 'top'>;
};

export const TierRow = ({
  rank,
  color,
  active = false,
  itemCount = 0,
  fixedItemSize = false,
  lines = 1,
  searchPosition,
}: TierRowProps) => (
  <li
    className="group/row grid grid-cols-[var(--tier-size,5rem)_minmax(0,1fr)] border-ink not-first:border-t"
    data-tier-rank={rank}
    data-tier-count={itemCount}
    aria-label={
      itemCount ? `${rank} tier, ${itemCount} items` : `${rank} tier, empty`
    }
  >
    <TierRankLabel rank={rank} color={color} />

    <div
      tabIndex={-1}
      className={cn(
        'relative min-w-0 transition-colors duration-150 motion-reduce:transition-none',
        active && 'bg-white/10 ring-1 ring-inset ring-white/40',
        fixedItemSize && 'grid gap-0.5 p-0.5',
        fixedItemSize &&
          (lines === 2
            ? 'grid-rows-[repeat(2,var(--tier-item-size,4.125rem))]'
            : 'grid-rows-(--tier-item-size,4.125rem)'),
      )}
    >
      {fixedItemSize &&
        Array.from({ length: lines }, (_, index) => `slot-${index}`).map(
          (slot) => <span key={slot} aria-hidden="true" />,
        )}

      <TierRowSearch rank={rank} position={searchPosition} />
    </div>
  </li>
);
