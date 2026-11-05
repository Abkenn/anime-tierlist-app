'use client';

import { cn } from 'cn';
import { useAtomValue } from 'jotai';
import { useHydrateAtoms } from 'jotai/utils';
import { motion } from 'motion/react';
import { useContext } from 'react';
import { keyboardModeAtom } from '@/app/_atoms/tierlist/interaction.atoms';
import { enabledTierRanksAtom } from '@/app/_atoms/tierlist/settings.atoms';
import { TerminalText } from '@/app/_components/shell/terminal-text';
import { TierBoardRows } from '@/app/_components/tier-row/tier-board-rows';
import { TierBoardToolbar } from '@/app/_components/tier-settings/tier-board-toolbar';
import { useTierImageMode } from '@/app/_hooks/use-tier-image-mode';
import { useTierItems } from '@/app/_hooks/use-tier-items';
import { TierlistRestorationContext } from '@/app/_lib/tierlist-restoration-context';
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

  const restoring = useContext(TierlistRestorationContext);
  const ranks = useAtomValue(enabledTierRanksAtom);
  const keyboardMode = useAtomValue(keyboardModeAtom);
  const { imageMode, changeImageMode } = useTierImageMode({
    value: controlledImageMode,
    onChange: onImageModeChange,
  });

  const interaction = useTierItems({
    restoring,
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

      <TierBoardToolbar
        rankCount={ranks.length}
        itemCount={interaction.items.length}
        restoring={restoring}
        keyboardMode={keyboardMode}
        imageMode={imageMode}
        onImageModeChange={changeImageMode}
      />

      <TierViewport ref={interaction.viewportRef} scrollable={scrollable}>
        {restoring && (
          <p role="status" className="sr-only">
            <TerminalText text="Restoring tierlist..." />
          </p>
        )}

        <motion.div
          ref={interaction.boardRef}
          data-tier-canvas=""
          animate={scrollable ? { width: interaction.canvasWidth } : undefined}
          transition={{ duration: 0 }}
          className={cn('relative', scrollable && 'min-w-full')}
          aria-busy={restoring}
          inert={restoring}
        >
          {!restoring && <TierBoardItems interaction={interaction} />}

          <TierBoardRows
            ranks={ranks}
            layout={layout}
            interaction={interaction}
            restoring={restoring}
          />
        </motion.div>
      </TierViewport>
    </section>
  );
};
