'use client';

import { cn } from 'cn';
import { useAtomValue } from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';
import { motion } from 'motion/react';
import { keyboardModeAtom } from '@/app/_atoms/tierlist/interaction.atoms';
import { enabledTierRanksAtom } from '@/app/_atoms/tierlist/settings.atoms';
import { TierItemLabelEditor } from '@/app/_components/tier-item/tier-item-label-editor';
import { TierBoardRows } from '@/app/_components/tier-row/tier-board-rows';
import { TierBoardToolbar } from '@/app/_components/tier-settings/tier-board-toolbar';
import { useTierImageMode } from '@/app/_hooks/use-tier-image-mode';
import { useTierItems } from '@/app/_hooks/use-tier-items';
import type {
  TierImageMode,
  TierItemData,
  TierRank,
} from '@/app/_types/tierlist.types';
import { TierBoardFind } from './tier-board-find';
import { TierBoardItems } from './tier-board-items';
import { TierViewport } from './tier-viewport';

type TierBoardProps = {
  ranks?: TierRank[];
  initialItemCount?: number;
  initialItems?: TierItemData[];
  imageMode?: TierImageMode;
  onImageModeChange?: (mode: TierImageMode) => void;
  layout?: 'single-line' | 'two-line';
};

export const TierBoard = ({
  ranks: initialRanks,
  initialItemCount = 2,
  layout = 'single-line',
  initialItems,
  imageMode: controlledImageMode,
  onImageModeChange,
}: TierBoardProps = {}) => {
  useHydrateAtoms(
    new Map(initialRanks ? [[enabledTierRanksAtom, initialRanks]] : []),
  );

  const ranks = useAtomValue(enabledTierRanksAtom);
  const keyboardMode = useAtomValue(keyboardModeAtom);
  const { imageMode, changeImageMode } = useTierImageMode({
    value: controlledImageMode,
    onChange: onImageModeChange,
  });

  const interaction = useTierItems({
    ranks,
    initialItemCount,
    wrapItems: layout === 'two-line',
    initialItems,
    imageMode,
  });

  const scrollable =
    layout === 'two-line' ||
    initialItemCount === 0 ||
    initialItems !== undefined;

  return (
    <section
      aria-label="Anime tierlist"
      className="flex min-h-0 min-w-0 flex-1 flex-col"
    >
      <TierBoardFind />

      <TierItemLabelEditor />

      <TierBoardToolbar
        rankCount={ranks.length}
        itemCount={interaction.items.length}
        keyboardMode={keyboardMode}
        imageMode={imageMode}
        onImageModeChange={changeImageMode}
      />

      <TierViewport ref={interaction.viewportRef} scrollable={scrollable}>
        <motion.div
          ref={interaction.boardRef}
          animate={scrollable ? { width: interaction.canvasWidth } : undefined}
          transition={{ duration: 0 }}
          className={cn('relative', scrollable && 'min-w-full')}
        >
          <TierBoardItems interaction={interaction} />

          <TierBoardRows
            ranks={ranks}
            layout={layout}
            interaction={interaction}
          />
        </motion.div>
      </TierViewport>
    </section>
  );
};
