'use client';

import { cn } from 'cn';
import { useAtomValue } from 'jotai';
import { motion } from 'motion/react';
import { startTransition, useId, useState } from 'react';
import { keyboardModeAtom } from '@/app/_atoms/tierlist/interaction.atoms';
import { TierBoardItems } from '@/app/_components/tierlist/tier-board-items';
import { TierBoardRows } from '@/app/_components/tierlist/tier-board-rows';
import { TierBoardToolbar } from '@/app/_components/tierlist/tier-board-toolbar';
import { TierRankOptions } from '@/app/_components/tierlist/tier-rank-options';
import { TierViewport } from '@/app/_components/tierlist/tier-viewport';
import { useTierImageMode } from '@/app/_hooks/use-tier-image-mode';
import { useTierItems } from '@/app/_hooks/use-tier-items';
import { defaultTierRanks, tierRanks } from '@/app/_lib/tier-ranks';
import type {
  TierImageMode,
  TierItemData,
  TierRank,
} from '@/app/_types/tierlist.types';

type TierBoardProps = {
  ranks?: TierRank[];
  initialItemCount?: number;
  initialItems?: TierItemData[];
  imageMode?: TierImageMode;
  onImageModeChange?: (mode: TierImageMode) => void;
  layout?: 'single-line' | 'two-line';
  onRanksChange?: (ranks: TierRank[]) => void;
};

export const TierBoard = ({
  ranks: controlledRanks,
  onRanksChange,
  initialItemCount = 2,
  layout = 'single-line',
  initialItems,
  imageMode: controlledImageMode,
  onImageModeChange,
}: TierBoardProps = {}) => {
  const optionsId = useId();
  const [localRanks, setLocalRanks] = useState(defaultTierRanks);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const keyboardMode = useAtomValue(keyboardModeAtom);
  const { imageMode, changeImageMode } = useTierImageMode({
    value: controlledImageMode,
    onChange: onImageModeChange,
  });

  const scrollable = layout === 'two-line' || Boolean(initialItems?.length);
  const enabledRanks = controlledRanks ?? localRanks;
  const ranks = tierRanks.filter((rank) => enabledRanks.includes(rank));

  const interaction = useTierItems({
    ranks,
    initialItemCount,
    wrapItems: layout === 'two-line',
    initialItems,
    imageMode,
  });

  const toggleVariant = (rank: TierRank) => {
    const nextRanks = enabledRanks.includes(rank)
      ? enabledRanks.filter((value) => value !== rank)
      : [...enabledRanks, rank];

    startTransition(() => {
      if (controlledRanks === undefined) {
        setLocalRanks(nextRanks);
      }

      onRanksChange?.(nextRanks);
    });
  };

  return (
    <section aria-label="Anime tierlist" className="mt-1">
      <TierBoardToolbar
        rankCount={ranks.length}
        itemCount={interaction.items.length}
        keyboardMode={keyboardMode}
        settingsOpen={settingsOpen}
        optionsId={optionsId}
        imageMode={imageMode}
        onToggleOptions={() => setSettingsOpen((open) => !open)}
        onImageModeChange={changeImageMode}
      />

      <TierRankOptions
        id={optionsId}
        open={settingsOpen}
        enabledRanks={enabledRanks}
        onToggle={toggleVariant}
      />

      <TierViewport ref={interaction.viewportRef} scrollable={scrollable}>
        <motion.div
          ref={interaction.boardRef}
          animate={scrollable ? { width: interaction.canvasWidth } : undefined}
          transition={{ duration: 0 }}
          className={cn('relative', scrollable && 'min-w-full')}
        >
          <TierBoardRows
            ranks={ranks}
            layout={layout}
            interaction={interaction}
          />

          <TierBoardItems interaction={interaction} />
        </motion.div>
      </TierViewport>
    </section>
  );
};
