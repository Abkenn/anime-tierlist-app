'use client';

import { motion } from 'motion/react';
import { ViewTransition } from 'react';
import type { useTierItems } from '@/app/_hooks/use-tier-items';
import { tierColors } from '@/app/_lib/tier-colors';
import { getTierDensity } from '@/app/_lib/tier-density';
import type { TierRank } from '@/app/_types/tierlist.types';
import { TierRow } from './tier-row';

type TierBoardRowsProps = {
  ranks: TierRank[];
  layout: 'single-line' | 'two-line';
  interaction: Pick<
    ReturnType<typeof useTierItems>,
    'items' | 'targetRank' | 'visibleRank' | 'lines'
  >;
};

export const TierBoardRows = ({
  ranks,
  layout,
  interaction,
}: TierBoardRowsProps) => {
  const density = getTierDensity(interaction.items.length);

  return (
    <ViewTransition default="none" enter="preview-change" exit="preview-change">
      <motion.ol
        initial={false}
        animate={{ '--tier-density': density }}
        transition={{ duration: 0 }}
        className="grid auto-rows-auto overflow-hidden border border-ink bg-charcoal text-cloud [--tier-base-size:6rem] 2xl:[--tier-base-size:7rem] min-[120rem]:[--tier-base-size:7.5rem] [--tier-size:calc(var(--tier-base-size)*var(--tier-density,1))] [--tier-item-size:calc(5rem*var(--tier-density,1))]"
        aria-label="Ranked tiers"
      >
        {ranks.map((rank) => (
          <TierRow
            key={rank}
            rank={rank}
            color={tierColors[rank]}
            active={interaction.targetRank === rank}
            fixedItemSize={layout === 'two-line'}
            lines={interaction.lines(rank)}
            itemCount={
              interaction.items.filter(
                (item) => interaction.visibleRank(item) === rank,
              ).length
            }
          />
        ))}
      </motion.ol>
    </ViewTransition>
  );
};
