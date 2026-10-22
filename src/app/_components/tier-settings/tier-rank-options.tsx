'use client';

import { tierLetters } from '@/app/_lib/tier-ranks';
import type { TierRank } from '@/app/_types/tierlist.types';

type TierRankOptionsProps = {
  id: string;
  open: boolean;
  enabledRanks: TierRank[];
  onToggle: (rank: TierRank) => void;
};

export const TierRankOptions = ({
  id,
  open,
  enabledRanks,
  onToggle,
}: TierRankOptionsProps) => (
  <div id={id} hidden={!open} className="mb-5 border-y border-divider py-4">
    <p className="mb-3 text-xs text-muted-foreground">
      Add or remove letter variants
    </p>

    <div className="flex flex-wrap gap-x-6 gap-y-4">
      {tierLetters.map((letter) => (
        <fieldset key={letter} className="flex gap-3">
          <legend className="mb-2 text-xs">{letter}</legend>

          {(['+', '−'] as const).map((modifier) => (
            <label
              key={modifier}
              className="flex min-h-8 cursor-pointer items-center gap-2 text-xs"
            >
              <input
                type="checkbox"
                checked={enabledRanks.includes(`${letter}${modifier}`)}
                onChange={() => onToggle(`${letter}${modifier}`)}
              />

              {letter}

              {modifier}
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  </div>
);
