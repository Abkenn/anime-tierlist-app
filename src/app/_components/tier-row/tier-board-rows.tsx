'use client';

import { useAtomValue } from 'jotai';
import { motion } from 'motion/react';
import { useLayoutEffect, useRef, useState, ViewTransition } from 'react';
import {
  imageModeAtom,
  posterSizeAtom,
} from '@/app/_atoms/tierlist/settings.atoms';
import type { useTierItems } from '@/app/_hooks/use-tier-items';
import { getPosterSize } from '@/app/_lib/poster-size';
import { tierColors } from '@/app/_lib/tier-colors';
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
  const mode = useAtomValue(posterSizeAtom);
  const imageMode = useAtomValue(imageModeAtom);
  const element = useRef<HTMLOListElement>(null);
  const [width, setWidth] = useState(1000);
  const size = getPosterSize({
    mode,
    imageMode,
    items: interaction.items,
    width,
  });

  useLayoutEffect(() => {
    const board = element.current;
    if (!board) {
      return;
    }
    const measure = () =>
      setWidth(board.parentElement?.clientWidth ?? board.clientWidth);
    const observer = new ResizeObserver(measure);
    observer.observe(board.parentElement ?? board);
    measure();

    return () => observer.disconnect();
  }, []);

  return (
    <ViewTransition default="none" enter="preview-change" exit="preview-change">
      <motion.ol
        ref={element}
        initial={false}
        animate={{ '--tier-base-size': `${size}rem` }}
        transition={{ duration: 0 }}
        className="grid auto-rows-auto overflow-hidden border border-ink bg-charcoal text-cloud [--tier-size:var(--tier-base-size,7rem)] [--tier-item-size:var(--tier-base-size,7rem)]"
        aria-label="Ranked tiers"
      >
        {ranks.map((rank) => (
          <TierRow
            key={rank}
            rank={rank}
            color={tierColors[rank] ?? 'stone'}
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
