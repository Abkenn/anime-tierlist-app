'use client';

import { useAtomValue, useSetAtom } from 'jotai';
import { cancelFrame, frame } from 'motion/react';
import { useLayoutEffect, useRef, ViewTransition } from 'react';
import {
  draggedRankAtom,
  rankOffsetsAtom,
} from '@/app/_atoms/tierlist/layout.atoms';
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
    'items' | 'targetRank' | 'visibleRank' | 'lines' | 'searchPosition'
  >;
};

export const TierBoardRows = ({
  ranks,
  layout,
  interaction,
}: TierBoardRowsProps) => {
  const mode = useAtomValue(posterSizeAtom);
  const imageMode = useAtomValue(imageModeAtom);
  const offsets = useAtomValue(rankOffsetsAtom);
  const draggedRank = useAtomValue(draggedRankAtom);
  const setDraggedRank = useSetAtom(draggedRankAtom);
  const rankKey = ranks.join();
  const previousOrder = useRef(rankKey);
  const size = getPosterSize({
    mode,
    imageMode,
    items: interaction.items,
  });

  useLayoutEffect(() => {
    const reordered = previousOrder.current !== rankKey;
    previousOrder.current = rankKey;
    if (rankKey && (reordered || draggedRank === null)) {
      offsets.forEach((offset) => {
        offset.jump(0);
      });
    }

    if (reordered && draggedRank !== null) {
      // Keep poster positions instant until the new row layout has rendered.
      const finish = () => setDraggedRank(null);
      frame.postRender(finish);

      return () => cancelFrame(finish);
    }
  }, [rankKey, draggedRank, offsets, setDraggedRank]);

  return (
    <ViewTransition default="none" enter="preview-change" exit="preview-change">
      <ol
        style={{ '--tier-base-size': size } as React.CSSProperties}
        className="grid auto-rows-auto overflow-hidden border border-ink bg-charcoal text-cloud [--tier-max-size:10rem] max-sm:[--tier-max-size:7rem] [--tier-size:var(--tier-base-size,7rem)] [--tier-item-size:var(--tier-base-size,7rem)]"
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
            searchPosition={interaction.searchPosition(rank)}
            itemCount={
              interaction.items.filter(
                (item) => interaction.visibleRank(item) === rank,
              ).length
            }
          />
        ))}
      </ol>
    </ViewTransition>
  );
};
