import { cn } from 'cn';
import { useAtomValue } from 'jotai';
import { motion } from 'motion/react';
import type { CSSProperties } from 'react';
import {
  draggedRankAtom,
  rankOffsetsAtom,
} from '@/app/_atoms/tierlist/layout.atoms';
import { getRankOffset } from '@/app/_lib/tier-rank-drag';
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
}: TierRowProps) => {
  const offsets = useAtomValue(rankOffsetsAtom);
  const dragged = useAtomValue(draggedRankAtom) === rank;

  return (
    <motion.li
      style={{
        y: getRankOffset(offsets, rank),
        zIndex: dragged ? 30 : undefined,
      }}
      animate={{
        boxShadow: dragged
          ? '0 8px 24px rgb(0 0 0 / 0.3)'
          : '0 0 0 rgb(0 0 0 / 0)',
      }}
      className="group/row relative grid grid-cols-[var(--tier-size,5rem)_minmax(0,1fr)] border-ink bg-charcoal not-first:border-t"
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
    </motion.li>
  );
};
