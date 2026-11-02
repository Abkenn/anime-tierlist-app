'use client';

import { useAtomValue, useSetAtom } from 'jotai';
import { cancelFrame, frame } from 'motion/react';
import { useLayoutEffect, useRef, useState, ViewTransition } from 'react';
import {
  draggedRankAtom,
  rankOffsetsAtom,
} from '@/app/_atoms/tierlist/layout.atoms';
import {
  imageModeAtom,
  posterSizeAtom,
} from '@/app/_atoms/tierlist/settings.atoms';
import type { useTierItems } from '@/app/_hooks/use-tier-items';
import {
  getAutoPosterWidth,
  getPosterSize,
  stabilizePosterWidth,
} from '@/app/_lib/poster-size';
import type { TierRank } from '@/app/_types/tierlist.types';
import { TierRow } from './tier-row';

type TierBoardRowsProps = {
  ranks: TierRank[];
  layout: 'single-line' | 'two-line';
  restoring?: boolean;
  interaction: Pick<
    ReturnType<typeof useTierItems>,
    'items' | 'targetRank' | 'visibleRank' | 'lines' | 'searchPosition'
  >;
};

export const TierBoardRows = ({
  ranks,
  layout,
  interaction,
  restoring = false,
}: TierBoardRowsProps) => {
  const mode = useAtomValue(posterSizeAtom);
  const imageMode = useAtomValue(imageModeAtom);
  const offsets = useAtomValue(rankOffsetsAtom);
  const draggedRank = useAtomValue(draggedRankAtom);
  const setDraggedRank = useSetAtom(draggedRankAtom);
  const rankKey = ranks.join();
  const middleRank = (ranks.length - 1) / 2;
  const skeletonDeviation = Math.max(1, ranks.length / 5);
  const previousOrder = useRef(rankKey);
  const currentWidth = getAutoPosterWidth({
    imageMode,
    items: interaction.items,
  });
  const [autoFit, setAutoFit] = useState({
    mode,
    imageMode,
    restoring,
    width: currentWidth,
  });
  const autoWidth =
    autoFit.mode !== mode ||
    autoFit.imageMode !== imageMode ||
    autoFit.restoring !== restoring
      ? currentWidth
      : stabilizePosterWidth(autoFit.width, currentWidth);
  if (
    autoFit.mode !== mode ||
    autoFit.imageMode !== imageMode ||
    autoFit.restoring !== restoring ||
    autoFit.width !== autoWidth
  ) {
    setAutoFit({ mode, imageMode, restoring, width: autoWidth });
  }
  const size = getPosterSize({
    mode: restoring ? 'small' : mode,
    imageMode,
    items: interaction.items,
    autoWidth,
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
        {ranks.map((rank, index) => (
          <TierRow
            key={rank}
            rank={rank}
            active={interaction.targetRank === rank}
            fixedItemSize={layout === 'two-line' && !restoring}
            skeletonCount={
              restoring
                ? Math.max(
                    1,
                    Math.round(
                      8 *
                        Math.exp(
                          -0.5 *
                            ((index - middleRank) / skeletonDeviation) ** 2,
                        ),
                    ),
                  )
                : undefined
            }
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
