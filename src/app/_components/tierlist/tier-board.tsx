'use client';

import { startTransition, useId, useState, ViewTransition } from 'react';
import { type TierColor, TierRow } from '@/app/_components/tierlist/tier-row';

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
    <section aria-label="Anime tierlist" className="mt-5">
      <div className="mb-4 flex items-center justify-between gap-4 text-xs">
        <span className="text-muted-foreground">
          {ranks.length} tiers · 0 anime
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
      <ViewTransition
        default="none"
        enter="preview-change"
        exit="preview-change"
      >
        <ol
          className="overflow-hidden border border-[#111] bg-[#1c1c1c] text-[#ededeb]"
          aria-label="Ranked tiers"
        >
          {ranks.map((rank) => (
            <TierRow key={rank} rank={rank} color={rank} />
          ))}
        </ol>
      </ViewTransition>
    </section>
  );
};
