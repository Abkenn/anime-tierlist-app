'use client';

import { cn } from 'cn';
import { motion } from 'motion/react';
import { startTransition, useId, useState, ViewTransition } from 'react';
import { TierItem } from '@/app/_components/tierlist/tier-item';
import { TierRow } from '@/app/_components/tierlist/tier-row';
import { TierViewport } from '@/app/_components/tierlist/tier-viewport';
import { useTierItems } from '@/app/_hooks/use-tier-items';
import type { TierColor, TierRank } from '@/app/_types/tierlist.types';

const letters = ['S', 'A', 'B', 'C', 'D', 'F'] as const;

type Modifier = '+' | '−';

export const tierRanks: TierRank[] = [
  ...letters.flatMap<TierRank>((letter) => [
    `${letter}+`,
    letter,
    `${letter}−`,
  ]),
  'Dropped',
  'Watching',
];
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

const defaultRanks = tierRanks.filter(
  (rank) => !rank.endsWith('−') && !['C+', 'D+', 'F+'].includes(rank),
);

type TierBoardProps = {
  ranks?: TierRank[];
  initialItemCount?: number;
  layout?: 'single-line' | 'two-line';
  onRanksChange?: (ranks: TierRank[]) => void;
};

export const TierBoard = ({
  ranks: controlledRanks,
  onRanksChange,
  initialItemCount = 2,
  layout = 'single-line',
}: TierBoardProps = {}) => {
  const optionsId = useId();
  const [localRanks, setLocalRanks] = useState(defaultRanks);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [keyboardMode, setKeyboardMode] = useState(false);

  const enabledRanks = controlledRanks ?? localRanks;
  const ranks = tierRanks.filter((rank) => enabledRanks.includes(rank));

  const interaction = useTierItems(
    ranks,
    initialItemCount,
    layout === 'two-line',
  );

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
      <div className="mb-1 flex items-center justify-between gap-4 text-xs">
        <div className="text-muted-foreground">
          <p>
            {ranks.length} tiers · {interaction.items.length} placeholders
          </p>
          <p role="status" className="mt-1 text-xs">
            {keyboardMode
              ? 'Keyboard mode · ↑↓ / W S tier · ←→ / A D order · Esc exit'
              : 'Drag to rank · Tab to select · Enter after click'}
          </p>
        </div>
        <button
          type="button"
          className="min-h-11 underline underline-offset-4"
          aria-expanded={settingsOpen}
          aria-controls={optionsId}
          onClick={() => setSettingsOpen((open) => !open)}
        >
          {settingsOpen ? 'close options' : 'tier options'}
        </button>
      </div>
      <div
        id={optionsId}
        hidden={!settingsOpen}
        className="mb-5 border-y border-divider py-4"
      >
        <p className="mb-3 text-xs text-muted-foreground">
          Add or remove letter variants
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-4">
          {letters.map((letter) => (
            <fieldset key={letter} className="flex gap-3">
              <legend className="mb-2 text-xs">{letter}</legend>
              {(['+', '−'] as const).map((modifier: Modifier) => (
                <label
                  key={modifier}
                  className="flex min-h-8 cursor-pointer items-center gap-2 text-xs"
                >
                  <input
                    type="checkbox"
                    checked={enabledRanks.includes(`${letter}${modifier}`)}
                    onChange={() => toggleVariant(`${letter}${modifier}`)}
                  />
                  {letter}
                  {modifier}
                </label>
              ))}
            </fieldset>
          ))}
        </div>
      </div>
      <p role="status" className="sr-only">
        {interaction.announcement}
      </p>
      <TierViewport
        viewportRef={interaction.viewportRef}
        twoLine={layout === 'two-line'}
      >
        <div
          ref={interaction.boardRef}
          className={cn(
            'relative',
            layout === 'two-line' && 'w-max min-w-full',
          )}
        >
          <ViewTransition
            default="none"
            enter="preview-change"
            exit="preview-change"
          >
            <ol
              className={cn(
                'grid min-h-[calc(100svh-12rem)] overflow-hidden border border-ink bg-charcoal text-cloud',
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
                  columns={
                    layout === 'two-line' ? interaction.columns : undefined
                  }
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
          <div className="pointer-events-none absolute inset-0">
            {interaction.dropPosition && (
              <motion.div
                aria-hidden="true"
                data-drop-slot=""
                initial={false}
                animate={interaction.dropPosition}
                transition={{ duration: 0.12 }}
                className="absolute left-0 top-0 z-0 border border-dashed border-white/80 bg-white/15"
              />
            )}
            {interaction.items.map((item) => {
              const position = interaction.position(item);
              const rank = interaction.visibleRank(item);

              return position && rank ? (
                <TierItem
                  key={item.id}
                  label={item.label}
                  rank={rank}
                  position={position}
                  boardRef={interaction.boardRef}
                  onStart={(clientX, clientY) =>
                    interaction.start(item.id, clientX, clientY)
                  }
                  onMove={(clientX, clientY) =>
                    interaction.move(item.id, clientX, clientY)
                  }
                  onDrop={(clientX, clientY) =>
                    interaction.drop(item.id, clientX, clientY)
                  }
                  onCancel={interaction.cancel}
                  onKeyboardModeChange={setKeyboardMode}
                  onKeyboardMove={(move) =>
                    interaction.keyboardMove(item.id, move)
                  }
                />
              ) : null;
            })}
          </div>
        </div>
      </TierViewport>
    </section>
  );
};
