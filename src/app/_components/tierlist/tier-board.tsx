'use client';

import { motion } from 'motion/react';
import { startTransition, useId, useState, ViewTransition } from 'react';
import { TierItem } from '@/app/_components/tierlist/tier-item';
import { type TierColor, TierRow } from '@/app/_components/tierlist/tier-row';
import { useTierItems } from '@/app/_hooks/use-tier-items';

const letters = ['S', 'A', 'B', 'C', 'D', 'F'] as const;
type Modifier = '+' | '−';
export const tierRanks: TierColor[] = [
  ...letters.flatMap<TierColor>((letter) => [
    `${letter}+`,
    letter,
    `${letter}−`,
  ]),
  'Dropped',
  'Watching',
];
const defaultRanks = tierRanks.filter(
  (rank) => !rank.endsWith('−') && !['C+', 'D+', 'F+'].includes(rank),
);
type TierBoardProps = {
  ranks?: TierColor[];
  onRanksChange?: (ranks: TierColor[]) => void;
};

export const TierBoard = ({
  ranks: controlledRanks,
  onRanksChange,
}: TierBoardProps = {}) => {
  const optionsId = useId();
  const [localRanks, setLocalRanks] = useState(defaultRanks);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const enabledRanks = controlledRanks ?? localRanks;
  const ranks = tierRanks.filter((rank) => enabledRanks.includes(rank));
  const interaction = useTierItems(ranks);
  const toggleVariant = (rank: TierColor) => {
    const nextRanks = enabledRanks.includes(rank)
      ? enabledRanks.filter((value) => value !== rank)
      : [...enabledRanks, rank];
    startTransition(() => {
      if (controlledRanks === undefined) setLocalRanks(nextRanks);
      onRanksChange?.(nextRanks);
    });
  };
  return (
    <section aria-label="Anime tierlist" className="mt-1">
      <div className="mb-1 flex items-center justify-between gap-4 text-xs">
        <span className="text-muted-foreground">
          {ranks.length} tiers · 2 placeholders
        </span>
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
        className="mb-5 border-y border-[color-mix(in_srgb,var(--foreground)_18%,var(--background))] py-4"
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
      <div ref={interaction.boardRef} className="relative">
        <ViewTransition
          default="none"
          enter="preview-change"
          exit="preview-change"
        >
          <ol
            className="grid min-h-[calc(100svh-12rem)] auto-rows-fr overflow-hidden border border-[#111] bg-[#1c1c1c] text-[#ededeb]"
            aria-label="Ranked tiers"
          >
            {ranks.map((rank) => (
              <TierRow
                key={rank}
                rank={rank}
                color={rank}
                active={interaction.targetRank === rank}
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
                onKeyboardMove={(direction) =>
                  interaction.keyboardMove(item.id, direction)
                }
              />
            ) : null;
          })}
        </div>
      </div>
    </section>
  );
};
