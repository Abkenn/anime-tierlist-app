import { cn } from 'cn';
import { ViewTransition } from 'react';
import { TierRow } from '@/app/_components/tierlist/tier-row';
import type { useTierItems } from '@/app/_hooks/use-tier-items';
import type { TierColor, TierRank } from '@/app/_types/tierlist.types';

type TierBoardRowsProps = {
  ranks: TierRank[];
  layout: 'single-line' | 'two-line';
  interaction: Pick<
    ReturnType<typeof useTierItems>,
    'items' | 'targetRank' | 'visibleRank' | 'lines'
  >;
};

const tierColors: Record<TierRank, TierColor> = {
  'S+': 'orchid',
  S: 'rose',
  'S−': 'salmon',
  'A+': 'apricot',
  A: 'gold',
  'A−': 'yellow',
  'B+': 'citron',
  B: 'chartreuse',
  'B−': 'lime',
  'C+': 'leaf',
  C: 'mint',
  'C−': 'jade',
  'D+': 'seafoam',
  D: 'aqua',
  'D−': 'sky',
  'F+': 'azure',
  F: 'periwinkle',
  'F−': 'lavender',
  Dropped: 'wisteria',
  Watching: 'stone',
};

export const TierBoardRows = ({
  ranks,
  layout,
  interaction,
}: TierBoardRowsProps) => (
  <ViewTransition default="none" enter="preview-change" exit="preview-change">
    <ol
      className={cn(
        'grid overflow-hidden border border-ink bg-charcoal text-cloud',
        layout === 'two-line' ? 'auto-rows-auto' : 'auto-rows-fr',
      )}
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
    </ol>
  </ViewTransition>
);
