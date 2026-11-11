import { cn } from 'cn';
import { useAtomValue } from 'jotai';
import { motion } from 'motion/react';
import { type CSSProperties, lazy, Suspense } from 'react';
import {
  draggedRankAtom,
  rankOffsetsAtom,
} from '@/app/_atoms/tierlist/layout.atoms';
import { tierColorClasses, tierColors } from '@/app/_lib/tier-colors';
import { getRankOffset } from '@/app/_lib/tier-rank-drag';
import type { TierRank } from '@/app/_types/tierlist.types';
import { TierRowSearch } from './tier-row-search';

const TierRankLabel = lazy(async () => ({
  default: (await import('./tier-rank-label')).TierRankLabel,
}));

type TierRowProps = {
  rank: TierRank;
  active?: boolean;
  itemCount?: number;
  skeletonCount?: number;
  fixedItemSize?: boolean;
  lines?: number;
  searchPosition?: Pick<CSSProperties, 'left' | 'top'>;
};

export const TierRow = ({
  rank,
  active = false,
  itemCount = 0,
  skeletonCount,
  fixedItemSize = false,
  lines = 1,
  searchPosition,
}: TierRowProps) => {
  const offsets = useAtomValue(rankOffsetsAtom);
  const dragged = useAtomValue(draggedRankAtom) === rank;
  const placeholder = (
    <div
      className={cn(
        'relative flex aspect-square self-start items-center justify-center border-r border-ink p-2 text-graphite',
        tierColorClasses[tierColors[rank] ?? 'stone'],
        rank.length > 4
          ? 'text-[clamp(0.875rem,calc(var(--tier-size,6rem)*0.1),1.25rem)]'
          : 'text-[clamp(1rem,calc(var(--tier-size,6rem)*0.15),1.75rem)]',
      )}
    >
      <span className="min-w-0 w-full p-1 text-center leading-tight">
        {rank}
      </span>
    </div>
  );

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
      {skeletonCount !== undefined ? (
        placeholder
      ) : (
        <Suspense fallback={placeholder}>
          <TierRankLabel rank={rank} />
        </Suspense>
      )}

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
        {skeletonCount !== undefined && (
          <div
            aria-hidden="true"
            className="flex gap-0.5 overflow-hidden p-0.5 motion-safe:animate-pulse"
            style={{ height: 'var(--tier-item-size, 7rem)' }}
          >
            {Array.from(
              { length: skeletonCount },
              (_, index) => `placeholder-${index}`,
            ).map((id, index) => (
              <div
                key={id}
                data-tier-item-skeleton=""
                className="h-full shrink-0 bg-white/10"
                style={{ aspectRatio: ['2 / 3', '3 / 4', '5 / 7'][index % 3] }}
              />
            ))}
          </div>
        )}
        {fixedItemSize &&
          Array.from({ length: lines }, (_, index) => `slot-${index}`).map(
            (slot) => <span key={slot} aria-hidden="true" />,
          )}

        {skeletonCount === undefined && (
          <TierRowSearch rank={rank} position={searchPosition} />
        )}
      </div>
    </motion.li>
  );
};
