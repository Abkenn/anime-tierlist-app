'use client';

import { useAtomValue } from 'jotai';
import { ViewTransition } from 'react';
import { rankDropTargetAtom } from '@/app/_atoms/tierlist/ranks.atoms';
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
  const rankDropTarget = useAtomValue(rankDropTargetAtom);
  const size = getPosterSize({
    mode,
    imageMode,
    items: interaction.items,
  });

  return (
    <ViewTransition default="none" enter="preview-change" exit="preview-change">
      <ol
        style={{ '--tier-base-size': size } as React.CSSProperties}
        className="grid auto-rows-auto overflow-hidden border border-ink bg-charcoal text-cloud [--tier-max-size:11rem] max-sm:[--tier-max-size:7rem] [--tier-size:var(--tier-base-size,7rem)] [--tier-item-size:var(--tier-base-size,7rem)]"
        aria-label="Ranked tiers"
      >
        {ranks.map((rank) => (
          <TierRow
            key={rank}
            rank={rank}
            color={tierColors[rank] ?? 'stone'}
            active={interaction.targetRank === rank || rankDropTarget === rank}
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
